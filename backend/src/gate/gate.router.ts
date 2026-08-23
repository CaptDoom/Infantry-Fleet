// ============================================================================
// M-FTAMS — Gate & Token Management Router (Revocation & Blacklist)
// ============================================================================

import { Router, Response } from 'express';
import { db } from '../models/db';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';

export const gateRouter = Router();

// POST /tokens/:token_id/revoke — Revoke gate-pass token (MTO or ADMIN)
gateRouter.post('/tokens/:token_id/revoke', authenticateJwt, requireRoles('MTO', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || reason.trim() === '') {
    return res.status(400).json({ error: 'Revocation reason is mandatory' });
  }

  const token = db.tokens.get(req.params.token_id);
  if (!token) {
    return res.status(404).json({ error: 'Token not found' });
  }

  if (token.status === 'REVOKED') {
    return res.status(409).json({ error: 'Token is already revoked' });
  }

  token.status = 'REVOKED';
  token.revoked_by = req.user!.userId;
  token.revoked_at = new Date().toISOString();
  token.revocation_reason = reason.trim();

  // If trip is still in DISPATCHED, release the reserved vehicle back to AVAILABLE
  const trip = db.trips.get(token.trip_id);
  if (trip && trip.status === 'DISPATCHED') {
    const vehicle = db.vehicles.get(token.vehicle_id);
    if (vehicle && vehicle.status === 'RESERVED') {
      vehicle.status = 'AVAILABLE';
      vehicle.updated_at = new Date().toISOString();
    }
  }

  // Raise system alert
  db.raiseAlert(
    'AUDIT_ALERT',
    `Gate pass token ${token.token_id} revoked by ${req.user!.username}: ${token.revocation_reason}`,
    'WARNING',
    token.token_id
  );

  db.logAudit('token', token.token_id, 'TOKEN_REVOKED', req.user!.userId, {
    reason: token.revocation_reason,
    vehicle_id: token.vehicle_id,
    driver_id: token.driver_id
  });

  return res.json({
    message: 'Token revoked successfully. Note: Revocation takes effect at edge gates on next sync downlink.',
    token_id: token.token_id,
    status: token.status,
    revoked_at: token.revoked_at
  });
});

// GET /tokens — List tokens
gateRouter.get('/tokens', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const list = Array.from(db.tokens.values());
  return res.json(list);
});

// GET /tokens/:token_id/chit — Generate official military Gate-Pass Chit data
gateRouter.get('/tokens/:token_id/chit', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const chit = db.generateChit(req.params.token_id);
  if (!chit) {
    return res.status(404).json({ error: 'Gate-pass token or associated trip details not found' });
  }
  return res.json(chit);
});

// GET /tokens/:token_id/qr — Canonical QR code payload for barcode/QR scanners
gateRouter.get('/tokens/:token_id/qr', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const chit = db.generateChit(req.params.token_id);
  if (!chit) {
    return res.status(404).json({ error: 'Token not found' });
  }
  return res.json({
    token_id: chit.token_id,
    qr_payload: chit.qr_payload,
    format: 'ZXING_JSON_COMPATIBLE',
    signature_preview: chit.token_signature.substring(0, 16)
  });
});

