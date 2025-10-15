import { Router } from 'express';
import { 
    createMatchRequest, 
    deleteMatchRequest,
    getMatchStatus,
    handleRequeue
} from '../controllers/matchingControllers';

const router = Router();

/**
 * @route   POST /api/v1/matching/requests
 * @desc    Create a new matchmaking request
 * @access  Public (No authentication required)
 */
router.post('/requests', createMatchRequest);

/**
 * @route   DELETE /api/v1/matching/requests
 * @desc    Cancel a pending match request
 * @access  Public (No authentication required)
 */
router.delete('/requests', deleteMatchRequest);

/**
 * @route   GET /api/v1/matching/requests/:userId/status
 * @desc    Get the status of a user's match request
 * @access  Public (No authentication required)
 */
router.get('/requests/:userId/status', getMatchStatus);

/**
 * @route   POST /api/v1/matching/requeue
 * @desc    Re-queue a user after a partner disconnects
 * @access  Public (No authentication required)
 */
router.post('/requeue', handleRequeue);

export default router;
