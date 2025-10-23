/**
 * Main entry point for the Matching Service.
 * This file sets up the Express server, initializes a connection to RabbitMQ,
 * and starts the timeout consumer.
 */
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import matchingRoutes from './routes/matching';
import { connectRabbitMQ, timeoutService } from './services/timeoutService';

// Load environment variables from a .env file into process.env
dotenv.config();

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3002', 10);

// Enable CORS for all origins (configure as needed for production)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse incoming JSON requests.
app.use(express.json());

// Add request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - User-Agent: ${req.get('User-Agent') || 'N/A'}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Mount the matching API routes.
app.use('/api/v1/matching', matchingRoutes);

// A simple root endpoint to confirm the service is running.
app.get('/', (req: Request, res: Response) => {
  res.send('Matching Service is up and running!');
});

/**
 * Starts the Express server and initializes the RabbitMQ connection and consumer.
 */
async function startServer() {
  // Connect to RabbitMQ and start the consumer that listens for timeout events.
  await connectRabbitMQ();
  timeoutService.startTimeoutConsumer();

  // Start the Express server.
  app.listen(PORT, () => {
    console.log(`[Server] Matching Service is running at http://localhost:${PORT}`);
  });
}

// Execute the server startup function.
startServer();