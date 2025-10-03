import { rabbitmqService, MatchRequest, MatchTimeoutMessage } from '../services/rabbitmqService';
import { redisService } from '../services/redisService';
import { Topic } from '../types';

export class MatchWorker {
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Match worker is already running');
      return;
    }

    try {
      // Connect to RabbitMQ
      await rabbitmqService.connect();
      console.log('Match worker connected to RabbitMQ');

      // Start consuming match requests
      await rabbitmqService.consumeMatchRequests(this.processMatchRequest.bind(this));
      
      // Start consuming timeout messages
      await rabbitmqService.consumeTimeouts(this.processTimeout.bind(this));

      this.isRunning = true;
      console.log('Match worker started successfully');

    } catch (error) {
      console.error('Failed to start match worker:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Match worker is not running');
      return;
    }

    try {
      await rabbitmqService.disconnect();
      this.isRunning = false;
      console.log('Match worker stopped');
    } catch (error) {
      console.error('Error stopping match worker:', error);
      throw error;
    }
  }

  // Process incoming match requests
  private async processMatchRequest(matchRequest: MatchRequest): Promise<void> {
    const { userId, topic, timestamp } = matchRequest;

    console.log(`Processing match request for user ${userId} with topic ${topic}`);

    try {
      // Check if user is still in queue (they might have left)
      const isInQueue = await redisService.isUserInQueue(userId, topic);
      if (!isInQueue) {
        console.log(`User ${userId} no longer in queue for ${topic}, skipping`);
        return;
      }

      // Try to find a match
      const matchedUserId = await redisService.findMatch(userId, topic);

      if (matchedUserId) {
        // Match found! Generate match ID and notify both users
        const matchId = this.generateMatchId(userId, matchedUserId);
        
        console.log(`Match found! ${userId} <-> ${matchedUserId} for topic ${topic}`);
        
        // Publish match result to both users
        await rabbitmqService.publishMatchResult(userId, matchedUserId, topic, matchId);
        
        // Note: Both users are already removed from queue by redisService.findMatch()
        console.log(`Match notification sent for match ${matchId}`);
        
      } else {
        // No match found yet, user stays in queue
        console.log(`No match found for user ${userId} in topic ${topic}, staying in queue`);
        
        // Reschedule another match attempt in 10 seconds
        await this.scheduleRetryMatchRequest(matchRequest, 10000);
      }

    } catch (error) {
      console.error(`Error processing match request for user ${userId}:`, error);
    }
  }

  // Process timeout messages (after 5 minutes)
  private async processTimeout(timeoutMessage: MatchTimeoutMessage): Promise<void> {
    const { userId, topic, requestTimestamp } = timeoutMessage;
    
    console.log(`Processing timeout for user ${userId} with topic ${topic}`);

    try {
      // Check if user is still in queue
      const isInQueue = await redisService.isUserInQueue(userId, topic);
      
      if (isInQueue) {
        // Remove user from queue due to timeout
        await redisService.removeUserFromQueue(userId, topic);
        console.log(`User ${userId} removed from queue due to timeout`);
        
        // Publish timeout notification for WebSocket
        await rabbitmqService.publishTimeoutNotification(userId, topic, 'timeout');
        console.log(`Timeout notification published for user ${userId}`);
        
      } else {
        console.log(`User ${userId} already removed from queue (likely matched), no timeout needed`);
      }

    } catch (error) {
      console.error(`Error processing timeout for user ${userId}:`, error);
    }
  }

  // Schedule a retry match request after a delay
  private async scheduleRetryMatchRequest(matchRequest: MatchRequest, delayMs: number): Promise<void> {
    // Check if we're still within the 5-minute window
    const now = Date.now();
    const timeElapsed = now - matchRequest.timestamp;
    const fiveMinutes = 300000; // 5 minutes in milliseconds

    if (timeElapsed >= fiveMinutes) {
      console.log(`Match request for user ${matchRequest.userId} has expired, not retrying`);
      return;
    }

    // Schedule retry after delay
    setTimeout(async () => {
      try {
        // Check if user is still in queue before retrying
        const isInQueue = await redisService.isUserInQueue(matchRequest.userId, matchRequest.topic);
        if (isInQueue) {
          await rabbitmqService.publishMatchRequest(matchRequest);
        }
      } catch (error) {
        console.error(`Error scheduling retry for user ${matchRequest.userId}:`, error);
      }
    }, delayMs);
  }

  // Generate unique match ID
  private generateMatchId(userId1: string, userId2: string): string {
    const timestamp = Date.now();
    const sortedUsers = [userId1, userId2].sort(); // Ensure consistent ordering
    return `match_${sortedUsers[0]}_${sortedUsers[1]}_${timestamp}`;
  }

  // Health check
  isHealthy(): boolean {
    return this.isRunning && rabbitmqService.isHealthy();
  }
}

// Export singleton instance
export const matchWorker = new MatchWorker();