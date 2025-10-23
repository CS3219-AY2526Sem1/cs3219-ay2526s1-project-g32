import type { Router, Request, Response } from 'express';

export const registerHealthRoute = (router: Router) => {
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });
};
