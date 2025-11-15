/* AI Assistance Disclosure:
Scope: Implement server logic and graceful shutdown.
Author Review: Validated for style and accuracy.
*/

import Redis from 'ioredis';

import { buildApp } from './app';
import { config } from './config';
import { SessionController } from './controllers';
import { RedisPresenceRepository, RedisSessionRepository } from './repositories';
import { HistoryClient, SessionManager } from './services';
import { attachCollaborationGateway } from './websocket';
import { logger } from './utils/logger';

const redis = new Redis(config.redis.url);

const sessionRepository = new RedisSessionRepository(redis);
const presenceRepository = new RedisPresenceRepository(redis, Math.ceil(config.session.gracePeriodMs / 1000));
const historyClient = new HistoryClient(
  config.services.user.baseUrl,
  config.services.user.internalKey,
);

const sessionManager = new SessionManager(sessionRepository, presenceRepository, {
  gracePeriodMs: config.session.gracePeriodMs,
  sessionTokenTtlSeconds: config.jwt.sessionTokenTtlSeconds,
  jwtSecret: config.jwt.secret,
}, historyClient);

const sessionController = new SessionController(
  sessionManager,
  config.services.question.baseUrl,
  config.services.user.baseUrl,
  config.websocket.baseUrl,
);

const app = buildApp({ sessionController });
let websocketGateway: ReturnType<typeof attachCollaborationGateway> | null = null;

const start = () => {
  const server = app.listen(config.http.port, config.http.host, () => {
    logger.info(`Collaboration service listening on ${config.http.host}:${config.http.port}`);
  });

  websocketGateway = attachCollaborationGateway(server, {
    path: config.websocket.path,
    sessionManager,
    jwtSecret: config.jwt.secret,
    heartbeatMs: Math.min(Math.max(config.session.gracePeriodMs / 2, 15000), 60000),
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

  if (websocketGateway) {
    websocketGateway.clients.forEach((client) => {
      client.terminate();
    });
    websocketGateway.close();
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
