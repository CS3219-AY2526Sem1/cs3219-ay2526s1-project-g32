import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4001';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    displayName?: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is required.' });
    }

    const accessToken = authHeader.substring(7);

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token is required.' });
    }

    try {
      // First, decode the token locally to extract userId (without verification)
      // This is safe because we're just extracting the userId to pass to the user service
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) {
        return res.status(401).json({ message: 'Invalid token format.' });
      }

      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const userId = payload.sub;

      if (!userId) {
        return res.status(401).json({ message: 'Token does not contain user ID.' });
      }

      // Call the user service to validate the token with the correct endpoint
      const response = await axios.post(`${USER_SERVICE_URL}/api/v1/auth/token/validate`, {
        accessToken,
        userId
      });

      const { isValid, userId: validatedUserId } = response.data;

      // Simple boolean check - if not valid, reject
      if (!isValid) {
        return res.status(401).json({ message: 'Authentication failed: Invalid or expired token.' });
      }

      // Token is valid, attach user info to request
      const tokenMetadata = payload?.user_metadata;
      const usernameFromToken =
        tokenMetadata && typeof tokenMetadata === 'object' && tokenMetadata !== null
          ? (tokenMetadata as Record<string, unknown>).username
          : undefined;

      const displayName =
        typeof usernameFromToken === 'string' && usernameFromToken.trim().length > 0
          ? usernameFromToken
          : undefined;

      req.user = {
        id: validatedUserId || userId,
        displayName,
      };

      next();
    } catch (error: any) {
      console.error('[Auth Middleware] Error validating token with user service:', error.message);
      
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        return res.status(503).json({ message: 'Authentication service unavailable.' });
      }

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        return res.status(401).json({ message: 'Invalid token.' });
      }

      return res.status(401).json({ message: 'Authentication failed.' });
    }
  } catch (error) {
    console.error('[Auth Middleware] Unexpected error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export type { AuthenticatedRequest };
