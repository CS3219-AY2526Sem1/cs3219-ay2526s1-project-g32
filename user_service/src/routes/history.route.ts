import { Router } from 'express';

import {
  listHistoryHandler,
  getHistoryDetailHandler,
  createHistoryAttemptHandler,
} from '../controllers/history.controller';
import { authenticate } from '../middleware/authenticate';
import { requireInternalKey } from '../middleware/requireInternalKey';
import { validateRequest } from '../middleware/validateRequest';
import { historyDetailSchema, createHistoryAttemptSchema } from '../validation/historySchemas';

const router = Router();

router.post(
  '/attempts',
  requireInternalKey,
  validateRequest(createHistoryAttemptSchema),
  createHistoryAttemptHandler,
);

router.use(authenticate);

router.get('/', listHistoryHandler);
router.get('/:sessionAttemptId', validateRequest(historyDetailSchema), getHistoryDetailHandler);

export const historyRouter = router;
