/* AI Assistance Disclosure:
Scope: Implementation of handlers.
Author Review: Validated for style and accuracy.
*/

import { Request, Response } from 'express';
import redisClient from '../redisClient';

const REDIS_SCAN_COUNT = 100;

/**
 * Development-only endpoint to clean up all matching data from Redis.
 * This should not be exposed in production.
 */
export const cleanupRedis = async (req: Request, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Cleanup endpoint not available in production' });
    }

    let deletedCount = 0;
    let cursor = 0;

    // Delete all match_queue keys
    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: 'match_queue:*',
        COUNT: REDIS_SCAN_COUNT
      });
      
      cursor = scanResult.cursor;
      const keys = scanResult.keys;
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    // Delete all match_status keys
    cursor = 0;
    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: 'match_status:*',
        COUNT: 100
      });
      
      cursor = scanResult.cursor;
      const keys = scanResult.keys;
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    console.log(`[Cleanup] Deleted ${deletedCount} Redis keys`);
    
    return res.status(200).json({ 
      message: 'Redis cleanup completed',
      deletedKeys: deletedCount
    });

  } catch (error: any) {
    console.error('[Cleanup] Error cleaning Redis:', error);
    return res.status(500).json({ message: 'Cleanup failed', error: error.message });
  }
};