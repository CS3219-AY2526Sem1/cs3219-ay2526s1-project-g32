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
    // LPUSH adds the new entry to the end of the list (right side).
    await redisClient.rPush(queueKey, JSON.stringify(entry));
    console.log(`User ${entry.userId} added to queue for topic: ${topic}`);
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
    // Get all users currently in the queue for this topic.
    const queueEntries = await redisClient.lRange(queueKey, 0, -1);

    for (let i = 0; i < queueEntries.length; i++) {
      const entryString = queueEntries[i];
      const entry: QueueEntry = JSON.parse(entryString);

      if (entry.difficulty === difficulty) {
        // Match found! Atomically remove this specific entry from the list.
        // LREM command removes the first occurrence of a value from a list.
        await redisClient.lRem(queueKey, 1, entryString);
        console.log(`Match found for difficulty '${difficulty}' in topic '${topic}'. Matched with user ${entry.userId}.`);
        return entry;
      }
    }

    // No match was found in the queue.
    return null;
  }
  
  /**
   * Adds a user to the front of the queue for a specific topic.
   * Used for the re-queue scenario.
   * @param entry - The user data to add to the queue.
   * @param topic - The topic the user is queuing for.
   */
  public async addToFrontOfQueue(entry: QueueEntry, topic: string): Promise<void> {
    const queueKey = getQueueKey(topic);
    // LPUSH adds the new entry to the front of the list (left side).
    await redisClient.lPush(queueKey, JSON.stringify(entry));
    console.log(`User ${entry.userId} re-queued at the front for topic: ${topic}`);
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
   * Retrieves all entries from all queues. Used by the timeout service.
   * NOTE: This can be inefficient with a very large number of queues.
   * In a large-scale system, a different pattern might be used for timeouts.
   * @returns An array of all queue entries with their topic.
   */
   public async getAllQueueEntries(): Promise<{ entry: QueueEntry; topic: string }[]> {
    const allEntries: { entry: QueueEntry; topic: string }[] = [];
    const keys = await redisClient.keys('match_queue:*'); // Find all queue keys

    for (const key of keys) {
      const topic = key.split(':')[1];
      const entriesString = await redisClient.lRange(key, 0, -1);
      for (const entryString of entriesString) {
        allEntries.push({
            entry: JSON.parse(entryString),
            topic: topic
        });
      }
    }
    return allEntries;
  }
}

// Export a single instance of the service to be used throughout the application.
export const queueService = new QueueService();