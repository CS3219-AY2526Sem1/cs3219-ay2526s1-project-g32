import { Request, Response } from 'express';
import { queueService, QueueEntry } from '../services/queueService';
import { timeoutService } from '../services/timeoutService';
import redisClient from '../redisClient';
import axios from 'axios';
import { CreateMatchRequest, DeleteMatchRequest } from '../validation/matchingSchemas';
import { AuthenticatedRequest } from '../middleware/authenticate';

// --- Inter-Service Communication ---
const COLLABORATION_SERVICE_URL = process.env.COLLABORATION_SERVICE_URL || 'http://localhost:4010/api/v1/sessions';

/**
 * Creates a collaboration session by calling the collaboration service.
 * Formats the request according to the collaboration service's SessionCreateSchema.
 */
async function createCollaborationSession(user1Id: string, user2Id: string, difficulty: string, topic: string) {
  try {
    // Generate a unique match ID for this session
    const matchId = `match-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Convert difficulty to lowercase format expected by collaboration service
    const normalizedDifficulty = difficulty.toLowerCase();
    
    // Format payload according to SessionCreateSchema
    const sessionPayload = {
      matchId,
      topic,
      difficulty: normalizedDifficulty,
      participants: [
        { userId: user1Id },
        { userId: user2Id }
      ]
    };

    console.log(`[Controller] Creating collaboration session for match ${matchId} with payload:`, sessionPayload);
    
    const response = await axios.post(COLLABORATION_SERVICE_URL, sessionPayload);
    console.log('[Controller] Successfully created collaboration session:', response.data);
    return response.data;
  } catch (error: any) {
    let errorMessage = 'Unknown error';
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        errorMessage = `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        // Network error - collaboration service might be down
        errorMessage = 'Collaboration service unavailable';
      } else {
        // Other axios error
        errorMessage = error.message || 'Request setup error';
      }
    } else {
      errorMessage = error?.message || 'Unexpected error';
    }

    console.error('[Controller] Error calling Collaboration Service:', errorMessage);
    
    // CRITICAL: Re-queue both users if the collaboration service fails.
    await queueService.addToFrontOfQueue({ userId: user1Id, difficulty, timestamp: Date.now() }, topic);
    await queueService.addToFrontOfQueue({ userId: user2Id, difficulty, timestamp: Date.now() }, topic);
    console.log(`[Controller] Re-queued users ${user1Id} and ${user2Id} due to collaboration service error: ${errorMessage}`);
    throw new Error('Failed to create collaboration session.');
  }
}

// --- Controller Functions ---

export const createMatchRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Data is already validated by middleware, and user is authenticated
    const { difficulty, topic }: Omit<CreateMatchRequest, 'userId'> = req.body;
    const userId = req.user!.id; // User ID comes from authentication middleware

    console.log(`[Controller] Received match request from ${userId} for topic "${topic}" with difficulty "${difficulty}".`);
    await redisClient.set(`match_status:${userId}`, 'pending');
    const matchedUser = await queueService.findMatchInQueue(difficulty, topic);

    if (matchedUser) {
      console.log(`[Controller] Match found for ${userId}! Matched with ${matchedUser.userId}.`);
      
      // Create collaboration session
      const session = await createCollaborationSession(userId, matchedUser.userId, difficulty, topic);

  // Persist the sessionId for both users so polling clients can retrieve it.
  // Set a TTL to avoid stale keys lingering in Redis.
  const sessionKeyA = `match_session:${userId}`;
  const sessionKeyB = `match_session:${matchedUser.userId}`;
  await redisClient.set(sessionKeyA, session.sessionId);
  await redisClient.set(sessionKeyB, session.sessionId);
  // expire after 5 minutes
  await redisClient.expire(sessionKeyA, 300);
  await redisClient.expire(sessionKeyB, 300);

  // Set status to success only after the sessionId is persisted.
  await redisClient.set(`match_status:${userId}`, 'success');
  await redisClient.set(`match_status:${matchedUser.userId}`, 'success');

  return res.status(200).json({ status: 'success', message: 'Match found!', sessionId: session.sessionId, matchedWith: matchedUser.userId });
    } else {
      console.log(`[Controller] No match found for ${userId}. Adding to queue.`);
      const newEntry: QueueEntry = { userId, difficulty, timestamp: Date.now() };
      await queueService.addToQueue(newEntry, topic);
      timeoutService.scheduleTimeoutCheck(newEntry);
      return res.status(202).json({ status: 'pending', message: 'No match found at this time. You have been added to the queue.' });
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error occurred';
    console.error('[Controller] Error processing match request:', errorMessage, error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

export const deleteMatchRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Data is already validated by middleware, user ID comes from auth
        const { topic }: Omit<DeleteMatchRequest, 'userId'> = req.body;
        const userId = req.user!.id; // User ID comes from authentication middleware

        console.log(`[Controller] Received cancellation request from ${userId} for topic "${topic}".`);
        await queueService.removeFromQueue(userId, topic);
        await redisClient.del(`match_status:${userId}`);
        
        return res.status(200).json({ message: 'You have been removed from the queue.' });

    } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error occurred';
        console.error('[Controller] Error processing cancellation request:', errorMessage, error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

/**
 * Gets the status of a user's match request for polling.
 * The userId is taken from the URL parameter and validated by middleware.
 */
export const getMatchStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // userId is already validated by middleware
        const { userId } = req.params;
        
        // Check if the authenticated user is trying to access their own status
        if (req.user!.id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You can only check your own match status.' });
        }

  const status = await redisClient.get(`match_status:${userId}`);
  // If a session was created, return the sessionId to the polling client so it
  // can redirect the user into the collaboration space.
  const sessionId = await redisClient.get(`match_session:${userId}`);

  const payload: any = { status: status || 'not_found' };
  if (sessionId) payload.sessionId = sessionId;

  return res.status(200).json(payload);

    } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error occurred';
        console.error('[Controller] Error getting match status:', errorMessage, error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

/**
 * Handles re-queuing a user from the Collaboration Service.
 * This is an internal-facing endpoint.
 */
export const handleRequeue = async (req: Request, res: Response) => {
    try {
        // Get required fields from request body
        const { userId, difficulty, topic } = req.body;
        
        console.log(`[Controller] Re-queuing user ${userId}.`);
        const entry: QueueEntry = { userId, difficulty, timestamp: Date.now() };
        await queueService.addToFrontOfQueue(entry, topic);

        // Schedule a new timeout check for the re-queued user.
        timeoutService.scheduleTimeoutCheck(entry);
        
        // Set status back to 'pending' for the re-queued user.
        await redisClient.set(`match_status:${userId}`, 'pending');

        return res.status(200).json({ message: 'User has been re-queued successfully.' });

    } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error occurred';
        console.error('[Controller] Error processing re-queue request:', errorMessage, error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
};
