import type { Express } from 'express';
import { Router } from 'express';

import { config } from '../config';
import { authRouter } from './auth.route';
import { healthRouter } from './health.route';
import { historyRouter } from './history.route';

export const registerRoutes = (app: Express) => {
  const apiRouter = Router();

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/history', historyRouter);

  app.use(config.baseApiPath, apiRouter);
};
