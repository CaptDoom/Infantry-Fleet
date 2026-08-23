// ============================================================================
// M-FTAMS — Approval Service & Router (Stage 2: Approval & Token Issuance)
// ============================================================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db';
import { GatePassToken, Trip } from '../models/types';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';
import { canonicalizeToken, signHmacSha256 } from '../pkg/crypto';
import { TOKEN_VALIDITY_WINDOW_HOURS } from '../pkg/constants';

export class ApprovalService {
  /**
   * Approves a requisition, binds vehicle + driver, and issues an HMAC-signed gate-pass token.
   */
  public approveRequisition(
    requisition_id: string,
    vehicle_id: string,
    driver_id: string,
    mto_user_id: string
  ): { trip: Trip; token: GatePassToken } | { error: string; code: number } {
    const requisition = db.requisitions.get(requisition_id);
    if (!requisition) {
      return { error: 'Requisition not found', code: 404 };
    }

    if (requisition.status !== 'SUBMITTED') {
      return { error: `Requisition is already ${requisition.status}`, code: 409 };
    }

    const vehicle = db.vehicles.get(vehicle_id);
    if (!vehicle || vehicle.status !== 'AVAILABLE') {
      return { error: 'Vehicle is not available for dispatch', code: 409 };
    }

    const driver = db.drivers.get(driver_id);
    if (!driver || driver.status !== 'ACTIVE') {
      return { error: 'Driver is suspended or not active', code: 409 };
    }

    // 1. Transition Requisition to APPROVED
    requisition.status = 'APPROVED';
    requisition.reviewed_by = mto_user_id;
    requisition.reviewed_at = new Date().toISOString();

    // 2. Transition Vehicle to RESERVED
    vehicle.status = 'RESERVED';
    vehicle.updated_at = new Date().toISOString();

    // 3. Generate Gate-Pass Token
    const token_id = uuidv4();
    const trip_id = uuidv4();
    const issued_at = new Date().toISOString();

    // Calculate valid_until: max(expected_return + 12h buffer, now + TOKEN_VALIDITY_WINDOW_HOURS)
    const etaMs = new Date(requisition.expected_return).getTime() + (12 * 3600 * 1000);
    const maxWindowMs = Date.now() + (TOKEN_VALIDITY_WINDOW_HOURS * 3600 * 1000);
    const validUntilMs = Math.min(etaMs, maxWindowMs);
    const valid_until = new Date(validUntilMs).toISOString();

    const tokenPayload = {
      token_id,
      trip_id,
      vehicle_id,
      driver_id,
      issued_at,
      valid_until,
      issued_by: mto_user_id
    };

    const signature = signHmacSha256(
      db.getHmacKey(),
      canonicalizeToken(tokenPayload)
    );

    const token: GatePassToken = {
      ...tokenPayload,
      status: 'ACTIVE',
      signature,
      revoked_by: null,
      revoked_at: null,
      revocation_reason: null
    };

    db.tokens.set(token_id, token);

    // 4. Create Trip in DISPATCHED status
    const trip: Trip = {
      trip_id,
      requisition_id,
      vehicle_id,
      driver_id,
      token_id,
      status: 'DISPATCHED',
      outbound_odometer: null,
      inbound_odometer: null,
      actual_distance_km: null,
      deviation_pct: null,
      created_at: issued_at,
      completed_at: null
    };

    db.trips.set(trip_id, trip);

    // 5. Append to Cryptographic Audit Log
    db.logAudit('token', token_id, 'GATE_PASS_TOKEN_ISSUED', mto_user_id, {
      requisition_id,
      trip_id,
      vehicle_id,
      registration: vehicle.registration_number,
      driver_id,
      driver_name: driver.full_name,
      valid_until,
      signature
    });

    return { trip, token };
  }

  /**
   * Rejects a requisition with mandatory reason code/text.
   */
  public rejectRequisition(
    requisition_id: string,
    reason: string,
    mto_user_id: string
  ): { success: boolean; error?: string; code?: number } {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Rejection reason is mandatory', code: 400 };
    }

    const requisition = db.requisitions.get(requisition_id);
    if (!requisition) {
      return { success: false, error: 'Requisition not found', code: 404 };
    }

    if (requisition.status !== 'SUBMITTED') {
      return { success: false, error: `Requisition is already ${requisition.status}`, code: 409 };
    }

    requisition.status = 'REJECTED';
    requisition.reviewed_by = mto_user_id;
    requisition.review_reason = reason.trim();
    requisition.reviewed_at = new Date().toISOString();

    db.logAudit('requisition', requisition_id, 'REQUISITION_REJECTED', mto_user_id, {
      reason: requisition.review_reason
    });

    return { success: true };
  }
}

export const approvalService = new ApprovalService();

export const approvalRouter = Router();

// POST /requisitions/:requisition_id/approve — MTO Only
approvalRouter.post(
  '/:requisition_id/approve',
  authenticateJwt,
  requireRoles('MTO', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { vehicle_id, driver_id } = req.body;
    if (!vehicle_id || !driver_id) {
      return res.status(400).json({ error: 'vehicle_id and driver_id are required for approval' });
    }

    const result = approvalService.approveRequisition(
      req.params.requisition_id,
      vehicle_id,
      driver_id,
      req.user!.userId
    );

    if ('error' in result) {
      return res.status(result.code).json({ error: result.error });
    }

    return res.status(200).json({
      trip_id: result.trip.trip_id,
      token_id: result.token.token_id,
      valid_until: result.token.valid_until,
      signature: result.token.signature
    });
  }
);

// POST /requisitions/:requisition_id/reject — MTO Only
approvalRouter.post(
  '/:requisition_id/reject',
  authenticateJwt,
  requireRoles('MTO', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is mandatory and cannot be empty' });
    }

    const result = approvalService.rejectRequisition(
      req.params.requisition_id,
      reason,
      req.user!.userId
    );

    if ('error' in result) {
      return res.status(result.code || 400).json({ error: result.error });
    }

    return res.status(200).json({ message: 'Requisition rejected' });
  }
);
