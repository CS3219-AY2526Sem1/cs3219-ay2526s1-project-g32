import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Topic } from '../types';

// WebSocket event types
export interface MatchFoundEvent {
  type: 'MATCH_FOUND';
  data: {
    matchId: string;
    matchedWith: string;
    topic: Topic;
    matchedAt: string;
    message: string;
  };
}

export interface MatchTimeoutEvent {
  type: 'MATCH_TIMEOUT';
  data: {
    userId: string;
    topic: Topic;
    timeoutAt: string;
    message: string;
  };
}

export interface QueueStatusEvent {
  type: 'QUEUE_UPDATE';
  data: {
    position: number;
    queueSize: number;
    topic: Topic;
    estimatedWaitTime: string;
  };
}

export type WebSocketEvent = MatchFoundEvent | MatchTimeoutEvent | QueueStatusEvent;

export class WebSocketService {
  private io: SocketIOServer;
  private userConnections: Map<string, string> = new Map(); // userId -> socketId
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"], // Add your frontend URLs
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
    console.log('🔌 WebSocket service initialized');
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle user authentication/identification
      socket.on('authenticate', (data: { userId: string; token?: string }) => {
        const { userId } = data;
        
        if (!userId) {
          socket.emit('error', { message: 'User ID required for authentication' });
          return;
        }

        // Store user-socket mapping
        this.userConnections.set(userId, socket.id);
        this.socketUsers.set(socket.id, userId);
        
        // Join user to their personal room
        socket.join(`user:${userId}`);
        
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
        socket.emit('authenticated', { userId, socketId: socket.id });
      });

      // Handle joining topic-specific rooms for queue updates
      socket.on('join_topic', (data: { topic: Topic }) => {
        const { topic } = data;
        const userId = this.socketUsers.get(socket.id);
        
        if (!userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        socket.join(`topic:${topic}`);
        console.log(`User ${userId} joined topic room: ${topic}`);
        socket.emit('topic_joined', { topic });
      });

      // Handle leaving topic rooms
      socket.on('leave_topic', (data: { topic: Topic }) => {
        const { topic } = data;
        const userId = this.socketUsers.get(socket.id);
        
        if (!userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        socket.leave(`topic:${topic}`);
        console.log(`User ${userId} left topic room: ${topic}`);
        socket.emit('topic_left', { topic });
      });

      // Handle heartbeat/ping for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        const userId = this.socketUsers.get(socket.id);
        
        if (userId) {
          this.userConnections.delete(userId);
          this.socketUsers.delete(socket.id);
          console.log(`User ${userId} disconnected: ${reason}`);
        } else {
          console.log(`Anonymous client disconnected: ${socket.id}, reason: ${reason}`);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Notify specific user about match found
  public notifyMatchFound(userId: string, matchData: MatchFoundEvent['data']): void {
    const socketId = this.userConnections.get(userId);
    
    if (socketId) {
      this.io.to(`user:${userId}`).emit('match_found', {
        type: 'MATCH_FOUND',
        data: matchData
      });
      
      console.log(`Match notification sent to user ${userId}: matched with ${matchData.matchedWith}`);
    } else {
      console.log(`User ${userId} not connected - match notification not sent`);
    }
  }

  // Notify specific user about match timeout
  public notifyMatchTimeout(userId: string, timeoutData: MatchTimeoutEvent['data']): void {
    const socketId = this.userConnections.get(userId);
    
    if (socketId) {
      this.io.to(`user:${userId}`).emit('match_timeout', {
        type: 'MATCH_TIMEOUT',
        data: timeoutData
      });
      
      console.log(`Timeout notification sent to user ${userId} for topic ${timeoutData.topic}`);
    } else {
      console.log(`User ${userId} not connected - timeout notification not sent`);
    }
  }

  // Get connection statistics
  public getConnectionStats(): { totalConnections: number; authenticatedUsers: number; connectedUsers: string[] } {
    return {
      totalConnections: this.io.sockets.sockets.size,
      authenticatedUsers: this.userConnections.size,
      connectedUsers: Array.from(this.userConnections.keys())
    };
  }

  // Check if user is connected
  public isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  // Send custom event to user
  public sendToUser(userId: string, eventName: string, data: any): void {
    const socketId = this.userConnections.get(userId);
    
    if (socketId) {
      this.io.to(`user:${userId}`).emit(eventName, data);
      console.log(`Custom event '${eventName}' sent to user ${userId}`);
    } else {
      console.log(`User ${userId} not connected - custom event '${eventName}' not sent`);
    }
  }

  // Get the Socket.IO server instance
  public getIOServer(): SocketIOServer {
    return this.io;
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const createWebSocketService = (httpServer: HttpServer): WebSocketService => {
  if (webSocketService) {
    return webSocketService;
  }
  
  webSocketService = new WebSocketService(httpServer);
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized. Call createWebSocketService first.');
  }
  
  return webSocketService;
};