// ============================================================================
// M-FTAMS — Authentication & User Management Router
// ============================================================================

import { Router, Request, Response } from 'express';
import { authService } from './auth.service';
import { db } from '../models/db';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from './auth.middleware';
import { UserRole } from '../models/types';

export const authRouter = Router();

// POST /auth/login — Authenticate & obtain JWT
authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = await authService.login(username, password);
  if (!result) {
    return res.status(401).json({ error: 'Invalid credentials or suspended account' });
  }

  return res.status(200).json(result);
});

// POST /auth/refresh — Exchange refresh token for new access token
authRouter.post('/refresh', (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  const result = authService.refreshAccessToken(refresh_token);
  if (!result) {
    return res.status(401).json({ error: 'Refresh token is invalid or expired' });
  }

  return res.status(200).json(result);
});

// POST /auth/logout — Invalidate current session
authRouter.post('/logout', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const { refresh_token } = req.body;
  authService.logout(req.user!.userId, refresh_token);
  return res.status(204).end();
});

// GET /users — List all system users (ADMIN only)
authRouter.get('/users', authenticateJwt, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const users = Array.from(db.users.values()).map(u => ({
    user_id: u.user_id,
    username: u.username,
    role: u.role,
    full_name: u.full_name,
    assigned_gate_id: u.assigned_gate_id,
    status: u.status,
    created_at: u.created_at,
    last_login_at: u.last_login_at
  }));
  return res.json(users);
});

// PATCH /users/:user_id/role — Change a user's role (ADMIN only, creates signed role_change_log)
authRouter.patch('/users/:user_id/role', authenticateJwt, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body as { role: UserRole };
  if (!['ADMIN', 'MTO', 'COMMANDER', 'SENTRY', 'DRIVER'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const success = authService.changeUserRole(req.params.user_id, role, req.user!.userId);
  if (!success) {
    return res.status(400).json({ error: 'Failed to update user role' });
  }

  const updatedUser = db.users.get(req.params.user_id);
  return res.json({
    message: `Role updated to ${role}`,
    user: {
      user_id: updatedUser!.user_id,
      username: updatedUser!.username,
      role: updatedUser!.role
    }
  });
});
