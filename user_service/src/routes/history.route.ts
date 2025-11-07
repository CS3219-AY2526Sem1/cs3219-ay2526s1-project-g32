import { Router } from 'express';

import { listHistoryHandler, getHistoryDetailHandler } from '../controllers/history.controller';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { historyDetailSchema } from '../validation/historySchemas';

const router = Router();

router.use(authenticate);

router.get('/', listHistoryHandler);
router.get('/:sessionAttemptId', validateRequest(historyDetailSchema), getHistoryDetailHandler);

export const historyRouter = router;
