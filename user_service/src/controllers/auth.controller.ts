import type { NextFunction, Request, Response } from 'express';

import {
  getUserById,
  loginUser,
  registerUser,
  sendOtp,
  verifyOtp,
} from '../services/auth.service';
import type { AuthenticatedRequest } from '../middleware/authenticate';
import { HttpError } from '../utils/httpError';

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const sendOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await sendOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await verifyOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const meHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      throw new HttpError(401, 'Authentication context missing');
    }

    const user = await getUserById(req.auth.userId);

    if (!user) {
      res.status(404).json({ error: 'NotFound', message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
