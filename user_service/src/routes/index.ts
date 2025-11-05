import type { Express } from 'express';
import { Router } from 'express';

import { config } from '../config';
import { authRouter } from './auth.route';
import { healthRouter } from './health.route';
import { adminRouter } from './admin.route';

export const registerRoutes = (app: Express) => {
  const apiRouter = Router();

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/admin', adminRouter);

  app.use(config.baseApiPath, apiRouter);
};
