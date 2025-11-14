/* AI Assistance Disclosure:
Scope: Implementation of authenticate() function.
Author Review: Validated for style and accuracy.
*/

import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { config } from '../config';
import { HttpError } from '../utils/httpError';

export type AuthClaims = JwtPayload & {
  email?: string | null;
  role?: string;
  user_metadata?: Record<string, unknown>;
};

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    email?: string | null;
    role?: string;
    isAdmin: boolean;
    claims: AuthClaims;
    token: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'Authorization header missing or malformed'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    next(new HttpError(401, 'Access token missing'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.supabase.jwtSecret) as AuthClaims; // verify with configured secret
    const userId = decoded.sub;

    if (!userId) {
      next(new HttpError(401, 'Token missing subject claim'));
      return;
    }

    const isAdmin =
      decoded.user_metadata && typeof decoded.user_metadata === 'object'
        ? Boolean((decoded.user_metadata as Record<string, unknown>).isAdmin)
        : false;

    req.auth = {
      userId,
      email: decoded.email ?? null,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
      isAdmin,
      claims: decoded,
      token,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new HttpError(401, 'Access token expired'));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpError(401, 'Invalid access token'));
      return;
    }

    next(error);
  }
};
