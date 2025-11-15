import type { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.originalUrl} does not exist`,
  });
};
