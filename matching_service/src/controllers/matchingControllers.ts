import { Request, Response } from 'express';
import { queueService, QueueEntry } from '../services/queueService';
import { timeoutService } from '../services/timeoutService'; // Import the timeout service
import redisClient from '../redisClient';

// This is a placeholder for where you would call the Collaboration Service.
async function createCollaborationSession(user1Id: string, user2Id: string, difficulty: string, topic: string) {
  console.log(`[Collaboration-Mock] Creating session for ${user1Id} and ${user2Id} with topic "${topic}" and difficulty "${difficulty}".`);
  return { sessionId: `session-${Date.now()}` };
}

/**
 * Handles the creation of a new match request.
 */
export const createMatchRequest = async (req: Request, res: Response) => {
  try {
    const { userId, difficulty, topic } = req.body;
    if (!userId || !difficulty || !topic) {
      return res.status(400).json({ message: 'Missing required fields: userId, difficulty, topic.' });
    }

    console.log(`[Controller] Received match request from ${userId} for topic "${topic}" with difficulty "${difficulty}".`);
    
    await redisClient.set(`match_status:${userId}`, 'pending');

    const matchedUser = await queueService.findMatchInQueue(difficulty, topic);

    if (matchedUser) {
      console.log(`[Controller] Match found for ${userId}! Matched with ${matchedUser.userId}.`);
      
      await redisClient.set(`match_status:${userId}`, 'success');
      await redisClient.set(`match_status:${matchedUser.userId}`, 'success');

      const session = await createCollaborationSession(userId, matchedUser.userId, difficulty, topic);

      return res.status(200).json({
        status: 'success',
        message: 'Match found!',
        sessionId: session.sessionId,
        matchedWith: matchedUser.userId,
      });
    } else {
      console.log(`[Controller] No match found for ${userId}. Adding to queue.`);
      const newEntry: QueueEntry = { userId, difficulty, timestamp: Date.now() };
      await queueService.addToQueue(newEntry, topic);

      // --- NEW CHANGE HERE ---
      // Schedule the timeout check for this user in RabbitMQ.
      timeoutService.scheduleTimeoutCheck(newEntry);
      
      return res.status(202).json({
        status: 'pending',
        message: 'No match found at this time. You have been added to the queue.',
      });
    }
  } catch (error) {
    console.error('[Controller] Error processing match request:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

/**
 * Handles the cancellation of a match request.
 */
export const deleteMatchRequest = async (req: Request, res: Response) => {
    try {
        const { userId, topic } = req.body;
        if (!userId || !topic) {
            return res.status(400).json({ message: 'Missing required fields: userId, topic.' });
        }

        console.log(`[Controller] Received cancellation request from ${userId} for topic "${topic}".`);
        await queueService.removeFromQueue(userId, topic);
        
        await redisClient.del(`match_status:${userId}`);
        
        return res.status(200).json({ message: 'You have been removed from the queue.' });

    } catch (error) {
        console.error('[Controller] Error processing cancellation request:', error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

/**
 * Gets the status of a user's match request for polling.
 */
export const getMatchStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required in the URL parameters.' });
        }

        const status = await redisClient.get(`match_status:${userId}`);
        
        return res.status(200).json({ status: status || 'not_found' });

    } catch (error) {
        console.error('[Controller] Error getting match status:', error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
}

/**
 * Handles re-queuing a user from the Collaboration Service.
 */
export const handleRequeue = async (req: Request, res: Response) => {
    try {
        const { userId, difficulty, topic } = req.body;
        if (!userId || !difficulty || !topic) {
            return res.status(400).json({ message: 'Missing required fields: userId, difficulty, topic.' });
        }
        
        console.log(`[Controller] Re-queuing user ${userId}.`);
        const entry: QueueEntry = { userId, difficulty, timestamp: Date.now() };
        await queueService.addToFrontOfQueue(entry, topic);

        // --- NEW CHANGE HERE ---
        // Also schedule a timeout for the re-queued user.
        timeoutService.scheduleTimeoutCheck(entry);

        await redisClient.set(`match_status:${userId}`, 'pending');

        return res.status(200).json({ message: 'User has been re-queued.' });

    } catch (error) {
        console.error('[Controller] Error processing re-queue request:', error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
};
