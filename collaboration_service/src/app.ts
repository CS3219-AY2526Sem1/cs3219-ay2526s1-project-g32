/* AI Assistance Disclosure:
Scope: Implement rate limiting and add linting.
Author Review: Validated for style and accuracy.
*/

import cors from 'cors';
import type { Application, NextFunction, Request, Response, RequestHandler} from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import type { RouteDependencies } from './routes';
import { registerRoutes } from './routes';
import { logger } from './utils/logger';

export const buildApp = (deps: RouteDependencies): Application => {
  const app = express();

  app.set('trust proxy', true);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }) as unknown as RequestHandler);

  registerRoutes(app, deps);

  app.use((req, res) => {
    res.status(404).json({
      error: 'NotFoundError',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? ((err as { status: number }).status ?? 500)
        : 500;
    const message =
      typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string'
        ? ((err as { message: string }).message ?? 'Unexpected error occurred')
        : 'Unexpected error occurred';

    if (status >= 500) {
      logger.error({ err }, 'Unhandled error');
    }

    res.status(status).json({
      error: (typeof err === 'object' && err !== null && 'name' in err && typeof (err as { name: unknown }).name === 'string'
        ? (err as { name: string }).name
        : 'Error'),
      message,
    });
  });

  return app;
};
