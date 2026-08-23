export type FlowDirection = 'OUTBOUND' | 'INBOUND';

export type KioskPhase =
  | 'READY'        // Awaiting scan
  | 'SCANNING'     // Reading RFID tag
  | 'SCAN_RESULT'  // Tag matched, showing trip details
  | 'VERIFY'       // Driver biometric/smart-card verification
  | 'RECORD'       // Odometer + fuel level entry
  | 'CONFIRM'      // Double-check confirmation before submission
  | 'RELEASE'      // Barrier animation
  | 'DENIED'       // Access denied state
  | 'OVERRIDE';    // Override-with-remarks flow

export interface ScanResult {
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
  scan_source?: string;
}

export interface GateStatusResponse {
  edge_id: string;
  is_online: boolean;
  is_seeded: boolean;
  pending_queue_count: number;
  last_sync_at: string;
}

export interface HandshakeResult {
  success: boolean;
  event_id: string;
  barrier_signal: 'RAISE' | 'RELEASE';
  direction: string;
  relay_status?: string;
}

export interface BarrierStatus {
  barrier_id: string;
  state: 'LOWERED' | 'RAISING' | 'OPEN' | 'LOWERING' | 'EMERGENCY_STOP' | 'HOLD_OPEN' | 'FAULT';
  relay_mode: 'MODBUS_TCP' | 'GPIO_RELAY';
  safety_loop_active: boolean;
  interlock_engaged: boolean;
  total_cycles: number;
  last_actuated_at: string;
  auto_close_timeout_sec: number;
}

export interface TimeSyncStatus {
  edge_id: string;
  hardware_time: string;
  stratum_source: string;
  clock_drift_ms: number;
  is_disciplined: boolean;
  max_tolerated_drift_sec: number;
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

