// ============================================================================
// M-FTAMS — Authentication & RBAC Middleware
// Enforces Server-Side Zero-Trust Role Boundaries
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '../models/types';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: UserRole;
  gateId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'mftams_jwt_production_secret_key_cantonment_2026';

/**
 * Validates incoming Bearer JWT on every protected API call.
 */
export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: UserRole;
      gateId: string | null;
      type: string;
    };

    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type for API access' });
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      gateId: decoded.gateId
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
}

/**
 * Enforces role-based permissions matrix server-side.
 * Never trusts UI-side state or presentation restrictions.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No active session' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized for this operation`,
        required_roles: allowedRoles
      });
    }

    next();
  };
}
