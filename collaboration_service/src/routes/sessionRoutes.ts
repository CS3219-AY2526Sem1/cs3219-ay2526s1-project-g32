import { Router } from 'express';

import { SessionCreateSchema, SessionTokenRequestSchema, SessionIdParamsSchema } from '../schemas';
import type { SessionController } from '../controllers';
import { validateBody, validateParams } from '../middleware';

export interface SessionRouteDependencies {
  controller: SessionController;
}

export const createSessionRouter = ({ controller }: SessionRouteDependencies) => {
  const router = Router();

  router.post(
    '/sessions',
    validateBody(SessionCreateSchema),
    controller.createSession,
  );

  router.get(
    '/sessions/:sessionId',
    validateParams(SessionIdParamsSchema),
    controller.getSession,
  );

  router.post(
    '/sessions/:sessionId/token',
    validateParams(SessionIdParamsSchema),
    validateBody(SessionTokenRequestSchema),
    controller.issueToken,
  );

  return router;
};
