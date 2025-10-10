import type { Express, Request, Response } from 'express';
import { Router } from 'express';

import { config } from '../config';
import type { SessionController } from '../controllers';
import { createSessionRouter } from './sessionRoutes';
import { registerHealthRoute } from './health';

export interface RouteDependencies {
  sessionController: SessionController;
}

export const registerRoutes = (app: Express, deps: RouteDependencies) => {
  const apiRouter = Router();

  registerHealthRoute(apiRouter);
  apiRouter.use(createSessionRouter({ controller: deps.sessionController }));

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
