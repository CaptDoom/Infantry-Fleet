// ============================================================================
// M-FTAMS — End-to-End API Integration & RBAC Security Tests
// ============================================================================

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../src/app';
import { db } from '../src/models/db';
import { canonicalizeGateEvent, signHmacSha256 } from '../src/pkg/crypto';

describe('M-FTAMS Central Backend API Integration & RBAC Matrix', () => {
  let adminToken: string;
  let mtoToken: string;
  let commanderToken: string;
  let sentryToken: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'password123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.access_token;

    // 2. Authenticate MTO
    const mtoRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'mto', password: 'password123' });
    expect(mtoRes.status).toBe(200);
    mtoToken = mtoRes.body.access_token;

    // 3. Authenticate Commander
    const cmdRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'commander', password: 'password123' });
    expect(cmdRes.status).toBe(200);
    commanderToken = cmdRes.body.access_token;

    // 4. Authenticate Sentry
    const sentryRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'sentry_main', password: 'password123' });
    expect(sentryRes.status).toBe(200);
    sentryToken = sentryRes.body.access_token;
  });

  describe('RBAC Boundary Enforcement', () => {
    test('COMMANDER cannot approve or reject requisitions (Strict Read-Only Enforcement)', async () => {
      const res = await request(app)
        .post('/api/v1/requisitions/some-req-id/approve')
        .set('Authorization', `Bearer ${commanderToken}`)
        .send({ vehicle_id: 'v1', driver_id: 'd1' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Role 'COMMANDER' is not authorized");
    });

    test('SENTRY cannot register vehicles or manage users', async () => {
      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${sentryToken}`)
        .send({ registration_number: '25A-9999', vehicle_type: 'Truck' });

      expect(res.status).toBe(403);
    });

    test('ADMIN can query users and change roles', async () => {
      const usersRes = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(usersRes.status).toBe(200);
      expect(Array.isArray(usersRes.body)).toBe(true);
    });
  });

  describe('Sortie Lifecycle: Requisition -> Approval -> Token Issuance', () => {
    let createdReqId: string;
    const vehicleId = 'v1111111-1111-1111-1111-111111111111';
    const driverId = 'd1111111-1111-1111-1111-111111111111';

    test('Stage 1: Submit a new trip requisition', async () => {
      const res = await request(app)
        .post('/api/v1/requisitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          destination: 'Leh Airbase Supply Depot',
          purpose: 'Emergency Medical & High-Altitude Equipment Delivery',
          planned_distance_km: 75.5,
          requested_departure: new Date().toISOString(),
          expected_return: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUBMITTED');
      expect(res.body.requisition_id).toBeDefined();
      createdReqId = res.body.requisition_id;
    });

    test('Stage 2: MTO Approval rejects approval without vehicle/driver', async () => {
      const res = await request(app)
        .post(`/api/v1/requisitions/${createdReqId}/approve`)
        .set('Authorization', `Bearer ${mtoToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('Stage 2: MTO Approval issues HMAC-signed token and binds vehicle/driver', async () => {
      const res = await request(app)
        .post(`/api/v1/requisitions/${createdReqId}/approve`)
        .set('Authorization', `Bearer ${mtoToken}`)
        .send({ vehicle_id: vehicleId, driver_id: driverId });

      expect(res.status).toBe(200);
      expect(res.body.trip_id).toBeDefined();
      expect(res.body.token_id).toBeDefined();
      expect(res.body.signature).toHaveLength(64);

      // Verify vehicle status transitioned to RESERVED
      const v = db.vehicles.get(vehicleId);
      expect(v!.status).toBe('RESERVED');
    });

    test('Stage 2 Rejection: Requisition rejection requires mandatory non-empty reason', async () => {
      // Create another requisition to reject
      const reqRes = await request(app)
        .post('/api/v1/requisitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          destination: 'Sector 5 Forward Post',
          purpose: 'Routine inspection',
          planned_distance_km: 30.0,
          requested_departure: new Date().toISOString(),
          expected_return: new Date(Date.now() + 2 * 3600 * 1000).toISOString()
        });
      const rejectReqId = reqRes.body.requisition_id;

      // Reject without reason
      const failRes = await request(app)
        .post(`/api/v1/requisitions/${rejectReqId}/reject`)
        .set('Authorization', `Bearer ${mtoToken}`)
        .send({ reason: '' });

      expect(failRes.status).toBe(400);
      expect(failRes.body.error).toContain('Rejection reason is mandatory');

      // Reject with reason
      const successRes = await request(app)
        .post(`/api/v1/requisitions/${rejectReqId}/reject`)
        .set('Authorization', `Bearer ${mtoToken}`)
        .send({ reason: 'Weather warning in Sector 5 — all non-critical sorties suspended' });

      expect(successRes.status).toBe(200);
      const reqInDb = db.requisitions.get(rejectReqId);
      expect(reqInDb!.status).toBe('REJECTED');
      expect(reqInDb!.review_reason).toContain('Weather warning');
    });
  });

  describe('Sync Protocol Handlers (/sync/downlink and /sync/uplink)', () => {
    test('Downlink generates complete snapshot with active tokens, vehicles, drivers', async () => {
      const res = await request(app).get('/sync/downlink?edge_id=GATE-04');

      expect(res.status).toBe(200);
      expect(res.body.snapshot_version).toBeDefined();
      expect(res.body.edge_id).toBe('GATE-04');
      expect(Array.isArray(res.body.tokens)).toBe(true);
      expect(Array.isArray(res.body.vehicles)).toBe(true);
      expect(Array.isArray(res.body.drivers)).toBe(true);
    });

    test('Uplink ingests valid batch and updates gate state', async () => {
      const edgeId = 'GATE-04';
      const edgeSecret = 'mftams_edge_secret_GATE-04_99214710_auth';
      const eventId = uuidv4();
      const tripId = uuidv4();
      const vehicleId = 'v1111111-1111-1111-1111-111111111111';
      const driverId = 'd1111111-1111-1111-1111-111111111111';
      const tokenId = uuidv4();
      const nowIso = new Date().toISOString();

      const canonicalBytes = canonicalizeGateEvent({
        event_id: eventId,
        edge_id: edgeId,
        event_type: 'OUTBOUND',
        trip_id: tripId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        token_id: tokenId,
        odometer_reading: 18450,
        fuel_level_pct: 90,
        sentry_id: 'sentry-01',
        hardware_timestamp: nowIso
      });

      const signature = signHmacSha256(edgeSecret, canonicalBytes);

      const batch = {
        edge_id: edgeId,
        batch_id: uuidv4(),
        hardware_clock_at_generation: nowIso,
        events: [
          {
            event_id: eventId,
            event_type: 'OUTBOUND',
            trip_id: tripId,
            vehicle_id: vehicleId,
            driver_id: driverId,
            token_id: tokenId,
            odometer_reading: 18450,
            fuel_level_pct: 90,
            hardware_timestamp: nowIso,
            sentry_id: 'sentry-01',
            event_signature: signature
          }
        ]
      };

      const res = await request(app).post('/sync/uplink').send(batch);

      expect(res.status).toBe(200);
      expect(res.body.accepted_event_ids).toContain(eventId);

      // Re-delivery of same batch (Idempotency test)
      const replayRes = await request(app).post('/sync/uplink').send(batch);
      expect(replayRes.status).toBe(200);
      expect(replayRes.body.accepted_event_ids).toContain(eventId);
    });

    test('Uplink rejects entire batch if any event signature is invalid', async () => {
      const edgeId = 'GATE-04';
      const badBatch = {
        edge_id: edgeId,
        batch_id: uuidv4(),
        hardware_clock_at_generation: new Date().toISOString(),
        events: [
          {
            event_id: uuidv4(),
            event_type: 'OUTBOUND',
            trip_id: uuidv4(),
            vehicle_id: 'v1111111-1111-1111-1111-111111111111',
            driver_id: 'd1111111-1111-1111-1111-111111111111',
            token_id: uuidv4(),
            odometer_reading: 20000,
            fuel_level_pct: 80,
            hardware_timestamp: new Date().toISOString(),
            sentry_id: 'sentry-01',
            event_signature: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
          }
        ]
      };

      const res = await request(app).post('/sync/uplink').send(badBatch);
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Signature validation failed');
    });
  });

  describe('Audit Trail Verification & Report Export Endpoints', () => {
    test('GET /api/v1/audit/verify confirms complete hash-chain integrity', async () => {
      const res = await request(app)
        .get('/api/v1/audit/verify')
        .set('Authorization', `Bearer ${commanderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.chain_valid).toBe(true);
      expect(res.body.tamper_detected).toBe(false);
      expect(res.body.total_entries_verified).toBeGreaterThan(0);
    });

    test('GET /api/v1/audit/export exports cryptographically certified ledger', async () => {
      const res = await request(app)
        .get('/api/v1/audit/export')
        .set('Authorization', `Bearer ${commanderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.report_title).toContain('Cryptographic Audit Ledger');
      expect(res.body.integrity_certificate.chain_valid).toBe(true);
      expect(Array.isArray(res.body.records)).toBe(true);
    });
  });

  describe('Military Gate-Pass Chit & QR Code Generation', () => {
    test('GET /api/v1/tokens/:token_id/chit returns formatted chit data with QR payload', async () => {
      // Find an active token
      const tokens = Array.from(db.tokens.values());
      expect(tokens.length).toBeGreaterThan(0);
      const token = tokens[0];

      const res = await request(app)
        .get(`/api/v1/tokens/${token.token_id}/chit`)
        .set('Authorization', `Bearer ${mtoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.chit_number).toBeDefined();
      expect(res.body.qr_payload).toBeDefined();
      expect(res.body.token_signature).toBeDefined();
    });

    test('GET /api/v1/tokens/:token_id/qr returns ZXing-compatible scan payload', async () => {
      const tokens = Array.from(db.tokens.values());
      const token = tokens[0];

      const res = await request(app)
        .get(`/api/v1/tokens/${token.token_id}/qr`)
        .set('Authorization', `Bearer ${sentryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.format).toBe('ZXING_JSON_COMPATIBLE');
    });
  });

  describe('Internal Air-Gapped System Services (Time-Sync, PKI Security, Prometheus)', () => {
    test('GET /api/v1/system/time-sync confirms Stratum-1 clock discipline (§8.3)', async () => {
      const res = await request(app).get('/api/v1/system/time-sync');

      expect(res.status).toBe(200);
      expect(res.body.stratum_level).toBe(1);
      expect(res.body.is_synchronized).toBe(true);
      expect(res.body.max_tolerated_drift_seconds).toBe(5.0);
    });

    test('GET /api/v1/system/security-status confirms internal PKI CA and mTLS state (§9.4)', async () => {
      const res = await request(app).get('/api/v1/system/security-status');

      expect(res.status).toBe(200);
      expect(res.body.pki_ca_type).toContain('step-ca');
      expect(res.body.mtls_enforced).toBe(true);
      expect(res.body.audit_chain_valid).toBe(true);
    });

    test('GET /metrics provides Prometheus scrape metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('mftams_system_info');
      expect(res.text).toContain('mftams_vehicles_total');
      expect(res.text).toContain('mftams_audit_chain_valid');
    });
  });
});

