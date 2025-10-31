﻿import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import {
  getUserById,
  loginUser,
  registerUser,
  sendMagicLink,
} from '../services/auth.service';
import type { AuthenticatedRequest } from '../middleware/authenticate';
import { HttpError } from '../utils/httpError';
import { config } from '../config';

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

export const resendVerificationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await sendMagicLink(req.body);
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

export const validateTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken, userId } = req.body as { accessToken: string; userId: string };

    try {
      const decoded = jwt.verify(accessToken, config.supabase.jwtSecret) as JwtPayload;
      const tokenUserId = typeof decoded.sub === 'string' ? decoded.sub : null;

      if (!tokenUserId) {
        res.status(200).json({ isValid: false, reason: 'missing_subject' });
        return;
      }

      if (tokenUserId !== userId) {
        res.status(200).json({ isValid: false, reason: 'user_mismatch', userId: tokenUserId });
        return;
      }

      res.status(200).json({ isValid: true, userId: tokenUserId });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        res.status(200).json({ isValid: false, reason: 'token_expired' });
        return;
      }

      if (error instanceof JsonWebTokenError) {
        res.status(200).json({ isValid: false, reason: 'invalid_token' });
        return;
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
};
