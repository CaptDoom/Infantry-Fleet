// ============================================================================
// M-FTAMS — Driver Registry Router
// ============================================================================

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/db';
import { Driver, DriverStatus } from '../models/types';
import { authenticateJwt, AuthenticatedRequest, requireRoles } from '../auth/auth.middleware';
import { sha256Hash } from '../pkg/crypto';

export const driverRouter = Router();

// GET /drivers — List all drivers (filterable by status)
driverRouter.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as DriverStatus | undefined;
  let list = Array.from(db.drivers.values());
  if (status) {
    list = list.filter(d => d.status === status);
  }
  return res.json(list);
});

// GET /drivers/:driver_id — Get driver detail
driverRouter.get('/:driver_id', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const driver = db.drivers.get(req.params.driver_id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  return res.json(driver);
});

// POST /drivers — Register a new driver (ADMIN only)
driverRouter.post('/', authenticateJwt, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { service_number, full_name, biometric_template, photo_data, smart_card_id } = req.body;

  if (!service_number || !full_name) {
    return res.status(400).json({ error: 'service_number and full_name are required' });
  }

  const exists = Array.from(db.drivers.values()).find(
    d => d.service_number.toLowerCase() === service_number.toLowerCase()
  );
  if (exists) {
    return res.status(409).json({ error: 'Service number already registered' });
  }

  const driver_id = uuidv4();
  const credential_hash = biometric_template ? sha256Hash(biometric_template) : sha256Hash(`bio_${service_number}`);
  const photo_hash = photo_data ? sha256Hash(photo_data) : sha256Hash(`photo_${service_number}`);

  const driver: Driver = {
    driver_id,
    service_number,
    full_name,
    credential_hash,
    photo_hash,
    smart_card_id: smart_card_id || `SC-${uuidv4().substring(0, 4).toUpperCase()}`,
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };

  db.drivers.set(driver_id, driver);
  db.logAudit('driver', driver_id, 'DRIVER_REGISTERED', req.user!.userId, {
    service_number,
    full_name
  });

  return res.status(201).json(driver);
});
