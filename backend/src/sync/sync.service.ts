// ============================================================================
// M-FTAMS — Synchronization Service (Section 8 Downlink & Uplink Handlers)
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import * as zlib from 'zlib';
import { db } from '../models/db';
import { GateTransaction } from '../models/types';
import { canonicalizeGateEvent, verifyConstantTime, signHmacSha256 } from '../pkg/crypto';
import { reconciliationService } from '../reconciliation/reconciliation.service';
import { CLOCK_SKEW_TOLERANCE_SECONDS } from '../pkg/constants';

export interface DownlinkSnapshot {
  snapshot_version: string;
  edge_id: string;
  generated_at: string;
  tokens: Array<{
    token_id: string;
    signature: string;
    trip_id: string;
    vehicle_id: string;
    driver_id: string;
    issued_at: string;
    valid_until: string;
    status: string;
  }>;
  vehicles: Array<{
    vehicle_id: string;
    registration: string;
    status: string;
    photo_hash: string;
  }>;
  drivers: Array<{
    driver_id: string;
    name: string;
    credential_hash: string;
    photo_hash: string;
    status: string;
  }>;
  revocations: Array<{
    token_id: string;
    revoked_at: string;
    reason_code: string;
  }>;
}

export interface UplinkBatch {
  edge_id: string;
  batch_id: string;
  generated_at: string;
  hardware_clock_at_generation: string;
  events: Array<{
    event_id: string;
    event_type: 'OUTBOUND' | 'INBOUND';
    trip_id: string;
    vehicle_id: string;
    driver_id: string;
    token_id: string;
    odometer_reading: number;
    fuel_level_pct: number;
    hardware_timestamp: string;
    sentry_id: string;
    event_signature: string;
    override_flag?: boolean;
    override_remarks?: string;
  }>;
}

export class SyncService {
  private edgeSecrets: Map<string, string> = new Map([
    ['GATE-04', 'mftams_edge_secret_GATE-04_99214710_auth'],
    ['MAIN', 'mftams_edge_secret_GATE-04_99214710_auth'],
    ['NORTH', 'mftams_edge_secret_NORTH_88192031_auth'],
    ['SOUTH', 'mftams_edge_secret_SOUTH_77382910_auth']
  ]);

  public setEdgeSecret(edge_id: string, secret: string) {
    this.edgeSecrets.set(edge_id, secret);
  }

  public getEdgeSecret(edge_id: string): string {
    return this.edgeSecrets.get(edge_id) || `mftams_edge_secret_${edge_id}_default`;
  }

  /**
   * Generates a full reference data snapshot for an edge terminal.
   */
  public generateDownlinkSnapshot(edge_id: string): DownlinkSnapshot {
    const generated_at = new Date().toISOString();
    const snapshot_version = `${generated_at}#${Math.floor(Math.random() * 90000 + 10000)}`;

    const tokens = Array.from(db.tokens.values()).map(t => ({
      token_id: t.token_id,
      signature: t.signature,
      trip_id: t.trip_id,
      vehicle_id: t.vehicle_id,
      driver_id: t.driver_id,
      issued_at: t.issued_at,
      valid_until: t.valid_until,
      status: t.status
    }));

    const vehicles = Array.from(db.vehicles.values()).map(v => ({
      vehicle_id: v.vehicle_id,
      registration: v.registration_number,
      status: v.status,
      photo_hash: v.photo_hash
    }));

    const drivers = Array.from(db.drivers.values()).map(d => ({
      driver_id: d.driver_id,
      name: d.full_name,
      credential_hash: d.credential_hash,
      photo_hash: d.photo_hash,
      status: d.status
    }));

    const revocations = Array.from(db.tokens.values())
      .filter(t => t.status === 'REVOKED' && t.revoked_at !== null)
      .map(t => ({
        token_id: t.token_id,
        revoked_at: t.revoked_at!,
        reason_code: t.revocation_reason || 'ADMIN_REVOCATION'
      }));

    // Update edge sync state
    let syncState = db.edgeSyncStates.get(edge_id);
    if (!syncState) {
      syncState = {
        edge_id,
        gate_id: Array.from(db.gates.keys())[0] || uuidv4(),
        last_downlink_at: generated_at,
        last_uplink_at: null,
        last_batch_id: null,
        clock_skew_seconds: 0,
        status: 'ONLINE'
      };
      db.edgeSyncStates.set(edge_id, syncState);
    } else {
      syncState.last_downlink_at = generated_at;
      syncState.status = 'ONLINE';
    }

    return {
      snapshot_version,
      edge_id,
      generated_at,
      tokens,
      vehicles,
      drivers,
      revocations
    };
  }

  /**
   * Ingests an uplink batch from an edge terminal.
   * Follows strict 5-step sequence:
   * 1. Signature validation
   * 2. Idempotency check
   * 3. Row insertion
   * 4. Reconciliation trigger
   * 5. Sync-state update & clock-skew detection
   */
  public ingestUplinkBatch(batch: UplinkBatch): {
    success: boolean;
    accepted_event_ids: string[];
    rejected_event_ids: string[];
    error?: string;
    status_code: number;
  } {
    const edgeSecret = this.getEdgeSecret(batch.edge_id);

    // ------------------------------------------------------------------------
    // Step 1: Signature Validation of EVERY Event in Batch
    // ------------------------------------------------------------------------
    for (const event of batch.events) {
      const canonicalBytes = canonicalizeGateEvent({
        event_id: event.event_id,
        edge_id: batch.edge_id,
        event_type: event.event_type,
        trip_id: event.trip_id,
        vehicle_id: event.vehicle_id,
        driver_id: event.driver_id,
        token_id: event.token_id,
        odometer_reading: event.odometer_reading,
        fuel_level_pct: event.fuel_level_pct,
        sentry_id: event.sentry_id,
        hardware_timestamp: event.hardware_timestamp
      });

      const expectedSig = signHmacSha256(edgeSecret, canonicalBytes);
      const isValid = verifyConstantTime(expectedSig, event.event_signature);

      if (!isValid) {
        // SECURITY VIOLATION: Reject ENTIRE batch immediately
        db.raiseAlert(
          'AUDIT_ALERT',
          `SECURITY INCIDENT: Invalid HMAC signature detected in uplink batch ${batch.batch_id} from edge ${batch.edge_id} on event ${event.event_id}. Entire batch rejected!`,
          'CRITICAL',
          event.event_id
        );

        db.logAudit('sync', batch.batch_id, 'UPLINK_SIGNATURE_VERIFICATION_FAILED', null, {
          edge_id: batch.edge_id,
          failed_event_id: event.event_id
        });

        return {
          success: false,
          accepted_event_ids: [],
          rejected_event_ids: batch.events.map(e => e.event_id),
          error: 'Signature validation failed for one or more events; entire batch rejected',
          status_code: 401
        };
      }
    }

    // ------------------------------------------------------------------------
    // Clock-Drift Detection
    // ------------------------------------------------------------------------
    const serverNow = Date.now();
    const edgeClockTime = new Date(batch.hardware_clock_at_generation).getTime();
    const clockSkewSeconds = Math.round((serverNow - edgeClockTime) / 1000);

    if (Math.abs(clockSkewSeconds) > CLOCK_SKEW_TOLERANCE_SECONDS) {
      db.raiseAlert(
        'CLOCK_SKEW_SUSPECTED',
        `CLOCK DRIFT WARNING: Edge terminal ${batch.edge_id} reported hardware clock delta of ${clockSkewSeconds}s (exceeds ${CLOCK_SKEW_TOLERANCE_SECONDS}s tolerance). LWW comparisons flagged.`,
        'WARNING',
        batch.batch_id
      );
    }

    const accepted_event_ids: string[] = [];
    const rejected_event_ids: string[] = [];

    // ------------------------------------------------------------------------
    // Step 2 & 3: Idempotency Check & Transaction Row Insertion
    // ------------------------------------------------------------------------
    for (const event of batch.events) {
      if (db.gateTransactions.has(event.event_id)) {
        // Already ingested from earlier partial sync — acknowledge as no-op
        accepted_event_ids.push(event.event_id);
        continue;
      }

      const txRecord: GateTransaction = {
        event_id: event.event_id,
        edge_id: batch.edge_id,
        event_type: event.event_type,
        trip_id: event.trip_id,
        vehicle_id: event.vehicle_id,
        driver_id: event.driver_id,
        token_id: event.token_id,
        odometer_reading: event.odometer_reading,
        fuel_level_pct: event.fuel_level_pct,
        sentry_id: event.sentry_id,
        event_time: new Date(event.hardware_timestamp).toISOString(),
        ingested_at: new Date().toISOString(),
        override_flag: !!event.override_flag,
        override_remarks: event.override_remarks || null,
        signature: event.event_signature
      };

      db.gateTransactions.set(event.event_id, txRecord);
      accepted_event_ids.push(event.event_id);

      // ----------------------------------------------------------------------
      // Step 4: State Machine Transition & Reconciliation Trigger
      // ----------------------------------------------------------------------
      const vehicle = db.vehicles.get(event.vehicle_id);
      const trip = db.trips.get(event.trip_id);
      const token = db.tokens.get(event.token_id);

      if (event.event_type === 'OUTBOUND') {
        if (vehicle) {
          vehicle.status = 'ON_SORTIE';
          vehicle.current_odometer = event.odometer_reading;
          vehicle.updated_at = new Date().toISOString();
        }
        if (trip) {
          trip.status = 'ON_SORTIE';
          trip.outbound_odometer = event.odometer_reading;
        }
        if (token) {
          token.status = 'CONSUMED';
        }

        db.logAudit('gate_transaction', event.event_id, 'GATE_OUTBOUND_INGESTED', event.sentry_id, {
          edge_id: batch.edge_id,
          trip_id: event.trip_id,
          vehicle_id: event.vehicle_id,
          odometer: event.odometer_reading
        });
      } else if (event.event_type === 'INBOUND') {
        // Trigger Reconciliation Service immediately
        reconciliationService.reconcileTrip(
          event.trip_id,
          event.odometer_reading,
          event.fuel_level_pct,
          event.sentry_id
        );

        db.logAudit('gate_transaction', event.event_id, 'GATE_INBOUND_INGESTED', event.sentry_id, {
          edge_id: batch.edge_id,
          trip_id: event.trip_id,
          vehicle_id: event.vehicle_id,
          odometer: event.odometer_reading
        });
      }

      // If override flag was present, log separate audit alert
      if (event.override_flag) {
        db.raiseAlert(
          'AUDIT_ALERT',
          `SENTRY GATE OVERRIDE: Sentry ${event.sentry_id} at ${batch.edge_id} executed override: "${event.override_remarks}". Event ID: ${event.event_id}`,
          'WARNING',
          event.event_id
        );
      }
    }

    // ------------------------------------------------------------------------
    // Step 5: Update Edge Sync State
    // ------------------------------------------------------------------------
    let syncState = db.edgeSyncStates.get(batch.edge_id);
    if (!syncState) {
      syncState = {
        edge_id: batch.edge_id,
        gate_id: Array.from(db.gates.keys())[0] || uuidv4(),
        last_downlink_at: null,
        last_uplink_at: new Date().toISOString(),
        last_batch_id: batch.batch_id,
        clock_skew_seconds: clockSkewSeconds,
        status: 'ONLINE'
      };
      db.edgeSyncStates.set(batch.edge_id, syncState);
    } else {
      syncState.last_uplink_at = new Date().toISOString();
      syncState.last_batch_id = batch.batch_id;
      syncState.clock_skew_seconds = clockSkewSeconds;
      syncState.status = 'ONLINE';
    }

    return {
      success: true,
      accepted_event_ids,
      rejected_event_ids,
      status_code: 200
    };
  }
}

export const syncService = new SyncService();
