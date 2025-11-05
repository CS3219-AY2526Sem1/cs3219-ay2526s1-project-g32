import type { Request, Response, NextFunction } from 'express';

import { updateUserAdminStatus } from '../services/auth.service';

export const setAdminStatusHandler = async (
  req: Request<{ userId: string }, unknown, { isAdmin?: boolean }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body || {};

    const targetStatus = typeof isAdmin === 'boolean' ? isAdmin : true;
    const user = await updateUserAdminStatus(userId, targetStatus);

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
