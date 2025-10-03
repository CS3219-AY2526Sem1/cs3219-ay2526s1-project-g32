import express from 'express';
import cors from 'cors';
import { config } from './config';
import { redisService } from './services/redisService';
import { joinQueue, findMatch, leaveQueue, getQueueStatus, getUserStatus } from './controllers/matchController';

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint (with Redis status)
app.get('/health', async (req, res) => {
  try {
    const redisConnected = await redisService.ping();
    
    res.json({ 
      status: redisConnected ? 'ok' : 'degraded',
      service: 'matching-service',
      redis: redisConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'error',
      service: 'matching-service',
      redis: 'error',
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
    
    // Start Express server
    const server = app.listen(config.port, () => {
      console.log(`Matching Service running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Redis URL: ${config.redis.url}`);
      console.log('');
      console.log('Available endpoints:');
      console.log(`GET http://localhost:${config.port}/health`);
      console.log(`POST http://localhost:${config.port}/api/match/join`);
      console.log(`POST http://localhost:${config.port}/api/match/find`);
      console.log(`POST http://localhost:${config.port}/api/match/leave`);
    });

    // Shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
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