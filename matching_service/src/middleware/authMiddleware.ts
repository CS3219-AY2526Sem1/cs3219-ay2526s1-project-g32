import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

// Define a custom interface to extend the Express Request object
// This allows us to safely attach the authenticated user's data to the request
interface AuthenticatedRequest extends Request {
  user?: any; // You can define a more specific User type here if you have one
}

// URL for the auth service, loaded from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3002/api/v1/auth';

/**
 * Middleware to protect routes by verifying a JWT.
 * It expects a token in the 'Authorization: Bearer <token>' header.
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Get the token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication failed: No token provided.' });
    }
    const token = authHeader.split(' ')[1];

    // 2. Verify the token by calling the auth-service's /me endpoint
    const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 3. If the token is valid, the auth-service will return user data.
    // Attach the user data to the request object for later use in the controller.
    req.user = response.data;

    // 4. Pass control to the next middleware or the route's controller
    next();
  } catch (error: any) {
    // If the auth-service returns an error (e.g., 401), the token is invalid.
    let errorMessage = 'Unknown error';
    let statusCode = 401;

    if (axios.isAxiosError(error)) {
      // Handle axios-specific errors
      if (error.response) {
        // Server responded with error status
        statusCode = error.response.status;
        errorMessage = error.response.data?.message || `HTTP ${error.response.status}`;
      } else if (error.request) {
        // Network error - auth service might be down
        statusCode = 503;
        errorMessage = 'Auth service unavailable';
      } else {
        // Other axios error
        errorMessage = error.message || 'Request setup error';
      }
    } else {
      // Non-axios error
      errorMessage = error?.message || 'Unexpected error';
    }

    console.error('[AuthMiddleware] Token validation failed:', errorMessage);
    return res.status(statusCode).json({ 
      message: statusCode === 503 ? 'Service temporarily unavailable' : 'Authentication failed: Invalid token.' 
    });
  }
};