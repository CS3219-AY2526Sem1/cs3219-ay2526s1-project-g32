/* AI Assistance Disclosure:
Scope: Implementation of health check endpoint.
Author Review: Validated for style and accuracy.
*/

import { Router, Request, Response } from 'express';
import redisClient from '../redisClient';

const router = Router();

/**
 * @route   GET /api/v1/matching/health
 * @desc    Health check endpoint with dependency status
 * @access  Public (No authentication required)
 */
router.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    service: 'matching-service',
    status: 'ok',
    timestamp: new Date().toISOString(),
    dependencies: {
      redis: 'unknown',
      rabbitmq: 'unknown'
    },
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Check Redis connectivity
    try {
      await redisClient.ping();
      healthCheck.dependencies.redis = 'healthy';
    } catch (error) {
      healthCheck.dependencies.redis = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Check RabbitMQ connectivity (basic check)
    // Note: More comprehensive RabbitMQ health check could be added
    // by checking if the channel is available in timeoutService
    const rabbitmqStatus = process.env.RABBITMQ_URL ? 'configured' : 'not-configured';
    healthCheck.dependencies.rabbitmq = rabbitmqStatus;

    // Determine overall status
    const hasUnhealthyDeps = Object.values(healthCheck.dependencies).includes('unhealthy');
    if (hasUnhealthyDeps) {
      healthCheck.status = 'unhealthy';
      return res.status(503).json(healthCheck);
    }

    // All good
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'error';
    res.status(500).json({
      ...healthCheck,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;