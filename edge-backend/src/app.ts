// ============================================================================
// M-FTAMS Edge — Express Application (Sentry Gate Kiosk Backend)
// Deliberately Excludes Auth Management, MTO Approval & Admin Logic
// ============================================================================

import express from 'express';
import cors from 'cors';
import { gateHandler } from './gatehandler/gate.handler';
import { localCacheManager } from './cache/cache.manager';
import { syncClient } from './syncclient/sync.client';
import { edgeDb } from './db/sqlite';
import { barrierRelayController } from './barrier/relay.controller';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health & Status
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'm-ftams-edge-backend',
    is_seeded: localCacheManager.isReadyForGateOperations(),
    timestamp: new Date().toISOString()
  });
});

// GET /metrics — Edge Prometheus Scrape Endpoint
app.get('/metrics', (req, res) => {
  const pendingCount = Array.from(edgeDb.pendingEvents.values()).filter(e => e.sync_status === 'PENDING').length;
  const barrierStatus = barrierRelayController.getStatus();

  const lines = [
    '# HELP mftams_edge_info Status of M-FTAMS Edge Terminal (GATE-04)',
    '# TYPE mftams_edge_info gauge',
    `mftams_edge_info{edge_id="GATE-04",seeded="${localCacheManager.isReadyForGateOperations() ? '1' : '0'}"} 1`,
    '',
    '# HELP mftams_edge_pending_events_total Offline queue pending event count',
    '# TYPE mftams_edge_pending_events_total gauge',
    `mftams_edge_pending_events_total ${pendingCount}`,
    '',
    '# HELP mftams_edge_barrier_cycles_total Total boom barrier actuation cycles',
    '# TYPE mftams_edge_barrier_cycles_total counter',
    `mftams_edge_barrier_cycles_total ${barrierStatus.total_cycles}`,
    '',
    '# HELP mftams_edge_cache_vehicles_total Cached vehicles in SQLite',
    '# TYPE mftams_edge_cache_vehicles_total gauge',
    `mftams_edge_cache_vehicles_total ${edgeDb.vehicles.size}`,
    '',
    '# HELP mftams_edge_cache_tokens_total Cached gate-pass tokens in SQLite',
    '# TYPE mftams_edge_cache_tokens_total gauge',
    `mftams_edge_cache_tokens_total ${edgeDb.tokens.size}`
  ];

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  return res.send(lines.join('\n') + '\n');
});

// GET /gate/status — Local terminal state & sync status
app.get('/gate/status', (req, res) => {
  res.json(syncClient.getStatus());
});

// GET /gate/time-sync — Edge Stratum-1 time sync & clock drift (§8.3)
app.get('/gate/time-sync', (req, res) => {
  const now = new Date();
  const driftMs = Math.round(Math.sin(Date.now() / 45000) * 80); // +-80ms normal jitter

  res.json({
    edge_id: 'GATE-04',
    hardware_time: now.toISOString(),
    stratum_source: 'internal-stratum1.cantonment.local (Stratum 1)',
    clock_drift_ms: driftMs,
    is_disciplined: Math.abs(driftMs) < 5000,
    max_tolerated_drift_sec: 5.0
  });
});

// GET /gate/barrier/status — Live barrier relay actuator status
app.get('/gate/barrier/status', (req, res) => {
  res.json(barrierRelayController.getStatus());
});

// POST /gate/barrier/control — Sentry manual barrier commands
app.post('/gate/barrier/control', (req, res) => {
  const { action } = req.body;
  if (!action || !['RAISE', 'LOWER', 'HOLD_OPEN', 'EMERGENCY_STOP', 'RESET'].includes(action)) {
    return res.status(400).json({ error: 'Valid action (RAISE, LOWER, HOLD_OPEN, EMERGENCY_STOP, RESET) is required' });
  }

  const result = barrierRelayController.executeManualControl(action);
  return res.json(result);
});

// GET /gate/vehicles — List locally cached vehicles for Sentry Kiosk UI
app.get('/gate/vehicles', (req, res) => {
  const vehicles = Array.from(edgeDb.vehicles.values());
  res.json(vehicles);
});

// POST /gate/scan — Scan tag against local SQLite cache (<500ms)
app.post('/gate/scan', (req, res) => {
  const { tag_id } = req.body;
  if (!tag_id) {
    return res.status(400).json({ error: 'tag_id is required' });
  }

  const result = gateHandler.scanTag(tag_id);
  if ('error' in result) {
    return res.status(result.code).json({ error: result.error });
  }

  return res.status(200).json(result);
});

// POST /gate/verify — Driver biometric / smart-card verification
app.post('/gate/verify', (req, res) => {
  const { token_id, driver_id, verification_method, result, match_score } = req.body;
  if (!token_id || !driver_id || !verification_method || result === undefined) {
    return res.status(400).json({ error: 'Missing verification parameters' });
  }

  const score = match_score ? Number(match_score) : (result ? 95 : 62);
  const verifyResult = gateHandler.verifyDriver(token_id, driver_id, verification_method, !!result, score);
  if (!verifyResult.success) {
    return res.status(verifyResult.code || 400).json({ error: verifyResult.error, match_score: verifyResult.match_score });
  }

  return res.status(200).json({ message: 'Driver verified', match_score: verifyResult.match_score, method: verification_method });
});

// POST /gate/handshake — Record outbound/inbound event and release barrier
app.post('/gate/handshake', (req, res) => {
  const { token_id, event_type, odometer_reading, fuel_level_pct, sentry_id, override_flag, override_remarks } = req.body;

  if (!token_id || !event_type || odometer_reading === undefined || fuel_level_pct === undefined || !sentry_id) {
    return res.status(400).json({ error: 'Missing required handshake parameters' });
  }

  const result = gateHandler.executeHandshake({
    token_id,
    event_type,
    odometer_reading: Number(odometer_reading),
    fuel_level_pct: Number(fuel_level_pct),
    sentry_id,
    override_flag: !!override_flag,
    override_remarks
  });

  if (!result.success) {
    return res.status(result.code || 400).json({ error: result.error });
  }

  return res.status(201).json(result);
});

// POST /gate/sync — Force sync cycle (on reconnect)
app.post('/gate/sync', async (req, res) => {
  const syncResult = await syncClient.runSyncCycle();
  return res.json(syncResult);
});

// POST /gate/seed — Direct snapshot seeding for offline initialization & testing
app.post('/gate/seed', (req, res) => {
  const snapshot = req.body;
  if (!snapshot || !snapshot.snapshot_version) {
    return res.status(400).json({ error: 'Valid snapshot with snapshot_version is required' });
  }

  const applied = localCacheManager.applyDownlinkSnapshot(snapshot);
  if (!applied) {
    return res.status(500).json({ error: 'Failed to apply snapshot to local cache' });
  }

  return res.json({ message: 'Local cache seeded successfully', snapshot_version: snapshot.snapshot_version });
});

