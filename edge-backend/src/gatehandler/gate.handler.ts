// ============================================================================
// M-FTAMS Edge — Gate Handler (Scan, Verify, Record, Release <500ms Offline)
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { localCacheManager } from '../cache/cache.manager';
import { offlineEventQueue } from '../queue/offline.queue';
import { canonicalizeGateEvent, signHmacSha256, verifyConstantTime } from '../pkg/crypto';
import { edgeDb, PendingEvent } from '../db/sqlite';
import { barrierRelayController } from '../barrier/relay.controller';

export class GateHandler {
  private edgeId: string;
  private edgeSecret: string;

  constructor(
    edgeId: string = 'GATE-04',
    edgeSecret: string = 'mftams_edge_secret_GATE-04_99214710_auth'
  ) {
    this.edgeId = edgeId;
    this.edgeSecret = edgeSecret;
  }

  public setConfig(edgeId: string, edgeSecret: string) {
    this.edgeId = edgeId;
    this.edgeSecret = edgeSecret;
  }

  /**
   * Step 1: Scan RFID / QR Tag against local SQLite cache (<500ms).
   * Supports RFID serials (e.g. RFID-A17E9C), Registration numbers, or QR JSON payloads.
   */
  public scanTag(tag_id: string): {
    token_id: string;
    trip_id: string;
    vehicle_id: string;
    driver_id: string;
    status: string;
    registration_number: string;
    vehicle_type: string;
    driver_name: string;
    driver_photo_hash: string;
    vehicle_photo_hash: string;
    current_odometer: number;
    scan_source: string;
  } | { error: string; code: number } {
    // 1. Fail-closed check if unseeded
    if (!localCacheManager.isReadyForGateOperations()) {
      return {
        error: 'Edge terminal is not initialized. Initial central downlink sync required before gate operations.',
        code: 503
      };
    }

    let parsedTag = tag_id.trim();
    let scanSource = 'RFID_TAG';

    // Check if optical QR payload (JSON structure)
    if (parsedTag.startsWith('{') && parsedTag.endsWith('}')) {
      try {
        const qrJson = JSON.parse(parsedTag);
        scanSource = 'QR_CODE';
        if (qrJson.t_id) {
          const directToken = localCacheManager.getToken(qrJson.t_id);
          if (directToken) {
            const vehicle = localCacheManager.getVehicle(directToken.vehicle_id);
            const driver = localCacheManager.getDriver(directToken.driver_id);
            if (vehicle) {
              return {
                token_id: directToken.token_id,
                trip_id: directToken.trip_id,
                vehicle_id: directToken.vehicle_id,
                driver_id: directToken.driver_id,
                status: directToken.status,
                registration_number: vehicle.registration_number,
                vehicle_type: vehicle.vehicle_type,
                driver_name: driver ? driver.full_name : 'Unknown Driver',
                driver_photo_hash: driver ? driver.photo_hash : '',
                vehicle_photo_hash: vehicle.photo_hash,
                current_odometer: vehicle.current_odometer,
                scan_source: scanSource
              };
            }
          }
        }
        if (qrJson.v_reg) {
          parsedTag = qrJson.v_reg;
        }
      } catch (err) {
        // Fall back to raw string lookup
      }
    }

    // 2. Look up vehicle by RFID tag or registration
    const vehicle = localCacheManager.getVehicleByRfid(parsedTag) || localCacheManager.getVehicle(parsedTag);
    if (!vehicle) {
      return { error: 'No vehicle record found for scanned tag ID in local cache', code: 404 };
    }

    // 3. Find matching token for this vehicle
    const token = Array.from(edgeDb.tokens.values()).find(
      t => t.vehicle_id === vehicle.vehicle_id && (t.status === 'ACTIVE' || (vehicle.status === 'ON_SORTIE' && t.status === 'CONSUMED'))
    );

    if (!token) {
      return { error: 'No active gate-pass token found for this vehicle', code: 404 };
    }

    // Check blacklist
    if (localCacheManager.isTokenRevoked(token.token_id) || token.status === 'REVOKED') {
      return { error: 'Gate-pass token has been REVOKED. Access Denied.', code: 403 };
    }

    // Check expiry
    const now = new Date().toISOString();
    if (now > token.valid_until) {
      return { error: `Gate-pass token EXPIRED on ${token.valid_until}. Access Denied.`, code: 403 };
    }

    const driver = localCacheManager.getDriver(token.driver_id);

    return {
      token_id: token.token_id,
      trip_id: token.trip_id,
      vehicle_id: token.vehicle_id,
      driver_id: token.driver_id,
      status: token.status,
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      driver_name: driver ? driver.full_name : 'Unknown Driver',
      driver_photo_hash: driver ? driver.photo_hash : '',
      vehicle_photo_hash: vehicle.photo_hash,
      current_odometer: vehicle.current_odometer,
      scan_source: scanSource
    };
  }

  /**
   * Step 2: Verify driver credentials (SourceAFIS/libfprint biometric match or PC/SC Smart-Card).
   */
  public verifyDriver(
    token_id: string,
    driver_id: string,
    verification_method: 'FINGERPRINT' | 'SMART_CARD' | 'SMART_CARD_PIN',
    result: boolean,
    matchScore: number = 94
  ): { success: boolean; error?: string; code?: number; match_score?: number; verification_method?: string } {
    const token = localCacheManager.getToken(token_id);
    if (!token) {
      return { success: false, error: 'Token not found in local cache', code: 404 };
    }

    if (token.driver_id !== driver_id) {
      return { success: false, error: 'Driver / Token binding mismatch. Access Denied.', code: 400 };
    }

    if (!result) {
      return {
        success: false,
        error: `Driver identity verification failed via ${verification_method} (Score: ${matchScore}% vs 85% required threshold).`,
        code: 403,
        match_score: matchScore,
        verification_method
      };
    }

    return {
      success: true,
      match_score: matchScore,
      verification_method
    };
  }

  /**
   * Step 3 & 4: Record handshake in local durable queue and actuate hardware boom barrier (<500ms).
   */
  public executeHandshake(params: {
    token_id: string;
    event_type: 'OUTBOUND' | 'INBOUND';
    odometer_reading: number;
    fuel_level_pct: number;
    sentry_id: string;
    override_flag?: boolean;
    override_remarks?: string;
  }): {
    success: boolean;
    event_id: string;
    barrier_signal: 'RAISE' | 'RELEASE';
    direction: string;
    hardware_timestamp: string;
    relay_status: string;
    error?: string;
    code?: number;
  } {
    const hardware_timestamp = new Date().toISOString();
    const token = localCacheManager.getToken(params.token_id);
    if (!token && !params.override_flag) {
      return { success: false, event_id: '', barrier_signal: 'RELEASE', direction: '', hardware_timestamp, relay_status: 'LOWERED', error: 'Token not found in local cache', code: 404 };
    }

    const event_id = uuidv4();
    const override_flag = params.override_flag ? 1 : 0;
    const override_remarks = params.override_remarks || null;

    if (params.override_flag && (!params.override_remarks || params.override_remarks.trim() === '')) {
      return { success: false, event_id: '', barrier_signal: 'RELEASE', direction: '', hardware_timestamp, relay_status: 'LOWERED', error: 'Override remarks are mandatory for sentry overrides', code: 400 };
    }

    const vehicleId = token ? token.vehicle_id : 'OVERRIDE_VEHICLE';
    const driverId = token ? token.driver_id : 'OVERRIDE_DRIVER';
    const tripId = token ? token.trip_id : 'OVERRIDE_TRIP';

    // Canonicalize and sign event at the moment of local write
    const canonicalBytes = canonicalizeGateEvent({
      event_id,
      edge_id: this.edgeId,
      event_type: params.event_type,
      trip_id: tripId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      token_id: params.token_id,
      odometer_reading: params.odometer_reading,
      fuel_level_pct: params.fuel_level_pct,
      sentry_id: params.sentry_id,
      hardware_timestamp
    });

    const signature = signHmacSha256(this.edgeSecret, canonicalBytes);

    const pendingEvent: PendingEvent = {
      event_id,
      event_type: params.event_type,
      trip_id: tripId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      token_id: params.token_id,
      odometer_reading: params.odometer_reading,
      fuel_level_pct: params.fuel_level_pct,
      sentry_id: params.sentry_id,
      hardware_timestamp,
      override_flag,
      override_remarks,
      signature,
      sync_status: 'PENDING',
      created_at: hardware_timestamp
    };

    // Durably write to offline SQLite queue
    const queued = offlineEventQueue.enqueue(pendingEvent);
    if (!queued) {
      return { success: false, event_id: '', barrier_signal: 'RELEASE', direction: '', hardware_timestamp, relay_status: 'FAULT', error: 'Failed to write event to durable SQLite queue', code: 500 };
    }

    // Transition local vehicle state
    const vehicle = localCacheManager.getVehicle(vehicleId);
    if (vehicle) {
      if (params.event_type === 'OUTBOUND') {
        vehicle.status = 'ON_SORTIE';
      } else {
        vehicle.status = 'AVAILABLE';
      }
      vehicle.current_odometer = params.odometer_reading;
    }

    // Transition local token state
    if (token && params.event_type === 'OUTBOUND') {
      token.status = 'CONSUMED';
    }

    // Actuate physical boom-barrier / Modbus relay
    const relayActuation = barrierRelayController.triggerRaise(`HANDSHAKE_${params.event_type}_${vehicle?.registration_number || vehicleId}`);

    return {
      success: true,
      event_id,
      barrier_signal: 'RAISE',
      direction: params.event_type,
      hardware_timestamp,
      relay_status: relayActuation.state
    };
  }
}

export const gateHandler = new GateHandler();

