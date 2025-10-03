import * as amqp from 'amqplib';
import { config } from '../config';
import { Topic } from '../types';

export interface MatchRequest {
  userId: string;
  topic: Topic;
  timestamp: number;
  timeoutAt: number; // When this request should timeout (timestamp + 5 minutes)
}

export interface MatchTimeoutMessage {
  userId: string;
  topic: Topic;
  requestTimestamp: number;
}

export class RabbitMQService {
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;

  // Queue names
  private readonly MATCH_REQUEST_QUEUE = 'match-requests';
  private readonly MATCH_TIMEOUT_QUEUE = 'match-timeouts';
  private readonly MATCH_RESULT_EXCHANGE = 'match-results';

  constructor() {}

  async connect(): Promise<void> {
    try {
      // Connect to RabbitMQ
      const connectionUrl = config.rabbitmq?.url || 'amqp://localhost';
      this.connection = await amqp.connect(connectionUrl);
      this.channel = await this.connection.createChannel();
      
      // Set up queues and exchanges
      await this.setupQueuesAndExchanges();
      
      this.isConnected = true;
      console.log('Connected to RabbitMQ');
      
      // Handle connection errors
      if (this.connection) {
        this.connection.on('error', (err: any) => {
          console.error('RabbitMQ connection error:', err);
          this.isConnected = false;
        });

        this.connection.on('close', () => {
          console.log('RabbitMQ connection closed');
          this.isConnected = false;
        });
      }

    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      console.log('Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  private async setupQueuesAndExchanges(): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    // Create durable queues
    await this.channel.assertQueue(this.MATCH_REQUEST_QUEUE, { 
      durable: true,
      arguments: {
        'x-message-ttl': 300000 // 5 minutes TTL for messages
      }
    });
    
    await this.channel.assertQueue(this.MATCH_TIMEOUT_QUEUE, { 
      durable: true 
    });

    // Create exchange for match results
    await this.channel.assertExchange(this.MATCH_RESULT_EXCHANGE, 'direct', { 
      durable: true 
    });

    console.log('RabbitMQ queues and exchanges set up successfully');
  }

  // Publish match request with 5-minute delayed timeout message
  async publishMatchRequest(matchRequest: MatchRequest): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    // Publish immediate match request
    await this.channel.sendToQueue(
      this.MATCH_REQUEST_QUEUE,
      Buffer.from(JSON.stringify(matchRequest)),
      { 
        persistent: true,
        priority: 1
      }
    );

    // Schedule timeout message (5 minutes delay)
    const timeoutMessage: MatchTimeoutMessage = {
      userId: matchRequest.userId,
      topic: matchRequest.topic,
      requestTimestamp: matchRequest.timestamp
    };

    // Use RabbitMQ delayed message plugin or TTL + dead letter for timeout
    await this.scheduleTimeoutMessage(timeoutMessage, 300000); // 5 minutes

    console.log(`Published match request for user ${matchRequest.userId} with topic ${matchRequest.topic}`);
  }

  // Schedule timeout message using TTL and dead letter queue
  private async scheduleTimeoutMessage(timeoutMessage: MatchTimeoutMessage, delayMs: number): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    // Create temporary queue with TTL that routes to timeout queue when expired
    const tempQueueName = `temp-timeout-${timeoutMessage.userId}-${Date.now()}`;
    
    await this.channel.assertQueue(tempQueueName, {
      durable: false,
      autoDelete: true,
      arguments: {
        'x-message-ttl': delayMs,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.MATCH_TIMEOUT_QUEUE
      }
    });

    // Send message to temp queue (will timeout and route to timeout queue)
    await this.channel.sendToQueue(
      tempQueueName,
      Buffer.from(JSON.stringify(timeoutMessage)),
      { persistent: true }
    );
  }

  // Consume match requests
  async consumeMatchRequests(callback: (matchRequest: MatchRequest) => Promise<void>): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    await this.channel.consume(this.MATCH_REQUEST_QUEUE, async (msg: any) => {
      if (msg) {
        try {
          const matchRequest: MatchRequest = JSON.parse(msg.content.toString());
          await callback(matchRequest);
          this.channel?.ack(msg); // Acknowledge successful processing
        } catch (error) {
          console.error('Error processing match request:', error);
          this.channel?.nack(msg, false, false); // Reject and don't requeue
        }
      }
    });

    console.log('Started consuming match requests');
  }

  // Consume timeout messages
  async consumeTimeouts(callback: (timeoutMessage: MatchTimeoutMessage) => Promise<void>): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    await this.channel.consume(this.MATCH_TIMEOUT_QUEUE, async (msg: any) => {
      if (msg) {
        try {
          const timeoutMessage: MatchTimeoutMessage = JSON.parse(msg.content.toString());
          await callback(timeoutMessage);
          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing timeout message:', error);
          this.channel?.nack(msg, false, false);
        }
      }
    });

    console.log('Started consuming timeout messages');
  }

  // Publish match result
  async publishMatchResult(userId1: string, userId2: string, topic: Topic, matchId: string): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    const matchResult = {
      matchId,
      user1Id: userId1,
      user2Id: userId2,
      topic,
      timestamp: Date.now()
    };

    // Publish to both users' specific routing keys
    await this.channel.publish(
      this.MATCH_RESULT_EXCHANGE,
      userId1,
      Buffer.from(JSON.stringify(matchResult)),
      { persistent: true }
    );

    await this.channel.publish(
      this.MATCH_RESULT_EXCHANGE,
      userId2,
      Buffer.from(JSON.stringify(matchResult)),
      { persistent: true }
    );

    console.log(`Published match result for users ${userId1} and ${userId2}`);
  }

  // Health check
  isHealthy(): boolean {
    return this.isConnected && this.channel !== null;
  }
}

// Export singleton instance
export const rabbitmqService = new RabbitMQService();