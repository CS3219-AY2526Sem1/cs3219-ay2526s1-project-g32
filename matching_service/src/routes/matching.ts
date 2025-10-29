import { Router } from 'express';
import { 
    createMatchRequest, 
    deleteMatchRequest,
    getMatchStatus,
    handleRequeue
} from '../controllers/matchingControllers';
import { cleanupRedis } from '../controllers/cleanupController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import {
    createMatchRequestSchema,
    deleteMatchRequestSchema,
    getMatchStatusSchema,
    handleRequeueSchema
} from '../validation/matchingSchemas';

const router = Router();

/**
 * @route   POST /api/v1/matching/requests
 * @desc    Create a new matchmaking request
 * @access  Private (Requires authentication)
 */
router.post('/requests', authenticate, validateRequest(createMatchRequestSchema), createMatchRequest);

/**
 * @route   DELETE /api/v1/matching/requests
 * @desc    Cancel a pending match request
 * @access  Private (Requires authentication)
 */
router.delete('/requests', authenticate, validateRequest(deleteMatchRequestSchema), deleteMatchRequest);

/**
 * @route   GET /api/v1/matching/requests/:userId/status
 * @desc    Get the status of a user's match request
 * @access  Private (Requires authentication)
 */
router.get('/requests/:userId/status', authenticate, validateRequest(getMatchStatusSchema), getMatchStatus);

/**
 * @route   POST /api/v1/matching/requeue
 * @desc    Re-queue a user after a partner disconnects
 * @access  Private (Requires authentication) - Internal service endpoint
 */
router.post('/requeue', authenticate, validateRequest(handleRequeueSchema), handleRequeue);

/**
 * @route   POST /api/v1/matching/cleanup
 * @desc    Clean up all matching data from Redis (Development only)
 * @access  Public (Development only)
 */
router.post('/cleanup', cleanupRedis);

export default router;
