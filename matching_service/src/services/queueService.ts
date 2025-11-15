/* AI Assistance Disclosure:
Scope: Implementation of matchmaking queue service logic using Redis.
Author Review: Validated for style and accuracy.
*/

/**
 * QueueService
 * This service class encapsulates all the logic for interacting with the Redis queues.
 * It provides methods to add, find, and remove users from the matchmaking queues.
 */

import redisClient from '../redisClient';

// Define an interface for the data we'll store in the queue for each user.
export interface QueueEntry {
  userId: string;
  difficulty: string;
  timestamp: number; // Storing as a number (Unix timestamp) is efficient.
  displayName?: string;
}

// Helper function to generate the Redis key for a specific topic queue.
const getQueueKey = (topic: string): string => `match_queue:${topic}`;

class QueueService {
  /**
   * Adds a user to the end of the queue for a specific topic.
   * @param entry - The user data to add to the queue.
   * @param topic - The topic the user is queuing for.
   */
  public async addToQueue(entry: QueueEntry, topic: string): Promise<void> {
    const queueKey = getQueueKey(topic);
    // Atomically remove any existing entries for this user in the queue and
    // push the new entry. This avoids a race between separate remove + add
    // operations. We use a small Lua script executed server-side.
    const lua = `
      local q = KEYS[1]
      local userId = ARGV[1]
      local newEntry = ARGV[2]
      local pushSide = ARGV[3]
      local entries = redis.call('LRANGE', q, 0, -1)
      for i = 1, #entries do
        local v = entries[i]
        if string.find(v, '"userId":"' .. userId .. '"', 1, true) then
          redis.call('LREM', q, 0, v)
        end
      end
      if pushSide == 'r' then
        redis.call('RPUSH', q, newEntry)
      else
        redis.call('LPUSH', q, newEntry)
      end
      return 1
    `;

    try {
      await redisClient.eval(lua, { keys: [queueKey], arguments: [entry.userId, JSON.stringify(entry), 'r'] });
      console.log(`User ${entry.userId} added to queue for topic: ${topic}`);
    } catch (err) {
      // Fallback to non-atomic operations if EVAL fails for any reason.
      console.warn('[QueueService] Lua EVAL failed, falling back to remove+push:', err);
      try {
        await this.removeFromQueue(entry.userId, topic);
      } catch (remErr) {
        console.warn(`[QueueService] Failed to remove existing entry for user ${entry.userId} in topic ${topic}:`, remErr);
      }
      await redisClient.rPush(queueKey, JSON.stringify(entry));
      console.log(`User ${entry.userId} added to queue for topic: ${topic}`);
    }
  }

  /**
   * Adds a user to the end of the queue for a specific topic without
   * removing any existing entries for that user in the same topic queue.
   * This is useful when a user should appear multiple times with different
   * difficulty preferences (e.g., after accepting an "expand" action).
   */
  public async addToQueueAllowDuplicates(entry: QueueEntry, topic: string): Promise<void> {
    const queueKey = getQueueKey(topic);
    try {
      await redisClient.rPush(queueKey, JSON.stringify(entry));
      console.log(`User ${entry.userId} (allow-duplicates) added to queue for topic: ${topic}`);
    } catch (err) {
      console.error(`[QueueService] Failed to add (allow-duplicates) user ${entry.userId} to ${queueKey}:`, err);
      throw err;
    }
  }

  /**
   * Removes all occurrences of a user from all topic queues.
   * Returns the total number of list entries removed across all queues.
   * This is used after a successful match to ensure the matched user does not
   * remain in other difficulty queues.
   */
  public async removeUserFromAllQueues(userId: string): Promise<number> {
    let cursor = 0;
    let removedCount = 0;

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: 'match_queue:*',
        COUNT: 100,
      });

      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      for (const key of keys) {
        try {
          const entries = await redisClient.lRange(key, 0, -1);
          for (const eStr of entries) {
            try {
              const e = JSON.parse(eStr);
              if (e && e.userId === userId) {
                const rc = await redisClient.lRem(key, 0, eStr);
                if (rc > 0) {
                  removedCount += rc;
                  console.log(`[QueueService] Removed ${rc} entries for user ${userId} from queue "${key}".`);
                }
              }
            } catch (parseErr) {
              // ignore malformed entries
            }
          }
        } catch (err) {
          console.error(`[QueueService] Error scanning/removing entries from ${key}:`, err);
        }
      }
    } while (cursor !== 0);

    console.log(`[QueueService] Removed a total of ${removedCount} entries for user ${userId} across all queues.`);
    return removedCount;
  }

  /**
   * Searches a topic queue for a user with a matching difficulty.
   * If a match is found, it atomically removes the matched user from the queue.
   * @param difficulty - The difficulty to match.
   * @param topic - The topic queue to search in.
   * @returns The matched user's data, or null if no match is found.
   */
  public async findMatchInQueue(difficulty: string, topic: string): Promise<QueueEntry | null> {
    const queueKey = getQueueKey(topic);

    // Lua script: iterate over list entries, find the first entry that
    // contains the difficulty JSON fragment, remove that entry atomically
    // using LREM, and return the matched entry string. This avoids the
    // race between LRANGE (read) and LREM (remove) from separate calls.
    const lua = `
      local q = KEYS[1]
      local difficulty = ARGV[1]
      local entries = redis.call('LRANGE', q, 0, -1)
      for i = 1, #entries do
        local v = entries[i]
        -- Look for the difficulty field in the JSON string. This is a
        -- simple substring match and relies on stable JSON formatting.
        if string.find(v, '"difficulty":"' .. difficulty .. '"', 1, true) then
          -- Atomically remove this exact entry string and return it.
          redis.call('LREM', q, 1, v)
          return v
        end
      end
      return nil
    `;

    try {
      const matchedRaw: unknown = await redisClient.eval(lua, { keys: [queueKey], arguments: [difficulty] });
      let matched: string | null = null;
      if (matchedRaw == null) {
        matched = null;
      } else if (typeof matchedRaw === 'string') {
        matched = matchedRaw as string;
      } else {
        // Fallback: coerce other redis reply types into string
        try {
          matched = JSON.stringify(matchedRaw as any);
        } catch (_) {
          matched = String(matchedRaw as any);
        }
      }
      if (!matched) return null;
      const entry: QueueEntry = JSON.parse(matched);
      console.log(`Match found for difficulty '${difficulty}' in topic '${topic}'. Matched with user ${entry.userId}.`);
      return {
        ...entry,
        displayName: typeof entry.displayName === 'string' ? entry.displayName : undefined,
      };
    } catch (err) {
      console.error('[QueueService] Error running atomic match Lua script:', err);
      // Fallback to non-atomic approach if eval fails
      const queueEntries = await redisClient.lRange(queueKey, 0, -1);
      for (const entryString of queueEntries) {
        const entry: QueueEntry = JSON.parse(entryString);
        if (entry.difficulty === difficulty) {
          await redisClient.lRem(queueKey, 1, entryString);
          return { ...entry, displayName: typeof entry.displayName === 'string' ? entry.displayName : undefined };
        }
      }
      return null;
    }
  }

  /**
   * Searches a topic queue for a user with a matching difficulty but excludes
   * a specific userId from being matched (prevents self-matching when the same
   * user has multiple entries in the queue after expand).
   * If a match is found, it atomically removes the matched user from the queue.
   * @param difficulty - The difficulty to match.
   * @param topic - The topic queue to search in.
   * @param excludeUserId - A userId to exclude from matching (usually the requester).
   * @returns The matched user's data, or null if no match is found.
   */
  public async findMatchInQueueExcluding(difficulty: string, topic: string, excludeUserId: string): Promise<QueueEntry | null> {
    const queueKey = getQueueKey(topic);

    // Lua script: find the first entry matching difficulty and not matching
    // excludeUserId, remove it atomically and return it.
    const lua = `
      local q = KEYS[1]
      local difficulty = ARGV[1]
      local excludeUserId = ARGV[2]
      local entries = redis.call('LRANGE', q, 0, -1)
      for i = 1, #entries do
        local v = entries[i]
        if not string.find(v, '"userId":"' .. excludeUserId .. '"', 1, true) then
          if string.find(v, '"difficulty":"' .. difficulty .. '"', 1, true) then
            redis.call('LREM', q, 1, v)
            return v
          end
        end
      end
      return nil
    `;

    try {
      const matchedRaw: unknown = await redisClient.eval(lua, { keys: [queueKey], arguments: [difficulty, excludeUserId] });
      let matched: string | null = null;
      if (matchedRaw == null) {
        matched = null;
      } else if (typeof matchedRaw === 'string') {
        matched = matchedRaw as string;
      } else {
        try {
          matched = JSON.stringify(matchedRaw as any);
        } catch (_) {
          matched = String(matchedRaw as any);
        }
      }
      if (!matched) return null;
      const entry: QueueEntry = JSON.parse(matched);
      console.log(`Match found for difficulty '${difficulty}' in topic '${topic}'. Matched with user ${entry.userId}.`);
      return {
        ...entry,
        displayName: typeof entry.displayName === 'string' ? entry.displayName : undefined,
      };
    } catch (err) {
      console.error('[QueueService] Error running atomic match excluding Lua script:', err);
      // Fallback to non-atomic approach
      const queueEntries = await redisClient.lRange(queueKey, 0, -1);
      for (const entryString of queueEntries) {
        const entry: QueueEntry = JSON.parse(entryString);
        if (entry.userId === excludeUserId) continue;
        if (entry.difficulty === difficulty) {
          await redisClient.lRem(queueKey, 1, entryString);
          return { ...entry, displayName: typeof entry.displayName === 'string' ? entry.displayName : undefined };
        }
      }
      return null;
    }
  }
  
  /**
   * Adds a user to the front of the queue for a specific topic.
   * Used for the re-queue scenario.
   * @param entry - The user data to add to the queue.
   * @param topic - The topic the user is queuing for.
   */
  public async addToFrontOfQueue(entry: QueueEntry, topic: string): Promise<void> {
    const queueKey = getQueueKey(topic);
    // Atomically remove existing entries for this user and push to the front.
    const luaFront = `
      local q = KEYS[1]
      local userId = ARGV[1]
      local newEntry = ARGV[2]
      local pushSide = ARGV[3]
      local entries = redis.call('LRANGE', q, 0, -1)
      for i = 1, #entries do
        local v = entries[i]
        if string.find(v, '"userId":"' .. userId .. '"', 1, true) then
          redis.call('LREM', q, 0, v)
        end
      end
      if pushSide == 'r' then
        redis.call('RPUSH', q, newEntry)
      else
        redis.call('LPUSH', q, newEntry)
      end
      return 1
    `;

    try {
      await redisClient.eval(luaFront, { keys: [queueKey], arguments: [entry.userId, JSON.stringify(entry), 'l'] });
      console.log(`User ${entry.userId} re-queued at the front for topic: ${topic}`);
    } catch (err) {
      console.warn('[QueueService] Lua EVAL failed for lpush fallback, falling back to remove+lpush:', err);
      try {
        await this.removeFromQueue(entry.userId, topic);
      } catch (remErr) {
        console.warn(`[QueueService] Failed to remove existing entry for user ${entry.userId} in topic ${topic}:`, remErr);
      }
      await redisClient.lPush(queueKey, JSON.stringify(entry));
      console.log(`User ${entry.userId} re-queued at the front for topic: ${topic}`);
    }
  }

  /**
   * Removes a specific user from a topic queue.
   * Used when a user cancels their match request.
   * @param userId - The ID of the user to remove.
   * @param topic - The topic queue to remove from.
   */
  public async removeFromQueue(userId: string, topic: string): Promise<void> {
    const queueKey = getQueueKey(topic);
    const queueEntries = await redisClient.lRange(queueKey, 0, -1);

    for (const entryString of queueEntries) {
      const entry: QueueEntry = JSON.parse(entryString);
      if (entry.userId === userId) {
        // Found the user, now remove them.
        await redisClient.lRem(queueKey, 1, entryString);
        console.log(`User ${userId} was manually removed from queue for topic: ${topic}`);
        return;
      }
    }
  }

  /**
   * Retrieves all entries from all queues using SCAN for safe iteration.
   * WARNING: This method can be expensive and should be used sparingly in production.
   * Consider if you really need all entries or if there's a more targeted approach.
   * 
   * @param limit - Maximum number of entries to return (default: 1000)
   * @returns An array of all queue entries with their topic.
   */
   public async getAllQueueEntries(limit: number = 1000): Promise<{ entry: QueueEntry; topic: string }[]> {
    const allEntries: { entry: QueueEntry; topic: string }[] = [];
    let cursor = 0;
    let totalCollected = 0;

    // Use SCAN instead of KEYS for production safety
    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: 'match_queue:*',
        COUNT: 100 // Process in batches of 100
      });
      
      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      for (const key of keys) {
        if (totalCollected >= limit) {
          console.log(`[QueueService] Reached limit of ${limit} entries, stopping scan.`);
          return allEntries;
        }

        const topic = key.split(':')[1];
        if (!topic) continue;

        try {
          const entriesString = await redisClient.lRange(key, 0, -1);
          for (const entryString of entriesString) {
            if (totalCollected >= limit) break;
            
            allEntries.push({
              entry: JSON.parse(entryString),
              topic: topic
            });
            totalCollected++;
          }
        } catch (error) {
          console.error(`[QueueService] Error processing queue ${key}:`, error);
          // Continue with other queues even if one fails
        }
      }
    } while (cursor !== 0 && totalCollected < limit);

    console.log(`[QueueService] Retrieved ${totalCollected} queue entries across all topics.`);
    return allEntries;
  }

  /**
   * Gets the length of a specific topic queue.
   * This is much more efficient than getAllQueueEntries for monitoring.
   * @param topic - The topic to check queue length for.
   * @returns The number of users waiting in the queue for this topic.
   */
  public async getQueueLength(topic: string): Promise<number> {
    const queueKey = getQueueKey(topic);
    return await redisClient.lLen(queueKey);
  }

  /**
   * Gets entries for a specific topic queue.
   * More efficient than getAllQueueEntries when you know the topic.
   * @param topic - The topic to get entries for.
   * @param start - Start index (default: 0).
   * @param end - End index (default: -1 for all).
   * @returns Array of queue entries for the specified topic.
   */
  public async getQueueEntries(topic: string, start: number = 0, end: number = -1): Promise<QueueEntry[]> {
    const queueKey = getQueueKey(topic);
    const entriesString = await redisClient.lRange(queueKey, start, end);
    return entriesString.map(entryString => JSON.parse(entryString));
  }
}

// Export a single instance of the service to be used throughout the application.
export const queueService = new QueueService();
