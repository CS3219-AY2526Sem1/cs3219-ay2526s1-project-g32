import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { registerRoutes } from './routes';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', true);
  app.use(helmet()); // helmet for basic security headers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const corsOptions: CorsOptions = {
    origin: config.cors.allowedOrigins.length > 0 ? config.cors.allowedOrigins : undefined,
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev')); // request logging

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
