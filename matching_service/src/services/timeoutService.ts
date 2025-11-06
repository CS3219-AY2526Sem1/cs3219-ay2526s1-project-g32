/**
 * This service is responsible for handling request timeouts using an event-driven
 * approach with RabbitMQ. It schedules a delayed message for each new match
 * request and processes that message if the request is not fulfilled in time.
 */
import amqp from 'amqplib';
import redisClient from '../redisClient';
import { QueueEntry } from './queueService'; // Assuming this is now exported from queueService

// --- RabbitMQ Configuration ---
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const TIMEOUT_QUEUE_NAME = 'match_timeouts_queue';
const MATCH_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const PROMPT_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute

// A placeholder for the RabbitMQ connection and channel
let channel: amqp.Channel | null = null;

/**
 * Connects to RabbitMQ and sets up the necessary exchange and queue
 * for handling delayed messages using TTL and dead letter exchanges.
 * This should be called once on app startup.
 */
export async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error:', err);
    });

    channel = await connection.createChannel();
    channel.on('error', (err) => {
      console.error('[RabbitMQ] Channel error:', err);
    });

    // Assert the main timeout queue that will receive expired messages
    await channel.assertQueue(TIMEOUT_QUEUE_NAME, { durable: true });

    // We'll use two separate temporary queues for delayed messages:
    //  - one for prompt messages (short TTL)
    //  - one for final messages (long TTL)
    // This prevents shorter TTL messages from being blocked by longer TTL
    // messages that were enqueued earlier in the same queue.
    const TEMP_PROMPT_QUEUE = 'match_timeouts_temp_prompt_queue';
    const TEMP_FINAL_QUEUE = 'match_timeouts_temp_final_queue';

    const assertTempQueue = async (qName: string) => {
      try {
        await channel!.assertQueue(qName, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': TIMEOUT_QUEUE_NAME,
          },
        });
      } catch (err: any) {
        if (err && (err.code === 406 || err.replyCode === 406)) {
          console.warn('[RabbitMQ] Queue assert precondition failed for', qName, '- attempting to delete and recreate the queue.');
          try {
            await channel!.deleteQueue(qName);
            console.log('[RabbitMQ] Deleted existing queue', qName);
            await channel!.assertQueue(qName, {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': TIMEOUT_QUEUE_NAME,
              },
            });
            console.log('[RabbitMQ] Re-created queue', qName);
          } catch (deleteErr) {
            console.error('[RabbitMQ] Failed to delete/recreate queue', qName, deleteErr);
            throw deleteErr;
          }
        } else {
          throw err;
        }
      }
    };

    await assertTempQueue(TEMP_PROMPT_QUEUE);
    await assertTempQueue(TEMP_FINAL_QUEUE);

    console.log('[RabbitMQ] Connected and timeout queues are ready.');
  } catch (error) {
    console.error('[RabbitMQ] Failed to connect or set up:', error);
    // In a real app, you might want to implement retry logic here.
  }
}

class TimeoutService {
  /**
   * Schedules a delayed message in RabbitMQ to check for a user's timeout.
   * This should be called when a user is added to the waiting queue.
   * @param entry - The queue entry for the user.
   */
  public scheduleTimeoutCheck(entryOrUser: QueueEntry | string, options?: { withPrompt?: boolean }): void {
    if (!channel) {
      console.error('[TimeoutService] RabbitMQ channel is not available. Cannot schedule timeout.');
      return;
    }
  const TEMP_PROMPT_QUEUE = 'match_timeouts_temp_prompt_queue';
  const TEMP_FINAL_QUEUE = 'match_timeouts_temp_final_queue';
  const withPrompt = options?.withPrompt !== false; // default true

    // Normalize the entry. Callers may provide a QueueEntry or just a userId
    // (for final-only scheduling). When only a userId is provided we create a
    // minimal entry with a neutral difficulty for the message payload.
    const entry: QueueEntry = typeof entryOrUser === 'string'
      ? { userId: entryOrUser, difficulty: 'Medium', timestamp: Date.now() }
      : entryOrUser;

    // Create a unique timeout id for this scheduled lifecycle
    const timeoutId = `${entry.userId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;

    // Persist the current authoritative timeout id for this user in Redis.
    // The key will be used by the consumer to verify whether a delivered message is still valid.
    (async () => {
      try {
        await redisClient.set(`match_timeout_id:${entry.userId}`, timeoutId);
        // Set TTL slightly longer than MATCH_TIMEOUT_MS to ensure it lives long enough
        await redisClient.expire(`match_timeout_id:${entry.userId}`, Math.ceil((MATCH_TIMEOUT_MS + 60000) / 1000));
      } catch (err) {
        console.error('[TimeoutService] Failed to persist timeout id to Redis:', err);
      }
    })();

    // If withPrompt is true, schedule a prompt message at PROMPT_TIMEOUT_MS
    if (withPrompt) {
      const promptMessage = JSON.stringify({ type: 'prompt', userId: entry.userId, timeoutId });
      // Send to the prompt-specific temp queue so its short TTL isn't blocked.
      channel.sendToQueue(TEMP_PROMPT_QUEUE, Buffer.from(promptMessage), { expiration: String(PROMPT_TIMEOUT_MS) });
      console.log(`[TimeoutService] Scheduled PROMPT for user ${entry.userId} in ${PROMPT_TIMEOUT_MS}ms (timeoutId=${timeoutId}).`);
    }

    // Always schedule the final timeout message at MATCH_TIMEOUT_MS
    const finalMessage = JSON.stringify({ type: 'final', userId: entry.userId, timeoutId });
    channel.sendToQueue(TEMP_FINAL_QUEUE, Buffer.from(finalMessage), { expiration: String(MATCH_TIMEOUT_MS) });
    console.log(`[TimeoutService] Scheduled FINAL timeout for user ${entry.userId} in ${MATCH_TIMEOUT_MS}ms (timeoutId=${timeoutId}).`);
  }

  /**
   * Starts a consumer that listens for expired messages from RabbitMQ.
   * This should be called once when the application starts.
   */
  public startTimeoutConsumer(): void {
    if (!channel) {
      console.error('[TimeoutService] RabbitMQ channel is not available. Cannot start consumer.');
      return;
    }

    channel.consume(TIMEOUT_QUEUE_NAME, async (msg) => {
      if (msg) {
        try {
          const payload = JSON.parse(msg.content.toString());
          const { type, userId, timeoutId } = payload;
          console.log(`[TimeoutService] Received expired message for user ${userId} (type=${type}, timeoutId=${timeoutId}).`);

          // Only act if user is still pending
          const status = await redisClient.get(`match_status:${userId}`);
          if (status !== 'pending') {
            console.log(`[TimeoutService] User ${userId} is no longer pending. No action taken.`);
            channel?.ack(msg);
            return;
          }

          // Verify this message's timeoutId matches the authoritative one in Redis,
          // and also check whether this specific timeoutId was cancelled explicitly.
          try {
            const cancelFlag = await redisClient.get(`match_timeout_cancel:${timeoutId}`);
            if (cancelFlag === 'true') {
              console.log(`[TimeoutService] TimeoutId ${timeoutId} for user ${userId} was explicitly cancelled. Skipping.`);
              // cleanup cancel key
              await redisClient.del(`match_timeout_cancel:${timeoutId}`);
              channel?.ack(msg);
              return;
            }

            const storedTimeoutId = await redisClient.get(`match_timeout_id:${userId}`);
            if (!storedTimeoutId || storedTimeoutId !== timeoutId) {
              console.log(`[TimeoutService] TimeoutId mismatch for user ${userId}. Message timeoutId=${timeoutId} is no longer valid (stored=${storedTimeoutId}). Skipping.`);
              channel?.ack(msg);
              return;
            }
          } catch (err) {
            console.error('[TimeoutService] Error checking timeout id in Redis:', err);
          }

          if (type === 'prompt') {
            // Set a prompt flag that frontend can poll for. TTL set to MATCH_TIMEOUT_MS - PROMPT_TIMEOUT_MS (remaining time)
            const remainingSeconds = Math.ceil((MATCH_TIMEOUT_MS - PROMPT_TIMEOUT_MS) / 1000);
            await redisClient.set(`match_prompt:${userId}`, 'true');
            await redisClient.expire(`match_prompt:${userId}`, remainingSeconds);
            console.log(`[TimeoutService] Set prompt flag for user ${userId} (expires in ${remainingSeconds}s).`);
          } else if (type === 'final') {
            console.log(`[TimeoutService] Final timeout for user ${userId}. Removing from all queues by userId.`);

            // Use SCAN to iterate over queues and remove any entry matching the userId
            let cursor = 0;
            let removedCount = 0;

            do {
              const scanResult = await redisClient.scan(cursor, {
                MATCH: 'match_queue:*',
                COUNT: 100
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
                        const removeCount = await redisClient.lRem(key, 0, eStr);
                        if (removeCount > 0) {
                          removedCount += removeCount;
                          console.log(`[TimeoutService] Removed ${removeCount} entries for user ${userId} from queue "${key}".`);
                        }
                      }
                    } catch (parseErr) {
                      // skip malformed entries
                    }
                  }
                } catch (error) {
                  console.error(`[TimeoutService] Error removing from queue ${key}:`, error);
                }
              }
            } while (cursor !== 0);

            if (removedCount === 0) {
              console.log(`[TimeoutService] No entries found for user ${userId} in any queue.`);
            }

            await redisClient.del(`match_status:${userId}`);
            await redisClient.del(`match_session:${userId}`);
            await redisClient.del(`match_prompt:${userId}`);
            console.log(`[TimeoutService] Cleaned up expired user ${userId}. Total entries removed: ${removedCount}.`);
          } else {
            console.log(`[TimeoutService] Unknown timeout message type '${type}' for user ${userId}.`);
          }
          
          channel?.ack(msg);
        } catch (error) {
          console.error('[TimeoutService] Error processing expired message:', error);
          channel?.nack(msg, false, false); // Discard the message on error
        }
      }
    });

    console.log('[TimeoutService] Timeout consumer started and is waiting for expired messages.');
  }
}

export const timeoutService = new TimeoutService();