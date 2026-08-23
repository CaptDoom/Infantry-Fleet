// ============================================================================
// M-FTAMS — Reconciliation Service (Stage 7: Post-Trip Distance/Fuel Audit)
// Enforces Non-Negotiable 10% Distance Deviation Threshold Rule
// ============================================================================

import { db } from '../models/db';
import { Trip, TripStatus } from '../models/types';
import { DISTANCE_DEVIATION_THRESHOLD_PCT } from '../pkg/constants';

export interface ReconciliationResult {
  trip_id: string;
  planned_distance_km: number;
  outbound_odometer: number;
  inbound_odometer: number;
  actual_distance_km: number;
  deviation_pct: number;
  threshold_exceeded: boolean;
  status: TripStatus;
  alert_raised: boolean;
}

export class ReconciliationService {
  /**
   * Reconciles a completed trip upon receiving an INBOUND gate transaction event.
   */
  public reconcileTrip(
    trip_id: string,
    inbound_odometer: number,
    inbound_fuel_pct: number,
    sentry_id: string
  ): ReconciliationResult | null {
    const trip = db.trips.get(trip_id);
    if (!trip) {
      return null;
    }

    const requisition = db.requisitions.get(trip.requisition_id);
    if (!requisition) {
      return null;
    }

    const vehicle = db.vehicles.get(trip.vehicle_id);

    // Fallback if outbound odometer was not previously captured
    const outbound_odometer = trip.outbound_odometer !== null
      ? trip.outbound_odometer
      : (vehicle ? vehicle.current_odometer : inbound_odometer);

    // Actual distance travelled = return_odometer - outbound_odometer
    const actual_distance_km = Math.max(0, inbound_odometer - outbound_odometer);
    const planned_km = requisition.planned_distance_km;

    // Calculate percentage deviation: ((actual - planned) / planned) * 100
    const deviation_pct = Number((((actual_distance_km - planned_km) / planned_km) * 100).toFixed(2));

    // Threshold rule check: actual distance > planned * 1.10
    const threshold_exceeded = actual_distance_km > (planned_km * (1 + DISTANCE_DEVIATION_THRESHOLD_PCT / 100));

    const final_status: TripStatus = threshold_exceeded ? 'COMPLETED_FLAGGED' : 'COMPLETED';

    // Update trip record
    trip.inbound_odometer = inbound_odometer;
    trip.actual_distance_km = actual_distance_km;
    trip.deviation_pct = deviation_pct;
    trip.status = final_status;
    trip.completed_at = new Date().toISOString();

    // Release vehicle back to AVAILABLE and update its odometer
    if (vehicle) {
      vehicle.status = 'AVAILABLE';
      vehicle.current_odometer = inbound_odometer;
      vehicle.updated_at = new Date().toISOString();
    }

    let alert_raised = false;

    // If deviation exceeds 10%, auto-raise AUDIT_ALERT for MTO review
    if (threshold_exceeded) {
      alert_raised = true;
      const severity = deviation_pct > 25.0 ? 'CRITICAL' : 'WARNING';
      const msg = `SORTIE AUDIT ANOMALY: Trip ${trip_id} logged ${actual_distance_km}km vs planned ${planned_km}km (+${deviation_pct}% deviation, exceeds ${DISTANCE_DEVIATION_THRESHOLD_PCT}% threshold). Vehicle: ${vehicle ? vehicle.registration_number : trip.vehicle_id}.`;

      db.raiseAlert('AUDIT_ALERT', msg, severity, trip_id);
    }

    // Append to cryptographic audit trail
    db.logAudit('trip', trip_id, threshold_exceeded ? 'TRIP_RECONCILED_FLAGGED' : 'TRIP_RECONCILED_OK', sentry_id, {
      planned_distance_km: planned_km,
      outbound_odometer,
      inbound_odometer,
      actual_distance_km,
      deviation_pct,
      threshold_pct: DISTANCE_DEVIATION_THRESHOLD_PCT,
      status: final_status
    });

    return {
      trip_id,
      planned_distance_km: planned_km,
      outbound_odometer,
      inbound_odometer,
      actual_distance_km,
      deviation_pct,
      threshold_exceeded,
      status: final_status,
      alert_raised
    };
  }
}

export const reconciliationService = new ReconciliationService();
