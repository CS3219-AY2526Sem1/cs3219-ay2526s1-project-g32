import express from 'express';
import cors from 'cors';
import { config } from './config';
import { redisService } from './services/redisService';
import { rabbitmqService } from './services/rabbitmqService';
import { matchWorker } from './workers/matchWorker';
import { joinQueue, findMatch, leaveQueue, getQueueStatus, getUserStatus } from './controllers/matchController';

const app = express();

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
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'error',
      service: 'matching-service',
      redis: 'error',
      rabbitmq: 'error',
      worker: 'error',
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
    console.log('Redis connected');
    
    // Connect to RabbitMQ
    console.log('Connecting to RabbitMQ...');
    await rabbitmqService.connect();
    console.log('RabbitMQ connected');
    
    // Start background match worker
    console.log('Starting match worker...');
    await matchWorker.start();
    console.log('Match worker started');
    
    // Start Express server
    const server = app.listen(config.port, () => {
      console.log(`Matching Service running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Redis URL: ${config.redis.url}`);
      console.log(`RabbitMQ URL: ${config.rabbitmq.url}`);
      console.log('');
      console.log('Available endpoints:');
      console.log(`GET http://localhost:${config.port}/health`);
      console.log(`POST http://localhost:${config.port}/api/match/join`);
      console.log(`POST http://localhost:${config.port}/api/match/find`);
      console.log(`POST http://localhost:${config.port}/api/match/leave`);
      console.log(`GET http://localhost:${config.port}/api/match/queue/:topic`);
      console.log(`GET http://localhost:${config.port}/api/match/user/:userId`);
      console.log('');
      console.log('🚀 Background matching with 5-minute timeout is active!');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await matchWorker.stop();
      await rabbitmqService.disconnect();
      await redisService.disconnect();
      server.close(() => {
        console.log('Process terminated cleanly');
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await matchWorker.stop();
      await rabbitmqService.disconnect();
      await redisService.disconnect();
      server.close(() => {
        console.log('Process terminated cleanly');
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;