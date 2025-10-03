import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { redisService } from './services/redisService';
import { rabbitmqService } from './services/rabbitmqService';
import { createWebSocketService } from './services/websocketService';
import { createNotificationConsumer } from './services/notificationConsumer';
import { matchWorker } from './workers/matchWorker';
import { joinQueue, findMatch, leaveQueue, getQueueStatus, getUserStatus } from './controllers/matchController';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint (with Redis and RabbitMQ status)
app.get('/health', async (req, res) => {
  try {
    const redisConnected = await redisService.ping();
    const rabbitmqHealthy = rabbitmqService.isHealthy();
    const workerHealthy = matchWorker.isHealthy();
    
    const overallStatus = redisConnected && rabbitmqHealthy && workerHealthy ? 'ok' : 'degraded';
    
    res.json({ 
      status: overallStatus,
      service: 'matching-service',
      redis: redisConnected ? 'connected' : 'disconnected',
      rabbitmq: rabbitmqHealthy ? 'connected' : 'disconnected',
      worker: workerHealthy ? 'running' : 'stopped',
      websocket: 'enabled',
      notifications: 'enabled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'error',
      service: 'matching-service',
      redis: 'error',
      rabbitmq: 'error',
      worker: 'error',
      websocket: 'error',
      notifications: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

// Basic route
app.get('/api/match', (req, res) => {
  res.json({ message: 'Matching Service API' });
});

// Matching API routes
app.post('/api/match/join', joinQueue);
app.post('/api/match/find', findMatch);
app.post('/api/match/leave', leaveQueue);

// Async server startup function
async function startServer() {
  try {
    // Connect to Redis first
    console.log('Connecting to Redis...');
    await redisService.connect();
    console.log('✅ Redis connected');
    
    // Connect to RabbitMQ
    console.log('Connecting to RabbitMQ...');
    await rabbitmqService.connect();
    console.log('✅ RabbitMQ connected');
    
    // Initialize WebSocket service
    console.log('Initializing WebSocket service...');
    const wsService = createWebSocketService(httpServer);
    console.log('✅ WebSocket service initialized');
    
    // Create and start notification consumer
    console.log('Starting notification consumer...');
    const notificationConsumer = createNotificationConsumer(rabbitmqService.getChannel());
    await notificationConsumer.startConsuming();
    console.log('✅ Notification consumer started');
    
    // Start background match worker
    console.log('Starting match worker...');
    await matchWorker.start();
    console.log('✅ Match worker started');
    
    // Start HTTP server with WebSocket support
    const server = httpServer.listen(config.port, () => {
      console.log('');
      console.log('🚀 Matching Service with WebSocket notifications started!');
      console.log(`   Port: ${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Redis URL: ${config.redis.url}`);
      console.log(`   RabbitMQ URL: ${config.rabbitmq.url}`);
      console.log('');
      console.log('📋 HTTP Endpoints:');
      console.log(`   GET  http://localhost:${config.port}/health`);
      console.log(`   POST http://localhost:${config.port}/api/match/join`);
      console.log(`   POST http://localhost:${config.port}/api/match/find`);
      console.log(`   POST http://localhost:${config.port}/api/match/leave`);
      console.log('');
      console.log('🔌 WebSocket Events:');
      console.log('   Client -> Server:');
      console.log('     - authenticate: { userId: string }');
      console.log('     - join_topic: { topic: string }');
      console.log('     - leave_topic: { topic: string }');
      console.log('   Server -> Client:');
      console.log('     - match_found: { type: "MATCH_FOUND", data: {...} }');
      console.log('     - match_timeout: { type: "MATCH_TIMEOUT", data: {...} }');
      console.log('');
      console.log('� Background Services Active:');
      console.log('   - Immediate matching (<1 second)');
      console.log('   - 5-minute timeout handling');
      console.log('   - Real-time WebSocket notifications');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully...`);
      
      // Stop notification consumer
      await notificationConsumer.stopConsuming();
      console.log('✅ Notification consumer stopped');
      
      // Stop match worker
      await matchWorker.stop();
      console.log('✅ Match worker stopped');
      
      // Disconnect services
      await rabbitmqService.disconnect();
      console.log('✅ RabbitMQ disconnected');
      
      await redisService.disconnect();
      console.log('✅ Redis disconnected');
      
      // Close server
      server.close(() => {
        console.log('✅ HTTP server closed');
        console.log('🔚 Process terminated cleanly');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;