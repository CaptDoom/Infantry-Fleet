// ============================================================================
// M-FTAMS — Reconciliation Service & 10% Threshold Rule Unit Tests
// ============================================================================

import { db } from '../src/models/db';
import { reconciliationService } from '../src/reconciliation/reconciliation.service';
import { DISTANCE_DEVIATION_THRESHOLD_PCT } from '../src/pkg/constants';

describe('Reconciliation Service & 10% Threshold Rule', () => {
  const mockRequisitionId = 'req-test-rec-001';
  const mockTripId = 'trip-test-rec-001';
  const mockVehicleId = 'v1111111-1111-1111-1111-111111111111';
  const mockDriverId = 'd1111111-1111-1111-1111-111111111111';
  const mockTokenId = 'tok-test-rec-001';

  beforeEach(() => {
    // Setup test requisition with planned distance = 100 km
    db.requisitions.set(mockRequisitionId, {
      requisition_id: mockRequisitionId,
      unit_id: 'u1',
      destination: 'Supply Depot Alpha',
      purpose: 'Ammunition & Rations',
      planned_distance_km: 100.0,
      requested_departure: new Date().toISOString(),
      expected_return: new Date(Date.now() + 3600000).toISOString(),
      status: 'APPROVED',
      reviewed_by: 'mto-user',
      review_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString()
    });

    // Setup test trip with outbound odometer = 10,000 km
    db.trips.set(mockTripId, {
      trip_id: mockTripId,
      requisition_id: mockRequisitionId,
      vehicle_id: mockVehicleId,
      driver_id: mockDriverId,
      token_id: mockTokenId,
      status: 'ON_SORTIE',
      outbound_odometer: 10000,
      inbound_odometer: null,
      actual_distance_km: null,
      deviation_pct: null,
      created_at: new Date().toISOString(),
      completed_at: null
    });
  });

  test('Sortie with exact planned distance (100km) reconciles as COMPLETED with 0% deviation', () => {
    // Inbound odometer = 10,100 km (10,100 - 10,000 = 100km, exactly 100%)
    const result = reconciliationService.reconcileTrip(mockTripId, 10100, 75, 'sentry-1');

    expect(result).not.toBeNull();
    expect(result!.actual_distance_km).toBe(100.0);
    expect(result!.deviation_pct).toBe(0.0);
    expect(result!.threshold_exceeded).toBe(false);
    expect(result!.status).toBe('COMPLETED');
    expect(result!.alert_raised).toBe(false);

    const tripInDb = db.trips.get(mockTripId);
    expect(tripInDb!.status).toBe('COMPLETED');
  });

  test('Sortie within 10% threshold (e.g. 108km, +8%) reconciles as COMPLETED without raising alert', () => {
    // Inbound odometer = 10,108 km (+8% deviation, within 10% allowance)
    const result = reconciliationService.reconcileTrip(mockTripId, 10108, 70, 'sentry-1');

    expect(result).not.toBeNull();
    expect(result!.actual_distance_km).toBe(108.0);
    expect(result!.deviation_pct).toBe(8.0);
    expect(result!.threshold_exceeded).toBe(false);
    expect(result!.status).toBe('COMPLETED');
    expect(result!.alert_raised).toBe(false);
  });

  test('Sortie exceeding 10% threshold (e.g. 125km, +25%) transitions to COMPLETED_FLAGGED and raises AUDIT_ALERT', () => {
    // Inbound odometer = 10,125 km (+25% deviation, exceeds 10% allowance)
    const initialAlertsCount = db.alerts.size;
    const result = reconciliationService.reconcileTrip(mockTripId, 10125, 60, 'sentry-1');

    expect(result).not.toBeNull();
    expect(result!.actual_distance_km).toBe(125.0);
    expect(result!.deviation_pct).toBe(25.0);
    expect(result!.threshold_exceeded).toBe(true);
    expect(result!.status).toBe('COMPLETED_FLAGGED');
    expect(result!.alert_raised).toBe(true);

    const tripInDb = db.trips.get(mockTripId);
    expect(tripInDb!.status).toBe('COMPLETED_FLAGGED');
    expect(db.alerts.size).toBe(initialAlertsCount + 1);

    // Verify alert contains audit details
    const raisedAlert = Array.from(db.alerts.values()).pop();
    expect(raisedAlert!.alert_type).toBe('AUDIT_ALERT');
    expect(raisedAlert!.message).toContain('+25% deviation');
    expect(raisedAlert!.message).toContain(`exceeds ${DISTANCE_DEVIATION_THRESHOLD_PCT}% threshold`);
  });
});
