import pino from 'pino';

import { config } from '../config/index';

const isProduction = config.nodeEnv === 'production';

export const logger = pino({
  level: config.logger.level,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
});