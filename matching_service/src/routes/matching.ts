import { Router } from 'express';
import { 
    createMatchRequest, 
    deleteMatchRequest,
    getMatchStatus,
    handleRequeue
} from '../controllers/matchingControllers';
import { authMiddleware } from '../middleware/authMiddleware'; // Import the middleware

const router = Router();

/**
 * @route   POST /api/v1/matching/requests
 * @desc    Create a new matchmaking request
 * @access  Private (Requires authentication)
 */
router.post('/requests', authMiddleware, createMatchRequest);

/**
 * @route   DELETE /api/v1/matching/requests
 * @desc    Cancel a pending match request
 * @access  Private (Requires authentication)
 */
router.delete('/requests', authMiddleware, deleteMatchRequest);

/**
 * @route   GET /api/v1/matching/requests/:userId/status
 * @desc    Get the status of a user's match request
 * @access  Private (Requires authentication)
 */
router.get('/requests/:userId/status', authMiddleware, getMatchStatus);

/**
 * @route   POST /api/v1/matching/requeue
 * @desc    Re-queue a user after a partner disconnects
 * @access  Private (Internal service call, also protected)
 */
router.post('/requeue', authMiddleware, handleRequeue);

export default router;
