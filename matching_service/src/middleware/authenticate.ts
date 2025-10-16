import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4001';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header (let user service handle validation)
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    // Extract userId from request body or params
    const userId = req.body.userId || req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required for authentication.' });
    }

    try {
      // Call the user service to validate the token
      const response = await axios.post(`${USER_SERVICE_URL}/api/v1/auth/validate-token`, {
        accessToken,
        userId
      });

      const { isValid, userId: validatedUserId } = response.data;

      // Simple boolean check - if not valid, reject
      if (!isValid) {
        return res.status(401).json({ message: 'Authentication failed: Invalid or expired token.' });
      }

      // Token is valid, attach user info to request
      req.user = {
        id: validatedUserId || userId
      };

      next();
    } catch (error: any) {
      console.error('[Auth Middleware] Error validating token with user service:', error.message);
      
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: 'Authentication service unavailable.' });
      }

      return res.status(401).json({ message: 'Authentication failed.' });
    }
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export type { AuthenticatedRequest };