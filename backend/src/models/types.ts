// ============================================================================
// M-FTAMS — Domain Models & Type Definitions
// ============================================================================

export type UserRole = 'ADMIN' | 'MTO' | 'COMMANDER' | 'SENTRY' | 'DRIVER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export type VehicleStatus = 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'ON_SORTIE' | 'MAINTENANCE';
export type DriverStatus = 'ACTIVE' | 'SUSPENDED';

export type RequisitionStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TripStatus = 'DISPATCHED' | 'ON_SORTIE' | 'COMPLETED' | 'COMPLETED_FLAGGED';
export type TokenStatus = 'ACTIVE' | 'CONSUMED' | 'REVOKED' | 'EXPIRED';

export type GateEventType = 'OUTBOUND' | 'INBOUND';
export type AlertType = 'OVERDUE_VEHICLE' | 'SYNC_FAILURE' | 'EDGE_OUTAGE' | 'AUDIT_ALERT' | 'SYNC_CONFLICT' | 'CLOCK_SKEW_SUSPECTED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type EdgeStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';

export interface Unit {
  unit_id: string;
  unit_name: string;
  parent_formation: string;
  cantonment_zone: string;
  created_at: string;
}

export interface Gate {
  gate_id: string;
  gate_identifier: string;
  location_description: string;
  created_at: string;
}

export interface User {
  user_id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  assigned_gate_id: string | null;
  status: UserStatus;
  created_at: string;
  last_login_at: string | null;
}

export interface RoleChangeLog {
  log_id: string;
  user_id: string;
  changed_by: string;
  previous_role: UserRole;
  new_role: UserRole;
  changed_at: string;
  signature: string;
}

export interface Vehicle {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  status: VehicleStatus;
  photo_hash: string;
  current_odometer: number;
  rfid_tag_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  driver_id: string;
  service_number: string;
  full_name: string;
  credential_hash: string;
  photo_hash: string;
  smart_card_id?: string;
  status: DriverStatus;
  created_at: string;
}

export interface Requisition {
  requisition_id: string;
  unit_id: string;
  destination: string;
  purpose: string;
  planned_distance_km: number;
  requested_departure: string;
  expected_return: string;
  status: RequisitionStatus;
  reviewed_by: string | null;
  review_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface GatePassToken {
  token_id: string;
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  issued_by: string;
  issued_at: string;
  valid_until: string;
  status: TokenStatus;
  signature: string;
  revoked_by: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface Trip {
  trip_id: string;
  requisition_id: string;
  vehicle_id: string;
  driver_id: string;
  token_id: string;
  status: TripStatus;
  outbound_odometer: number | null;
  inbound_odometer: number | null;
  actual_distance_km: number | null;
  deviation_pct: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface GateTransaction {
  event_id: string;
  edge_id: string;
  event_type: GateEventType;
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  token_id: string;
  odometer_reading: number;
  fuel_level_pct: number;
  sentry_id: string;
  event_time: string;
  ingested_at: string;
  override_flag: boolean;
  override_remarks: string | null;
  signature: string;
}

export interface AuditLog {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, any>;
  previous_signature: string | null;
  signature: string;
  recorded_at: string;
}

export interface Alert {
  alert_id: string;
  alert_type: AlertType;
  related_entity_id: string | null;
  severity: AlertSeverity;
  message: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  raised_at: string;
}

export interface EdgeSyncState {
  edge_id: string;
  gate_id: string;
  last_downlink_at: string | null;
  last_uplink_at: string | null;
  last_batch_id: string | null;
  clock_skew_seconds: number | null;
  status: EdgeStatus;
}

export interface GatePassChit {
  chit_number: string;
  token_id: string;
  trip_id: string;
  requisition_id: string;
  unit_name: string;
  destination: string;
  purpose: string;
  planned_distance_km: number;
  vehicle_registration: string;
  vehicle_type: string;
  driver_service_number: string;
  driver_name: string;
  authorized_departure: string;
  expected_return: string;
  issued_by_name: string;
  issued_at: string;
  valid_until: string;
  token_signature: string;
  qr_payload: string;
}

export interface TimeSyncStatus {
  server_time: string;
  stratum_level: number;
  ntp_source: string;
  clock_drift_ms: number;
  is_synchronized: boolean;
  max_tolerated_drift_seconds: number;
}

export interface SecuritySystemStatus {
  pki_ca_type: string;
  ca_common_name: string;
  ca_status: string;
  cert_valid_until: string;
  mtls_enforced: boolean;
  active_cipher_suite: string;
  hmac_key_id: string;
  hmac_algorithm: string;
  audit_chain_length: number;
  audit_chain_valid: boolean;
}

export interface BarrierStatus {
  barrier_id: string;
  state: 'LOWERED' | 'RAISING' | 'OPEN' | 'LOWERING' | 'EMERGENCY_STOP' | 'HOLD_OPEN' | 'FAULT';
  relay_mode: 'MODBUS_TCP' | 'GPIO_RELAY';
  safety_loop_active: boolean;
  interlock_engaged: boolean;
  total_cycles: number;
  last_actuated_at: string;
}

