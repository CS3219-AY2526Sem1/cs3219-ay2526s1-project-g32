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
async function createCollaborationSession(
  user1Id: string,
  user1DisplayName: string,
  user2Id: string,
  user2DisplayName: string | undefined,
  difficulty: string,
  topic: string,
) {
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
        { userId: user1Id, displayName: user1DisplayName },
        { userId: user2Id, displayName: user2DisplayName },
      ],
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
    const { difficulty, topic, displayName }: Omit<CreateMatchRequest, 'userId'> = req.body;
    const userId = req.user!.id; // User ID comes from authentication middleware
    const resolvedDisplayName =
      (typeof displayName === 'string' && displayName.trim().length > 0
        ? displayName
        : req.user?.displayName?.trim()) || userId;

    console.log(`[Controller] Received match request from ${userId} for topic "${topic}" with difficulty "${difficulty}".`);
    await redisClient.set(`match_status:${userId}`, 'pending');
    await redisClient.del(`match_session:${userId}`);
    const matchedUser = await queueService.findMatchInQueue(difficulty, topic);

    if (matchedUser) {
      console.log(`[Controller] Match found for ${userId}! Matched with ${matchedUser.userId}.`);
      
      // Create collaboration session
      const session = await createCollaborationSession(
        userId,
        resolvedDisplayName,
        matchedUser.userId,
        matchedUser.displayName,
        difficulty,
        topic,
      );

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

      // Remove any lingering entries for both users across all queues so they cannot be matched again.
      try {
        await queueService.removeUserFromAllQueues(userId);
      } catch (err) {
        console.warn('[Controller] Failed to remove leftover queue entries for user', userId, err);
      }
      try {
        await queueService.removeUserFromAllQueues(matchedUser.userId);
      } catch (err) {
        console.warn('[Controller] Failed to remove leftover queue entries for matched user', matchedUser.userId, err);
      }

      // Cancel any pending timeouts and clear prompts for both users to avoid stray timeout actions.
      const cancelCleanupFor = async (uid: string) => {
        try {
          const prevTimeoutId = await redisClient.get(`match_timeout_id:${uid}`);
          if (prevTimeoutId) {
            await redisClient.set(`match_timeout_cancel:${prevTimeoutId}`, 'true');
            await redisClient.expire(`match_timeout_cancel:${prevTimeoutId}`, 120);
          }
          await redisClient.del(`match_prompt:${uid}`);
          await redisClient.del(`match_timeout_id:${uid}`);
        } catch (err) {
          console.warn('[Controller] Could not cancel timeout/clear prompt for', uid, err);
        }
      };

      await cancelCleanupFor(userId);
      await cancelCleanupFor(matchedUser.userId);
      return res.status(200).json({ status: 'success', message: 'Match found!', sessionId: session.sessionId, matchedWith: matchedUser.userId });
    } else {
      console.log(`[Controller] No match found for ${userId}. Adding to queue.`);
      const newEntry: QueueEntry = {
        userId,
        difficulty,
        timestamp: Date.now(),
        displayName: resolvedDisplayName,
      };
      await queueService.addToQueue(newEntry, topic);
      timeoutService.scheduleTimeoutCheck(newEntry);
      return res.status(202).json({
        status: 'pending',
        message: 'No match found at this time. You have been added to the queue.',
        requestId: `${userId}:${topic}:${difficulty}`,
      });
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

        // Remove the user from all queues to ensure there are no lingering
        // entries in any difficulty/topic. If removeUserFromAllQueues fails
        // for any reason, fall back to removing from the specific topic.
        try {
          await queueService.removeUserFromAllQueues(userId);
          console.log(`[Controller] Removed user ${userId} from all queues.`);
        } catch (err) {
          console.warn('[Controller] removeUserFromAllQueues failed, falling back to removeFromQueue for topic', topic, err);
          try {
            await queueService.removeFromQueue(userId, topic);
          } catch (innerErr) {
            console.warn('[Controller] removeFromQueue fallback also failed for', userId, innerErr);
          }
        }

        // Cancel any pending timeouts for this user and clear prompt/status/session keys.
        try {
          const prevTimeoutId = await redisClient.get(`match_timeout_id:${userId}`);
          if (prevTimeoutId) {
            await redisClient.set(`match_timeout_cancel:${prevTimeoutId}`, 'true');
            await redisClient.expire(`match_timeout_cancel:${prevTimeoutId}`, 120);
          }
        } catch (err) {
          console.warn('[Controller] Could not cancel timeout id for', userId, err);
        }

        // Clean up Redis keys related to the user's pending request.
        try {
          await redisClient.del(`match_status:${userId}`);
          await redisClient.del(`match_session:${userId}`);
          await redisClient.del(`match_prompt:${userId}`);
          await redisClient.del(`match_timeout_id:${userId}`);
        } catch (err) {
          console.warn('[Controller] Could not clean up Redis keys for', userId, err);
        }

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
  let sessionId: string | null = null;

  if (status === 'success') {
    sessionId = await redisClient.get(`match_session:${userId}`);
  }

  const payload: Record<string, unknown> = { status: status || 'not_found' };
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  // Include prompt flag so frontend can show expand popup when necessary
  const promptFlag = await redisClient.get(`match_prompt:${userId}`);
  payload.prompt = promptFlag === 'true';

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
        const { userId, difficulty, topic, displayName } = req.body;
        
        console.log(`[Controller] Re-queuing user ${userId}.`);
        const entry: QueueEntry = {
          userId,
          difficulty,
          timestamp: Date.now(),
          displayName: typeof displayName === 'string' ? displayName : undefined,
        };
        await queueService.addToFrontOfQueue(entry, topic);

        // Schedule a new timeout check for the re-queued user.
        timeoutService.scheduleTimeoutCheck(entry);
        
        // Set status back to 'pending' for the re-queued user and clear any stale session mapping.
        await redisClient.set(`match_status:${userId}`, 'pending');
        await redisClient.del(`match_session:${userId}`);

        return res.status(200).json({ message: 'User has been re-queued successfully.' });

    } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error occurred';
        console.error('[Controller] Error processing re-queue request:', errorMessage, error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

/**
 * Handles user's acceptance to expand search to all difficulties after prompt.
 * Adds the user to all difficulty queues for the given topic and restarts the final timeout.
 */
export const acceptExpand = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic } = req.body as { topic: string };
    const userId = req.user!.id;

    // Only allow expansion if user is still pending
    const status = await redisClient.get(`match_status:${userId}`);
    if (status !== 'pending') {
      return res.status(400).json({ message: 'Cannot expand search: you are not currently pending in queue.' });
    }

    console.log(`[Controller] User ${userId} accepted expand for topic "${topic}". Adding to all difficulty queues.`);

    // Define canonical difficulties based on validation enum casing
    const difficulties = ['Easy', 'Medium', 'Hard'];

    // Add the user to all difficulty queues for this topic
    for (const difficulty of difficulties) {
      const entry: QueueEntry = { userId, difficulty, timestamp: Date.now() };
      await queueService.addToQueue(entry, topic);
    }

    // Cancel the previous final timeout by setting an explicit cancel flag for the stored timeoutId.
    try {
      const prevTimeoutId = await redisClient.get(`match_timeout_id:${userId}`);
      if (prevTimeoutId) {
        console.log(`[Controller] Cancelling previous timeoutId=${prevTimeoutId} for user ${userId}.`);
        await redisClient.set(`match_timeout_cancel:${prevTimeoutId}`, 'true');
  // keep the cancel flag short-lived (120s)
  await redisClient.expire(`match_timeout_cancel:${prevTimeoutId}`, 120);
      }
    } catch (err) {
      console.warn('[Controller] Could not cancel previous timeout id:', err);
    }

    // Restart final timeout (don't schedule another prompt). One final timeout is sufficient
    // because final handler removes by userId across all queues.
  // We only need an entry shell to schedule the final-only timeout. Use a
  // neutral difficulty (Medium) as a valid placeholder so it follows the
  // same naming convention as other queue entries.
  // Schedule a final-only timeout for this user. The API now accepts a
  // userId directly for final-only scheduling so no placeholder QueueEntry
  // is necessary.
  timeoutService.scheduleTimeoutCheck(userId, { withPrompt: false });

    // Clear any prompt flag so frontend stops showing the popup
    await redisClient.del(`match_prompt:${userId}`);

    return res.status(200).json({ message: 'Search expanded to all difficulties. Timeout restarted for 2 minutes.' });
  } catch (error: any) {
    console.error('[Controller] Error processing expand accept:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
};
