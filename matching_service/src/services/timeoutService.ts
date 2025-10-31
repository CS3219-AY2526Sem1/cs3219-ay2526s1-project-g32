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
    channel = await connection.createChannel();

    // Create a temporary queue with TTL that forwards to the timeout queue
    const TEMP_QUEUE_NAME = 'match_timeouts_temp_queue';

    // Assert the main timeout queue that will receive expired messages
    await channel.assertQueue(TIMEOUT_QUEUE_NAME, { durable: true });

    // Assert a temporary queue with TTL and dead letter exchange
    await channel.assertQueue(TEMP_QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-message-ttl': MATCH_TIMEOUT_MS, // Messages expire after timeout
        'x-dead-letter-exchange': '', // Use default exchange
        'x-dead-letter-routing-key': TIMEOUT_QUEUE_NAME, // Route to timeout queue
      },
    });

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
  public scheduleTimeoutCheck(entry: QueueEntry): void {
    if (!channel) {
      console.error('[TimeoutService] RabbitMQ channel is not available. Cannot schedule timeout.');
      return;
    }

    const message = JSON.stringify({ userId: entry.userId, entryString: JSON.stringify(entry) });
    const TEMP_QUEUE_NAME = 'match_timeouts_temp_queue';

    // Send message to temporary queue. It will expire after TTL and be routed to timeout queue
    channel.sendToQueue(TEMP_QUEUE_NAME, Buffer.from(message));

    console.log(`[TimeoutService] Scheduled timeout check for user ${entry.userId} in ${MATCH_TIMEOUT_MS}ms.`);
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
          const { userId, entryString } = JSON.parse(msg.content.toString());
          console.log(`[TimeoutService] Received expired message for user ${userId}.`);

          // When the message arrives, the user's request has officially timed out.
          // We need to verify they are still in a queue before removing them.
          const status = await redisClient.get(`match_status:${userId}`);

          if (status === 'pending') {
            console.log(`[TimeoutService] User ${userId} is still pending. Removing from all queues using SCAN.`);
            
            // Use SCAN instead of KEYS to avoid blocking Redis
            // Note: This is still inefficient as we have to check all queues.
            // A better approach would be to include the topic in the timeout message.
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
                  const removeCount = await redisClient.lRem(key, 0, entryString);
                  if (removeCount > 0) {
                    removedCount += removeCount;
                    console.log(`[TimeoutService] Removed ${removeCount} entries for user ${userId} from queue "${key}".`);
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
            console.log(`[TimeoutService] Cleaned up expired user ${userId}. Total entries removed: ${removedCount}.`);
          } else {
            console.log(`[TimeoutService] User ${userId} is no longer pending. No action taken.`);
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