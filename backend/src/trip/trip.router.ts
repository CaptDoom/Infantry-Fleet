// ============================================================================
// M-FTAMS — Requisition Service & Router (Stage 1: Requisition)
// ============================================================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db';
import { Requisition, RequisitionStatus } from '../models/types';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';

export class RequisitionService {
  public createRequisition(
    unit_id: string,
    destination: string,
    purpose: string,
    planned_distance_km: number,
    requested_departure: string,
    expected_return: string
  ): Requisition {
    const requisition_id = uuidv4();
    const requisition: Requisition = {
      requisition_id,
      unit_id,
      destination,
      purpose,
      planned_distance_km,
      requested_departure: new Date(requested_departure).toISOString(),
      expected_return: new Date(expected_return).toISOString(),
      status: 'SUBMITTED',
      reviewed_by: null,
      review_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null
    };

    db.requisitions.set(requisition_id, requisition);
    db.logAudit('requisition', requisition_id, 'REQUISITION_SUBMITTED', null, {
      unit_id,
      destination,
      planned_distance_km,
      expected_return
    });

    return requisition;
  }

  public listRequisitions(status?: RequisitionStatus): Requisition[] {
    let list = Array.from(db.requisitions.values());
    if (status) {
      list = list.filter(r => r.status === status);
    }
    // Sort by requested departure ascending (soonest first)
    return list.sort((a, b) => new Date(a.requested_departure).getTime() - new Date(b.requested_departure).getTime());
  }

  public getRequisition(requisition_id: string): Requisition | null {
    return db.requisitions.get(requisition_id) || null;
  }
}

export const requisitionService = new RequisitionService();

export const requisitionRouter = Router();

// POST /requisitions — Submit new trip requisition
requisitionRouter.post('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const { destination, purpose, planned_distance_km, requested_departure, expected_return, unit_id } = req.body;

  if (!destination || !purpose || !planned_distance_km || !requested_departure || !expected_return) {
    return res.status(400).json({ error: 'Missing required requisition fields' });
  }

  if (Number(planned_distance_km) <= 0) {
    return res.status(400).json({ error: 'planned_distance_km must be greater than zero' });
  }

  // Default to first registered unit if not explicitly passed
  const effectiveUnitId = unit_id || Array.from(db.units.keys())[0];

  const requisition = requisitionService.createRequisition(
    effectiveUnitId,
    destination,
    purpose,
    Number(planned_distance_km),
    requested_departure,
    expected_return
  );

  return res.status(201).json(requisition);
});

// GET /requisitions — List requisitions (scoped by role / status)
requisitionRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as RequisitionStatus | undefined;
  const requisitions = requisitionService.listRequisitions(status);
  return res.json(requisitions);
});

// GET /requisitions/:requisition_id — Retrieve single requisition
requisitionRouter.get('/:requisition_id', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const requisition = requisitionService.getRequisition(req.params.requisition_id);
  if (!requisition) {
    return res.status(404).json({ error: 'Requisition not found' });
  }
  return res.json(requisition);
});
