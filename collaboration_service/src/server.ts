import Redis from 'ioredis';

import { buildApp } from './app';
import { config } from './config';
import { SessionController } from './controllers';
import { RedisPresenceRepository, RedisSessionRepository } from './repositories';
import { SessionManager, StubQuestionServiceClient } from './services';
import { logger } from './utils/logger';

const redis = new Redis(config.redis.url);

const sessionRepository = new RedisSessionRepository(redis);
const presenceRepository = new RedisPresenceRepository(redis, Math.ceil(config.session.gracePeriodMs / 1000));

const sessionManager = new SessionManager(sessionRepository, presenceRepository, {
  gracePeriodMs: config.session.gracePeriodMs,
  sessionTokenTtlSeconds: config.jwt.sessionTokenTtlSeconds,
  jwtSecret: config.jwt.secret,
});

const questionClient = new StubQuestionServiceClient();

const sessionController = new SessionController(
  sessionManager,
  questionClient,
  config.services.user.baseUrl,
  config.websocket.baseUrl,
);

const app = buildApp({ sessionController });

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

const gracefulShutdown = () => {
  redis
    .quit()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, 'Failed to close Redis connection');
      process.exit(1);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
