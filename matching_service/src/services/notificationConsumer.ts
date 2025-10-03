import { Channel } from 'amqplib';
import { getWebSocketService } from './websocketService';
import { Topic } from '../types';

export interface MatchResult {
  user1Id: string;
  user2Id: string;
  matchId: string;
  topic: Topic;
  matchedAt: string;
}

export interface TimeoutResult {
  userId: string;
  topic: Topic;
  timeoutAt: string;
  reason: 'timeout' | 'no_match_found';
}

export class NotificationConsumer {
  private channel: Channel;
  private isConsuming: boolean = false;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  /**
   * Start consuming match result and timeout notifications
   */
  public async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      console.log('📡 Notification consumer already running');
      return;
    }

    try {
      // Ensure queues exist
      await this.setupQueues();
      
      // Start consuming match results
      await this.consumeMatchResults();
      
      // Start consuming timeout notifications
      await this.consumeTimeoutNotifications();
      
      this.isConsuming = true;
      console.log('🎧 Notification consumer started successfully');
      
    } catch (error) {
      console.error('💥 Failed to start notification consumer:', error);
      throw error;
    }
  }

  /**
   * Stop consuming notifications
   */
  public async stopConsuming(): Promise<void> {
    if (!this.isConsuming) {
      return;
    }

    try {
      await this.channel.cancel('match-results-consumer');
      await this.channel.cancel('timeout-notifications-consumer');
      
      this.isConsuming = false;
      console.log('🛑 Notification consumer stopped');
      
    } catch (error) {
      console.error('💥 Error stopping notification consumer:', error);
      throw error;
    }
  }

  /**
   * Setup required queues for notifications
   */
  private async setupQueues(): Promise<void> {
    // Queue for match results
    await this.channel.assertQueue('match-results', {
      durable: true,
      exclusive: false,
      autoDelete: false
    });

    // Queue for timeout notifications
    await this.channel.assertQueue('timeout-notifications', {
      durable: true,
      exclusive: false,
      autoDelete: false
    });

    console.log('✅ Notification queues setup complete');
  }

  /**
   * Consume match result notifications
   */
  private async consumeMatchResults(): Promise<void> {
    await this.channel.consume(
      'match-results',
      async (msg) => {
        if (!msg) return;

        try {
          const matchResult: MatchResult = JSON.parse(msg.content.toString());
          console.log(`🎯 Received match result:`, matchResult);

          // Get WebSocket service
          const wsService = getWebSocketService();

          // Notify both users about the match
          const matchData = {
            matchId: matchResult.matchId,
            matchedWith: '', // Will be set per user
            topic: matchResult.topic,
            matchedAt: matchResult.matchedAt,
            message: `Match found! You've been paired with another user for ${matchResult.topic}.`
          };

          // Notify user 1
          wsService.notifyMatchFound(matchResult.user1Id, {
            ...matchData,
            matchedWith: matchResult.user2Id
          });

          // Notify user 2
          wsService.notifyMatchFound(matchResult.user2Id, {
            ...matchData,
            matchedWith: matchResult.user1Id
          });

          // Acknowledge message
          this.channel.ack(msg);
          console.log(`✅ Match result notification processed for match ${matchResult.matchId}`);

        } catch (error) {
          console.error('💥 Error processing match result:', error);
          
          // Reject message and requeue for retry
          this.channel.nack(msg, false, true);
        }
      },
      {
        consumerTag: 'match-results-consumer',
        noAck: false // Manual acknowledgment
      }
    );

    console.log('🎧 Started consuming match results');
  }

  /**
   * Consume timeout notifications
   */
  private async consumeTimeoutNotifications(): Promise<void> {
    await this.channel.consume(
      'timeout-notifications',
      async (msg) => {
        if (!msg) return;

        try {
          const timeoutResult: TimeoutResult = JSON.parse(msg.content.toString());
          console.log(`⏰ Received timeout notification:`, timeoutResult);

          // Get WebSocket service
          const wsService = getWebSocketService();

          // Prepare timeout data
          const timeoutData = {
            userId: timeoutResult.userId,
            topic: timeoutResult.topic,
            timeoutAt: timeoutResult.timeoutAt,
            message: timeoutResult.reason === 'timeout' 
              ? `Match timeout: No suitable match found within 5 minutes for ${timeoutResult.topic}. You've been removed from the queue.`
              : `No match found for ${timeoutResult.topic}. You've been removed from the queue.`
          };

          // Notify user about timeout
          wsService.notifyMatchTimeout(timeoutResult.userId, timeoutData);

          // Acknowledge message
          this.channel.ack(msg);
          console.log(`✅ Timeout notification processed for user ${timeoutResult.userId}`);

        } catch (error) {
          console.error('💥 Error processing timeout notification:', error);
          
          // Reject message and requeue for retry
          this.channel.nack(msg, false, true);
        }
      },
      {
        consumerTag: 'timeout-notifications-consumer',
        noAck: false // Manual acknowledgment
      }
    );

    console.log('🎧 Started consuming timeout notifications');
  }

  /**
   * Get consumer status
   */
  public getStatus(): { isConsuming: boolean; channelConnected: boolean } {
    return {
      isConsuming: this.isConsuming,
      channelConnected: this.channel.connection !== null
    };
  }
}

// Global consumer instance
let notificationConsumer: NotificationConsumer | null = null;

export const createNotificationConsumer = (channel: Channel): NotificationConsumer => {
  if (notificationConsumer) {
    return notificationConsumer;
  }

  notificationConsumer = new NotificationConsumer(channel);
  return notificationConsumer;
};

export const getNotificationConsumer = (): NotificationConsumer => {
  if (!notificationConsumer) {
    throw new Error('Notification consumer not initialized. Call createNotificationConsumer first.');
  }

  return notificationConsumer;
};