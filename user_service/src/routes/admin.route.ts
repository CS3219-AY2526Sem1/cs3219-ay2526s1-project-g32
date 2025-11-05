import { Router } from 'express';

import { setAdminStatusHandler } from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(authenticate);

router.patch('/users/:userId/admin', requireAdmin, setAdminStatusHandler);

export const adminRouter = router;
