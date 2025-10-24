import type { IncomingMessage, Server as HttpServer } from 'http';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';

import type { SessionManager } from '../services/sessionManager';
import { logger } from '../utils/logger';

type SessionTokenClaims = JwtPayload & {
  sessionId?: string;
  userId?: string;
  scope?: string;
};

type SessionContext = {
  sessionId: string;
  userId: string;
};

interface UpgradeRequest extends IncomingMessage {
  collabContext?: SessionContext;
}

export interface CollaborationGatewayOptions {
  path: string;
  sessionManager: SessionManager;
  jwtSecret: string;
  heartbeatMs: number;
}

const AUTHORIZATION_PREFIX = 'bearer ';

const extractToken = (req: IncomingMessage): string | null => {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith(AUTHORIZATION_PREFIX)) {
    return header.slice(AUTHORIZATION_PREFIX.length).trim();
  }

  if (!req.url) {
    return null;
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    return token ? token : null;
  } catch {
    return null;
  }
};

const unauthorized = (socket: any, code = '401', message = 'Unauthorized') => {
  try {
    socket.write(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
  } catch {
    // ignored
  }
  socket.destroy();
};

const normalizePath = (path: string) => {
  if (path === '/') {
    return '/';
  }

  return path.endsWith('/') ? path.slice(0, -1) : path;
};

const parseSessionId = (pathname: string, basePath: string): string | null => {
  const normalizedBase = normalizePath(basePath);
  const normalizedPath = normalizePath(pathname);

  let remainder: string;
  if (normalizedPath === normalizedBase) {
    remainder = '';
  } else if (normalizedPath.startsWith(`${normalizedBase}/`)) {
    remainder = normalizedPath.slice(normalizedBase.length);
  } else {
    return null;
  }

  const segments = remainder.split('/').filter(Boolean);
  return segments.length > 0 ? segments[0] : null;
};

const verifyToken = (token: string, sessionId: string, secret: string) => {
  const decoded = jwt.verify(token, secret) as SessionTokenClaims;

  if (decoded.sessionId !== sessionId) {
    throw new Error('Session mismatch');
  }

  if (decoded.scope !== 'collaboration') {
    throw new Error('Invalid scope');
  }

  if (!decoded.userId) {
    throw new Error('Missing user id');
  }

  return {
    userId: decoded.userId,
    sessionId: sessionId,
  };
};

const authenticateUpgrade = async (
  req: UpgradeRequest,
  options: CollaborationGatewayOptions,
): Promise<SessionContext | null> => {
  if (!req.url) {
    return null;
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(req.url, 'http://localhost');
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse WebSocket upgrade URL');
    return null;
  }

  const sessionId = parseSessionId(requestUrl.pathname, options.path);
  if (!sessionId) {
    return null;
  }

  const token = extractToken(req);
  if (!token) {
    return null;
  }

  let context: SessionContext;
  try {
    context = verifyToken(token, sessionId, options.jwtSecret);
  } catch (error) {
    logger.warn({ err: error }, 'Failed to verify session token');
    return null;
  }

  const session = await options.sessionManager.getSession(sessionId);
  if (!session) {
    return null;
  }

  if (session.status === 'ended') {
    return null;
  }

  const participant = session.participants.find((p) => p.userId === context.userId);
  if (!participant) {
    return null;
  }

  return context;
};

export const attachCollaborationGateway = (server: HttpServer, options: CollaborationGatewayOptions) => {
  const wss = new WebSocketServer({ noServer: true });
  const docPrefix = 'session:';
  const heartbeatMs = Math.max(options.heartbeatMs, 10_000);

  wss.on('connection', (ws, request: UpgradeRequest) => {
    const context = request.collabContext;
    if (!context) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const { sessionId, userId } = context;
    const docName = `${docPrefix}${sessionId}`;

    const recordConnected = () =>
      options.sessionManager
        .recordPresence(sessionId, userId, true, Date.now())
        .catch((error) => logger.warn({ err: error }, 'Failed to record presence'));

    const recordDisconnected = () =>
      options.sessionManager
        .recordPresence(sessionId, userId, false, Date.now())
        .catch((error) => logger.warn({ err: error }, 'Failed to record disconnected presence'));

    void recordConnected();
    const heartbeat = setInterval(() => {
      void recordConnected();
    }, heartbeatMs);

    ws.on('close', () => {
      clearInterval(heartbeat);
      void recordDisconnected();
    });

    ws.on('error', (error) => {
      logger.warn({ err: error }, 'WebSocket error');
    });

    ws.on('pong', () => {
      void recordConnected();
    });

    ws.on('message', () => {
      void recordConnected();
    });

    setupWSConnection(ws, request, { docName, gc: true });
  });

  server.on('upgrade', (req: UpgradeRequest, socket, head) => {
    if (!req.url) {
      unauthorized(socket, '400', 'Bad Request');
      return;
    }

    (async () => {
      const context = await authenticateUpgrade(req, options);
      if (!context) {
        unauthorized(socket);
        return;
      }

      req.collabContext = context;

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    })().catch((error) => {
      logger.error({ err: error }, 'Failed to process WebSocket upgrade');
      unauthorized(socket, '500', 'Internal Server Error');
    });
  });

  return wss;
};
