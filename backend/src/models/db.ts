// ============================================================================
// M-FTAMS — Central Database Repository & In-Memory Storage Engine
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import {
  User, Unit, Gate, Vehicle, Driver, Requisition, Trip,
  GatePassToken, GateTransaction, AuditLog, Alert, EdgeSyncState, RoleChangeLog
} from './types';
import { signAuditEntry, sha256Hash } from '../pkg/crypto';

export class CentralDatabase {
  private hmacKey: string;

  public units: Map<string, Unit> = new Map();
  public gates: Map<string, Gate> = new Map();
  public users: Map<string, User> = new Map();
  public roleChangeLogs: RoleChangeLog[] = [];
  public vehicles: Map<string, Vehicle> = new Map();
  public drivers: Map<string, Driver> = new Map();
  public requisitions: Map<string, Requisition> = new Map();
  public trips: Map<string, Trip> = new Map();
  public tokens: Map<string, GatePassToken> = new Map();
  public gateTransactions: Map<string, GateTransaction> = new Map();
  public auditLogs: AuditLog[] = [];
  public alerts: Map<string, Alert> = new Map();
  public edgeSyncStates: Map<string, EdgeSyncState> = new Map();

  private lastAuditSignature: string | null = null;

  constructor(hmacKey: string = 'mftams_central_hmac_master_key_99482715_cantonment') {
    this.hmacKey = hmacKey;
    this.seedDefaultData();
  }

  public setHmacKey(key: string) {
    this.hmacKey = key;
  }

  public getHmacKey(): string {
    return this.hmacKey;
  }

  /**
   * Appends an audit log entry to the cryptographic hash chain.
   */
  public logAudit(
    entity_type: string,
    entity_id: string,
    action: string,
    actor_id: string | null,
    details: Record<string, any>
  ): AuditLog {
    const audit_id = uuidv4();
    const recorded_at = new Date().toISOString();
    const previous_signature = this.lastAuditSignature;

    const entryToSign = {
      audit_id,
      entity_type,
      entity_id,
      action,
      actor_id,
      details,
      previous_signature,
      recorded_at
    };

    const signature = signAuditEntry(this.hmacKey, entryToSign);

    const logEntry: AuditLog = {
      ...entryToSign,
      signature
    };

    this.auditLogs.push(logEntry);
    this.lastAuditSignature = signature;
    return logEntry;
  }

  public alertListeners: Array<(alert: Alert) => void> = [];

  public onAlert(listener: (alert: Alert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== listener);
    };
  }

  /**
   * Raises a system alert and notifies local subscribers (SSE/ntfy).
   */
  public raiseAlert(
    alert_type: Alert['alert_type'],
    message: string,
    severity: Alert['severity'],
    related_entity_id: string | null = null
  ): Alert {
    const alert_id = uuidv4();
    const alert: Alert = {
      alert_id,
      alert_type,
      related_entity_id,
      severity,
      message,
      acknowledged_by: null,
      acknowledged_at: null,
      raised_at: new Date().toISOString()
    };
    this.alerts.set(alert_id, alert);
    this.logAudit('alert', alert_id, `ALERT_RAISED_${alert_type}`, null, { message, severity });

    // Notify active listeners (SSE streams, local webhook relays)
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch (err) {
        // Suppress listener error to prevent blocking
      }
    }

    return alert;
  }

  /**
   * Generates a printable military gate-pass chit data model with canonical QR payload.
   */
  public generateChit(tokenId: string) {
    const token = this.tokens.get(tokenId);
    if (!token) return null;

    const trip = this.trips.get(token.trip_id);
    if (!trip) return null;

    const requisition = this.requisitions.get(trip.requisition_id);
    const vehicle = this.vehicles.get(token.vehicle_id);
    const driver = this.drivers.get(token.driver_id);
    const unit = requisition ? this.units.get(requisition.unit_id) : undefined;
    const issuer = this.users.get(token.issued_by);

    const qrPayload = JSON.stringify({
      t_id: token.token_id,
      trip: trip.trip_id,
      v_reg: vehicle ? vehicle.registration_number : 'UNKNOWN',
      d_srv: driver ? driver.service_number : 'UNKNOWN',
      exp: token.valid_until,
      sig: token.signature.substring(0, 16)
    });

    return {
      chit_number: `CHIT-${token.token_id.substring(0, 8).toUpperCase()}`,
      token_id: token.token_id,
      trip_id: trip.trip_id,
      requisition_id: trip.requisition_id,
      unit_name: unit ? unit.unit_name : 'HQ Formation Platoon',
      destination: requisition ? requisition.destination : 'Operational Sector',
      purpose: requisition ? requisition.purpose : 'Official Military Duty',
      planned_distance_km: requisition ? requisition.planned_distance_km : 0,
      vehicle_registration: vehicle ? vehicle.registration_number : 'UNKNOWN',
      vehicle_type: vehicle ? vehicle.vehicle_type : 'Standard Transport',
      driver_service_number: driver ? driver.service_number : 'UNKNOWN',
      driver_name: driver ? driver.full_name : 'Unknown Driver',
      authorized_departure: requisition ? requisition.requested_departure : token.issued_at,
      expected_return: requisition ? requisition.expected_return : token.valid_until,
      issued_by_name: issuer ? issuer.full_name : 'Movement Control Officer',
      issued_at: token.issued_at,
      valid_until: token.valid_until,
      token_signature: token.signature,
      qr_payload: qrPayload
    };
  }

  /**
   * Seeds initial organizational and security data for Cantonment operations.
   */
  private seedDefaultData() {
    // 1. Units
    const unit1Id = 'u1111111-1111-1111-1111-111111111111';
    const unit2Id = 'u2222222-2222-2222-2222-222222222222';
    const unit3Id = 'u3333333-3333-3333-3333-333333333333';

    this.units.set(unit1Id, {
      unit_id: unit1Id,
      unit_name: '4 RAJPUT (Alpha Coy)',
      parent_formation: '12 Infantry Brigade',
      cantonment_zone: 'Sector 4',
      created_at: new Date().toISOString()
    });
    this.units.set(unit2Id, {
      unit_id: unit2Id,
      unit_name: '7 SIKH LI (Bravo Coy)',
      parent_formation: '12 Infantry Brigade',
      cantonment_zone: 'Sector 2',
      created_at: new Date().toISOString()
    });
    this.units.set(unit3Id, {
      unit_id: unit3Id,
      unit_name: 'HQ 12 Inf Bde (Transport Platoon)',
      parent_formation: '12 Infantry Brigade',
      cantonment_zone: 'HQ Complex',
      created_at: new Date().toISOString()
    });

    // 2. Gates
    const gateMainId = 'g1111111-1111-1111-1111-111111111111';
    const gateNorthId = 'g2222222-2222-2222-2222-222222222222';
    const gateSouthId = 'g3333333-3333-3333-3333-333333333333';

    this.gates.set(gateMainId, {
      gate_id: gateMainId,
      gate_identifier: 'MAIN',
      location_description: 'Cantonment Main Outbound Gate (Highway Access)',
      created_at: new Date().toISOString()
    });
    this.gates.set(gateNorthId, {
      gate_id: gateNorthId,
      gate_identifier: 'NORTH',
      location_description: 'Northern Perimeter Logistics Gate',
      created_at: new Date().toISOString()
    });
    this.gates.set(gateSouthId, {
      gate_id: gateSouthId,
      gate_identifier: 'SOUTH',
      location_description: 'Southern Firing Range Access Gate',
      created_at: new Date().toISOString()
    });

    // 3. Default Users (Pass: password123)
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('password123', salt);

    const adminUser: User = {
      user_id: '10000000-0000-0000-0000-000000000001',
      username: 'admin',
      password_hash: defaultPasswordHash,
      role: 'ADMIN',
      full_name: 'Maj. Vikramaditya (Admin Officer)',
      assigned_gate_id: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_login_at: null
    };

    const mtoUser: User = {
      user_id: '10000000-0000-0000-0000-000000000002',
      username: 'mto',
      password_hash: defaultPasswordHash,
      role: 'MTO',
      full_name: 'Capt. Arjun Mehra (Movement Control Officer)',
      assigned_gate_id: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_login_at: null
    };

    const commanderUser: User = {
      user_id: '10000000-0000-0000-0000-000000000003',
      username: 'commander',
      password_hash: defaultPasswordHash,
      role: 'COMMANDER',
      full_name: 'Brig. K.S. Rathore (Station Commander)',
      assigned_gate_id: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_login_at: null
    };

    const sentryUser: User = {
      user_id: '10000000-0000-0000-0000-000000000004',
      username: 'sentry_main',
      password_hash: defaultPasswordHash,
      role: 'SENTRY',
      full_name: 'Hav. Digvijay Singh (Gate Duty Officer)',
      assigned_gate_id: gateMainId,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_login_at: null
    };

    const driverUser: User = {
      user_id: '10000000-0000-0000-0000-000000000005',
      username: 'driver_rakesh',
      password_hash: defaultPasswordHash,
      role: 'DRIVER',
      full_name: 'Nb Sub Rakesh Yadav',
      assigned_gate_id: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_login_at: null
    };

    this.users.set(adminUser.user_id, adminUser);
    this.users.set(mtoUser.user_id, mtoUser);
    this.users.set(commanderUser.user_id, commanderUser);
    this.users.set(sentryUser.user_id, sentryUser);
    this.users.set(driverUser.user_id, driverUser);

    // 4. Vehicles
    const v1: Vehicle = {
      vehicle_id: 'v1111111-1111-1111-1111-111111111111',
      registration_number: '25A-4471',
      vehicle_type: 'SUV (Gypsy 4x4)',
      status: 'AVAILABLE',
      photo_hash: sha256Hash('photo_ref_gypsy_25A4471'),
      current_odometer: 18420,
      rfid_tag_id: 'RFID-A17E9C',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const v2: Vehicle = {
      vehicle_id: 'v2222222-2222-2222-2222-222222222222',
      registration_number: '25B-1129',
      vehicle_type: 'Truck (2.5T Stallion)',
      status: 'AVAILABLE',
      photo_hash: sha256Hash('photo_ref_truck_25B1129'),
      current_odometer: 52130,
      rfid_tag_id: 'RFID-B22F41',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const v3: Vehicle = {
      vehicle_id: 'v3333333-3333-3333-3333-333333333333',
      registration_number: '25A-8802',
      vehicle_type: 'Bus (Personnel Carrier 32-Seater)',
      status: 'AVAILABLE',
      photo_hash: sha256Hash('photo_ref_bus_25A8802'),
      current_odometer: 9110,
      rfid_tag_id: 'RFID-C90A17',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const v4: Vehicle = {
      vehicle_id: 'v4444444-4444-4444-4444-444444444444',
      registration_number: '25C-3305',
      vehicle_type: 'Light Recovery Vehicle',
      status: 'MAINTENANCE',
      photo_hash: sha256Hash('photo_ref_lrv_25C3305'),
      current_odometer: 31005,
      rfid_tag_id: 'RFID-D45B62',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.vehicles.set(v1.vehicle_id, v1);
    this.vehicles.set(v2.vehicle_id, v2);
    this.vehicles.set(v3.vehicle_id, v3);
    this.vehicles.set(v4.vehicle_id, v4);

    // 5. Drivers
    const d1: Driver = {
      driver_id: 'd1111111-1111-1111-1111-111111111111',
      service_number: 'JC-482910M',
      full_name: 'Nb Sub Rakesh Yadav',
      credential_hash: sha256Hash('bio_template_rakesh_yadav_jc482910m'),
      photo_hash: sha256Hash('photo_driver_rakesh_yadav'),
      smart_card_id: 'SC-2291',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    const d2: Driver = {
      driver_id: 'd2222222-2222-2222-2222-222222222222',
      service_number: '14820194P',
      full_name: 'Hav Suresh Pillai',
      credential_hash: sha256Hash('bio_template_suresh_pillai_14820194p'),
      photo_hash: sha256Hash('photo_driver_suresh_pillai'),
      smart_card_id: 'SC-2304',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    const d3: Driver = {
      driver_id: 'd3333333-3333-3333-3333-333333333333',
      service_number: '15910283K',
      full_name: 'Nk Vikram Thapa',
      credential_hash: sha256Hash('bio_template_vikram_thapa_15910283k'),
      photo_hash: sha256Hash('photo_driver_vikram_thapa'),
      smart_card_id: 'SC-2318',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    this.drivers.set(d1.driver_id, d1);
    this.drivers.set(d2.driver_id, d2);
    this.drivers.set(d3.driver_id, d3);

    // 6. Edge Sync States
    this.edgeSyncStates.set('GATE-04', {
      edge_id: 'GATE-04',
      gate_id: gateMainId,
      last_downlink_at: null,
      last_uplink_at: null,
      last_batch_id: null,
      clock_skew_seconds: 0,
      status: 'ONLINE'
    });

    // Genesis audit log entry
    this.logAudit('system', '00000000-0000-0000-0000-000000000000', 'SYSTEM_INITIALIZED', null, {
      version: '1.0.0',
      environment: 'cantonment_on_premise'
    });
  }
}

export const db = new CentralDatabase();
