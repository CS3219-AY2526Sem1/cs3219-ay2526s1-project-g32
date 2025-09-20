import type { Express } from 'express';
import { Router } from 'express';

import { config } from '../config';
import { healthRouter } from './health.route';

export const registerRoutes = (app: Express) => {
  const apiRouter = Router();

  apiRouter.use('/health', healthRouter);

  app.use(config.baseApiPath, apiRouter);
};
