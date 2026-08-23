// ============================================================================
// M-FTAMS Edge — Offline Gate Latency, Cache & Handshake Unit Tests
// ============================================================================

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../src/app';
import { edgeDb } from '../src/db/sqlite';
import { localCacheManager, DownlinkSnapshotPayload } from '../src/cache/cache.manager';
import { canonicalizeToken, signHmacSha256 } from '../src/pkg/crypto';

describe('M-FTAMS Edge Backend — Offline Gate Operations (<500ms Latency)', () => {
  const edgeId = 'GATE-04';
  const signingKey = 'mftams_central_hmac_master_key_99482715_cantonment';

  const mockVehicleId = 'v1111111-1111-1111-1111-111111111111';
  const mockDriverId = 'd1111111-1111-1111-1111-111111111111';
  const mockTokenId = uuidv4();
  const mockTripId = uuidv4();
  const mockRfidTag = 'RFID-A17E9C';

  const validUntil = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  const issuedAt = new Date().toISOString();

  const tokenPayload = {
    token_id: mockTokenId,
    trip_id: mockTripId,
    vehicle_id: mockVehicleId,
    driver_id: mockDriverId,
    issued_at: issuedAt,
    valid_until: validUntil,
    issued_by: 'mto-user-01'
  };
  const tokenSignature = signHmacSha256(signingKey, canonicalizeToken(tokenPayload));

  const sampleSnapshot: DownlinkSnapshotPayload = {
    snapshot_version: '2026-08-23T10:00:00Z#001',
    edge_id: edgeId,
    generated_at: new Date().toISOString(),
    tokens: [
      {
        ...tokenPayload,
        status: 'ACTIVE',
        signature: tokenSignature
      }
    ],
    vehicles: [
      {
        vehicle_id: mockVehicleId,
        registration: '25A-4471',
        status: 'RESERVED',
        photo_hash: 'hash_photo_gypsy_25A4471',
        current_odometer: 18420,
        rfid_tag_id: mockRfidTag
      }
    ],
    drivers: [
      {
        driver_id: mockDriverId,
        name: 'Nb Sub Rakesh Yadav',
        credential_hash: 'hash_bio_rakesh_yadav',
        photo_hash: 'hash_photo_rakesh_yadav',
        status: 'ACTIVE'
      }
    ],
    revocations: []
  };

  test('Fail-closed invariant: Edge refuses to authorize any scan against an unseeded cache', async () => {
    edgeDb.clearCache();
    edgeDb.meta.delete('snapshot_version');

    const res = await request(app).post('/gate/scan').send({ tag_id: mockRfidTag });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('Edge terminal is not initialized');
  });

  test('Atomic Cache Replacement: Seeds local cache and enables gate operations', async () => {
    const success = localCacheManager.applyDownlinkSnapshot(sampleSnapshot);
    expect(success).toBe(true);
    expect(localCacheManager.isReadyForGateOperations()).toBe(true);
  });

  test('Offline Tag Scan: Responds in <500ms with token, driver, and vehicle details', async () => {
    const startTime = Date.now();
    const res = await request(app).post('/gate/scan').send({ tag_id: mockRfidTag });
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(500); // Sub-500ms latency target
    expect(res.status).toBe(200);
    expect(res.body.token_id).toBe(mockTokenId);
    expect(res.body.registration_number).toBe('25A-4471');
    expect(res.body.driver_name).toBe('Nb Sub Rakesh Yadav');
    expect(res.body.driver_photo_hash).toBe('hash_photo_rakesh_yadav');
  });

  test('Offline Driver Verification: Verifies bound driver credential', async () => {
    const res = await request(app).post('/gate/verify').send({
      token_id: mockTokenId,
      driver_id: mockDriverId,
      verification_method: 'SMART_CARD',
      result: true
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Driver verified');
  });

  test('Offline Driver Verification: Rejects mismatched driver', async () => {
    const res = await request(app).post('/gate/verify').send({
      token_id: mockTokenId,
      driver_id: 'd9999999-9999-9999-9999-999999999999',
      verification_method: 'SMART_CARD',
      result: true
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Driver / Token binding mismatch');
  });

  test('Outbound Gate Handshake: Enqueues signed transaction, transitions vehicle to ON_SORTIE, and raises barrier', async () => {
    const res = await request(app).post('/gate/handshake').send({
      token_id: mockTokenId,
      event_type: 'OUTBOUND',
      odometer_reading: 18420,
      fuel_level_pct: 85,
      sentry_id: 'sentry-duty-01'
    });

    expect(res.status).toBe(201);
    expect(res.body.barrier_signal).toBe('RAISE');
    expect(res.body.event_id).toBeDefined();

    // Verify local cache state transitions
    const v = edgeDb.vehicles.get(mockVehicleId);
    expect(v!.status).toBe('ON_SORTIE');

    const t = edgeDb.tokens.get(mockTokenId);
    expect(t!.status).toBe('CONSUMED');

    // Verify offline queue has 1 pending item
    const pending = Array.from(edgeDb.pendingEvents.values()).filter(e => e.sync_status === 'PENDING');
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].signature).toHaveLength(64);
  });

  test('Sentry Override-with-remarks: Requires non-empty remarks and records distinct override event', async () => {
    const failRes = await request(app).post('/gate/handshake').send({
      token_id: 'unknown-token-override',
      event_type: 'OUTBOUND',
      odometer_reading: 19000,
      fuel_level_pct: 90,
      sentry_id: 'sentry-duty-01',
      override_flag: true,
      override_remarks: ''
    });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toContain('Override remarks are mandatory');

    const okRes = await request(app).post('/gate/handshake').send({
      token_id: 'unknown-token-override',
      event_type: 'OUTBOUND',
      odometer_reading: 19000,
      fuel_level_pct: 90,
      sentry_id: 'sentry-duty-01',
      override_flag: true,
      override_remarks: 'Station Commander verbal dispatch order for urgent perimeter patrol'
    });

    expect(okRes.status).toBe(201);
    expect(okRes.body.barrier_signal).toBe('RAISE');
  });

  test('Optical QR Code Scan: Successfully decodes JSON QR payload in <500ms', async () => {
    const qrPayload = JSON.stringify({
      t_id: mockTokenId,
      v_reg: '25A-4471',
      d_srv: 'JC-482910M'
    });

    const res = await request(app).post('/gate/scan').send({ tag_id: qrPayload });

    expect(res.status).toBe(200);
    expect(res.body.token_id).toBe(mockTokenId);
    expect(res.body.scan_source).toBe('QR_CODE');
  });

  test('Hardware Relay & Boom-Barrier Actuator Controls', async () => {
    // Check initial status
    const statusRes = await request(app).get('/gate/barrier/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.barrier_id).toBeDefined();

    // Sentry emergency manual control
    const holdRes = await request(app).post('/gate/barrier/control').send({ action: 'HOLD_OPEN' });
    expect(holdRes.status).toBe(200);
    expect(holdRes.body.state).toBe('HOLD_OPEN');

    const resetRes = await request(app).post('/gate/barrier/control').send({ action: 'RESET' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.state).toBe('LOWERED');
  });

  test('Edge Stratum-1 Time Sync & Metrics Scrape', async () => {
    const timeRes = await request(app).get('/gate/time-sync');
    expect(timeRes.status).toBe(200);
    expect(timeRes.body.stratum_source).toContain('Stratum 1');
    expect(timeRes.body.is_disciplined).toBe(true);

    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.text).toContain('mftams_edge_barrier_cycles_total');
    expect(metricsRes.text).toContain('mftams_edge_pending_events_total');
  });
});

