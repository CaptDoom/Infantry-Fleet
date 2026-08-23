// ============================================================================
// M-FTAMS — Vehicle Registry Router
// ============================================================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db';
import { Vehicle, VehicleStatus } from '../models/types';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';
import { sha256Hash } from '../pkg/crypto';

export const vehicleRouter = Router();

// GET /vehicles — List all vehicles (filterable by status)
vehicleRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as VehicleStatus | undefined;
  let list = Array.from(db.vehicles.values());
  if (status) {
    list = list.filter(v => v.status === status);
  }
  return res.json(list);
});

// GET /vehicles/:vehicle_id — Get vehicle details
vehicleRouter.get('/:vehicle_id', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const vehicle = db.vehicles.get(req.params.vehicle_id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  return res.json(vehicle);
});

// POST /vehicles — Register a new vehicle (ADMIN only)
vehicleRouter.post('/', authenticateJwt, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { registration_number, vehicle_type, photo_data, rfid_tag_id, initial_odometer } = req.body;

  if (!registration_number || !vehicle_type) {
    return res.status(400).json({ error: 'registration_number and vehicle_type are required' });
  }

  // Check unique registration
  const exists = Array.from(db.vehicles.values()).find(
    v => v.registration_number.toLowerCase() === registration_number.toLowerCase()
  );
  if (exists) {
    return res.status(409).json({ error: 'Vehicle registration already exists' });
  }

  const vehicle_id = uuidv4();
  const photo_hash = photo_data ? sha256Hash(photo_data) : sha256Hash(`photo_${registration_number}`);

  const vehicle: Vehicle = {
    vehicle_id,
    registration_number,
    vehicle_type,
    status: 'AVAILABLE',
    photo_hash,
    current_odometer: Number(initial_odometer) || 0,
    rfid_tag_id: rfid_tag_id || `RFID-${uuidv4().substring(0, 6).toUpperCase()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.vehicles.set(vehicle_id, vehicle);
  db.logAudit('vehicle', vehicle_id, 'VEHICLE_REGISTERED', req.user!.userId, {
    registration_number,
    vehicle_type
  });

  return res.status(201).json(vehicle);
});

// PATCH /vehicles/:vehicle_id/status — Update status (ADMIN or MTO)
vehicleRouter.patch('/:vehicle_id/status', authenticateJwt, requireRoles('ADMIN', 'MTO'), (req: AuthenticatedRequest, res: Response) => {
  const vehicle = db.vehicles.get(req.params.vehicle_id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const { status } = req.body;
  if (!['AVAILABLE', 'RESERVED', 'DISPATCHED', 'ON_SORTIE', 'MAINTENANCE'].includes(status)) {
    return res.status(400).json({ error: 'Invalid vehicle status' });
  }

  const previous_status = vehicle.status;
  vehicle.status = status;
  vehicle.updated_at = new Date().toISOString();

  db.logAudit('vehicle', vehicle.vehicle_id, 'VEHICLE_STATUS_UPDATED', req.user!.userId, {
    previous_status,
    new_status: status
  });

  return res.json(vehicle);
});
