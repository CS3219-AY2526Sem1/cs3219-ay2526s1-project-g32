/**
 * Sets up and exports a reusable Redis client instance.
 * This ensures that we only have one connection to the Redis server
 * that can be shared across the application (Singleton pattern).
 */

import { createClient } from 'redis';

// Create a new Redis client instance.
// By default, it will try to connect to a Redis server running on localhost:6379.
// You can configure the URL if your Redis server is elsewhere:
// const client = createClient({ url: 'redis://user:password@redis-server:6379' });
const redisClient = createClient();

// Handle connection errors.
redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Asynchronously connect to the Redis server.
// The 'await' here ensures that we wait for the connection to be established
// before any other part of the app tries to use the client.
(async () => {
  await redisClient.connect();
})();

console.log('Successfully connected to Redis.');

// Export the connected client instance.
export default redisClient;