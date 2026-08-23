// ============================================================================
// M-FTAMS — Authentication Service (JWT & Password Verification)
// ============================================================================

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db';
import { User, UserRole } from '../models/types';
import { signHmacSha256 } from '../pkg/crypto';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  role: UserRole;
  user: {
    user_id: string;
    username: string;
    full_name: string;
    role: UserRole;
    assigned_gate_id: string | null;
  };
}

export class AuthService {
  private jwtSecret: string;
  private accessExpirySeconds: number = 900; // 15 Minutes
  private refreshExpirySeconds: number = 604800; // 7 Days
  private activeRefreshTokens: Set<string> = new Set();

  constructor(jwtSecret: string = 'mftams_jwt_production_secret_key_cantonment_2026') {
    this.jwtSecret = jwtSecret;
  }

  public setJwtSecret(secret: string) {
    this.jwtSecret = secret;
  }

  /**
   * Authenticates user against bcrypt password hash.
   */
  public async login(username: string, passwordPlain: string): Promise<AuthTokens | null> {
    const user = Array.from(db.users.values()).find(u => u.username === username);
    if (!user || user.status !== 'ACTIVE') {
      db.logAudit('auth', '00000000-0000-0000-0000-000000000000', 'LOGIN_FAILED', null, { username });
      return null;
    }

    const match = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!match) {
      db.logAudit('auth', user.user_id, 'LOGIN_FAILED_BAD_PASSWORD', user.user_id, { username });
      return null;
    }

    // Update last login
    user.last_login_at = new Date().toISOString();

    const tokens = this.generateTokenPair(user);
    db.logAudit('auth', user.user_id, 'LOGIN_SUCCESS', user.user_id, { role: user.role });
    return tokens;
  }

  /**
   * Refreshes access token using a valid refresh token.
   */
  public refreshAccessToken(refreshToken: string): { access_token: string; expires_in: number } | null {
    if (!this.activeRefreshTokens.has(refreshToken)) {
      return null;
    }

    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as { userId: string; role: UserRole; type: string };
      if (decoded.type !== 'refresh') {
        return null;
      }

      const user = db.users.get(decoded.userId);
      if (!user || user.status !== 'ACTIVE') {
        return null;
      }

      const access_token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          role: user.role,
          gateId: user.assigned_gate_id,
          type: 'access'
        },
        this.jwtSecret,
        { expiresIn: this.accessExpirySeconds }
      );

      return {
        access_token,
        expires_in: this.accessExpirySeconds
      };
    } catch {
      return null;
    }
  }

  /**
   * Invalidates a session refresh token on logout.
   */
  public logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      this.activeRefreshTokens.delete(refreshToken);
    }
    db.logAudit('auth', userId, 'LOGOUT', userId, {});
  }

  /**
   * Modifies a user's role and logs signed entry in role_change_log.
   */
  public changeUserRole(targetUserId: string, newRole: UserRole, changedByUserId: string): boolean {
    const user = db.users.get(targetUserId);
    const changer = db.users.get(changedByUserId);
    if (!user || !changer || changer.role !== 'ADMIN') {
      return false;
    }

    const previous_role = user.role;
    user.role = newRole;

    const log_id = uuidv4();
    const changed_at = new Date().toISOString();
    const signature = signHmacSha256(
      db.getHmacKey(),
      `${log_id}|${targetUserId}|${changedByUserId}|${previous_role}|${newRole}|${changed_at}`
    );

    const logEntry = {
      log_id,
      user_id: targetUserId,
      changed_by: changedByUserId,
      previous_role,
      new_role: newRole,
      changed_at,
      signature
    };

    db.roleChangeLogs.push(logEntry);
    db.logAudit('user', targetUserId, 'ROLE_CHANGED', changedByUserId, { previous_role, new_role: newRole });
    return true;
  }

  private generateTokenPair(user: User): AuthTokens {
    const access_token = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        gateId: user.assigned_gate_id,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.accessExpirySeconds }
    );

    const refresh_token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
        type: 'refresh'
      },
      this.jwtSecret,
      { expiresIn: this.refreshExpirySeconds }
    );

    this.activeRefreshTokens.add(refresh_token);

    return {
      access_token,
      refresh_token,
      expires_in: this.accessExpirySeconds,
      role: user.role,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        assigned_gate_id: user.assigned_gate_id
      }
    };
  }
}

export const authService = new AuthService();
