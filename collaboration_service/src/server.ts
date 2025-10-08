import { buildApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const app = buildApp();

const start = () => {
  const server = app.listen(config.http.port, config.http.host, () => {
    logger.info(`Collaboration service listening on ${config.http.host}:${config.http.port}`);
  });

  server.on('error', (error) => {
    logger.error({ err: error }, 'Failed to start collaboration service');
    process.exit(1);
  });
};

start();
