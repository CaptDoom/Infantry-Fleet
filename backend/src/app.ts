// ============================================================================
// M-FTAMS — Central Server Express Application
// ============================================================================

import express from 'express';
import cors from 'cors';
import { authRouter } from './auth/auth.router';
import { requisitionRouter } from './trip/trip.router';
import { approvalRouter } from './approval/approval.router';
import { vehicleRouter } from './vehicle/vehicle.router';
import { driverRouter } from './driver/driver.router';
import { gateRouter } from './gate/gate.router';
import { syncRouter } from './sync/sync.router';
import { alertRouter } from './alert/alert.router';
import { auditRouter } from './audit/audit.router';
import { fleetRouter } from './fleet/fleet.router';
import { systemRouter, handlePrometheusMetrics } from './system/system.router';

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'm-ftams-central-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// OpenMetrics / Prometheus Scrape Endpoint
app.get('/metrics', handlePrometheusMetrics);

// API Routes (Base path /api/v1)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/requisitions', requisitionRouter);
app.use('/api/v1/requisitions', approvalRouter);
app.use('/api/v1/vehicles', vehicleRouter);
app.use('/api/v1/drivers', driverRouter);
app.use('/api/v1', gateRouter);
app.use('/api/v1/fleet', fleetRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/system', systemRouter);

// Sync Protocol Routes (/sync)
app.use('/sync', syncRouter);

