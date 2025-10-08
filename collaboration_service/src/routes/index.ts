import type { Express, Request, Response } from 'express';
import { Router } from 'express';

import { config } from '../config';
import { registerHealthRoute } from './health';

export const registerRoutes = (app: Express) => {
  const apiRouter = Router();

  registerHealthRoute(apiRouter);

  app.use('/api/v1', apiRouter);

  if (config.nodeEnv !== 'production') {
    app.get('/', (_req: Request, res: Response) => {
      res.json({
        service: 'collaboration',
        status: 'ok',
      });
    });
  }
};
