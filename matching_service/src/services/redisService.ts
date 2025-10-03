import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { Topic } from '../types';

export class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url,
      password: config.redis.password,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Disconnected from Redis');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Generate queue key for a specific topic
  private generateQueueKey(topic: Topic): string {
    return `matchmaking-queue-${topic}`;
  }

  // Enqueue user into matchmaking queue
  async enqueueUser(userId: string, topic: Topic): Promise<void> {
    const queueKey = this.generateQueueKey(topic);
    const timestamp = Date.now();
    
    // Add user to sorted set (FIFO queue) using timestamp as score
    await this.client.zAdd(queueKey, { score: timestamp, value: userId });
    
    // Set TTL of 5 minutes (300 seconds) on the queue
    await this.client.expire(queueKey, 300);
  }

  // Find and remove a match from the queue
  async findMatch(userId: string, topic: Topic): Promise<string | null> {
    const queueKey = this.generateQueueKey(topic);
    
    // Get the oldest user from the queue (excluding current user)
    const users = await this.client.zRange(queueKey, 0, 10); // Get first 10 users
    
    // Find first user that's not the current user
    const matchedUserId = users.find(user => user !== userId);
    
    if (matchedUserId) {
      // Remove matched user from queue
      await this.client.zRem(queueKey, matchedUserId);
      // Also remove current user from queue
      await this.client.zRem(queueKey, userId);
      
      return matchedUserId;
    }
    
    return null; // No match found
  }

  // Remove user from queue (for cancellation)
  async removeUserFromQueue(userId: string, topic: Topic): Promise<void> {
    const queueKey = this.generateQueueKey(topic);
    await this.client.zRem(queueKey, userId);
  }

  // Check if user is in queue
  async isUserInQueue(userId: string, topic: Topic): Promise<boolean> {
    const queueKey = this.generateQueueKey(topic);
    const score = await this.client.zScore(queueKey, userId);
    return score !== null;
  }

  // Get queue size for monitoring
  async getQueueSize(topic: Topic): Promise<number> {
    const queueKey = this.generateQueueKey(topic);
    return await this.client.zCard(queueKey);
  }

  // Get user's position in queue
  async getUserPosition(userId: string, topic: Topic): Promise<number | null> {
    const queueKey = this.generateQueueKey(topic);
    const rank = await this.client.zRank(queueKey, userId);
    return rank !== null ? rank + 1 : null; // Convert to 1-based position
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();