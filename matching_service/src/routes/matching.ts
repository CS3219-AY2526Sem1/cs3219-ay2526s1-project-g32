import { Router } from 'express';
import { 
    createMatchRequest, 
    deleteMatchRequest,
    getMatchStatus,
    handleRequeue
} from '../controllers/matchingControllers';
import { validateRequest } from '../middleware/validateRequest';
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
 * @access  Public (No authentication required)
 */
router.post('/requests', validateRequest(createMatchRequestSchema), createMatchRequest);

/**
 * @route   DELETE /api/v1/matching/requests
 * @desc    Cancel a pending match request
 * @access  Public (No authentication required)
 */
router.delete('/requests', validateRequest(deleteMatchRequestSchema), deleteMatchRequest);

/**
 * @route   GET /api/v1/matching/requests/:userId/status
 * @desc    Get the status of a user's match request
 * @access  Public (No authentication required)
 */
router.get('/requests/:userId/status', validateRequest(getMatchStatusSchema), getMatchStatus);

/**
 * @route   POST /api/v1/matching/requeue
 * @desc    Re-queue a user after a partner disconnects
 * @access  Public (No authentication required)
 */
router.post('/requeue', validateRequest(handleRequeueSchema), handleRequeue);

export default router;
