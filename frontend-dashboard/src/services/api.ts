// ============================================================================
// M-FTAMS Dashboard — Central Server API Client & Role Token Manager
// ============================================================================

function resolveApiBase(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (!envUrl) {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      // If deployed on standard cloud ports (80/443 or Render domain)
      if (!window.location.port || window.location.port === '80' || window.location.port === '443' || window.location.hostname.includes('.onrender.com')) {
        return `${window.location.origin}/api/v1`;
      }
    }
    return 'http://localhost:8080/api/v1';
  }
  let url = String(envUrl).trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  if (!url.endsWith('/api/v1')) {
    url = url.replace(/\/+$/, '') + '/api/v1';
  }
  return url;
}

const API_BASE = resolveApiBase();

export type UserRole = 'ADMIN' | 'MTO' | 'COMMANDER' | 'SENTRY' | 'DRIVER';

export interface FleetStats {
  total_vehicles: number;
  available_vehicles: number;
  on_sortie_vehicles: number;
  reserved_vehicles: number;
  maintenance_vehicles: number;
  pending_requisitions: number;
  overdue_or_flagged_trips: number;
  unacknowledged_alerts: number;
}

export interface ActiveSortie {
  trip_id: string;
  requisition_id: string;
  status: string;
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  driver_id: string;
  driver_name: string;
  destination: string;
  purpose: string;
  planned_distance_km: number;
  outbound_odometer: number | null;
  departed_at: string;
  expected_return: string;
  elapsed_minutes: number;
  remaining_minutes: number;
  is_overdue: boolean;
  token_id: string;
  token_valid_until: string | null;
}

export interface RequisitionItem {
  requisition_id: string;
  unit_id: string;
  destination: string;
  purpose: string;
  planned_distance_km: number;
  requested_departure: string;
  expected_return: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  reviewed_by: string | null;
  review_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface VehicleItem {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  status: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'ON_SORTIE' | 'MAINTENANCE';
  photo_hash: string;
  current_odometer: number;
  rfid_tag_id?: string;
  active_driver?: string | null;
  active_destination?: string | null;
  updated_at: string;
}

export interface DriverItem {
  driver_id: string;
  service_number: string;
  full_name: string;
  credential_hash: string;
  photo_hash: string;
  smart_card_id?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface AlertItem {
  alert_id: string;
  alert_type: string;
  related_entity_id: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  raised_at: string;
}

export interface AuditLogItem {
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

class ApiService {
  private token: string | null = null;
  private currentRole: UserRole = 'COMMANDER';

  public setAuth(token: string, role: UserRole) {
    this.token = token;
    this.currentRole = role;
  }

  public getRole(): UserRole {
    return this.currentRole;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // --- Auth ---
  async login(username: string, password: string = 'password123') {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    this.setAuth(data.access_token, data.role);
    return data;
  }

  // --- Fleet ---
  async getFleetStats(): Promise<FleetStats> {
    const res = await fetch(`${API_BASE}/fleet/stats`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch fleet stats');
    return res.json();
  }

  async getVehicles(): Promise<VehicleItem[]> {
    const res = await fetch(`${API_BASE}/fleet/status`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  }

  async getDrivers(): Promise<DriverItem[]> {
    const res = await fetch(`${API_BASE}/drivers`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch drivers');
    return res.json();
  }

  async getActiveSorties(): Promise<ActiveSortie[]> {
    const res = await fetch(`${API_BASE}/fleet/active-sorties`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch active sorties');
    return res.json();
  }

  // --- Requisitions & Approvals ---
  async getRequisitions(status?: string): Promise<RequisitionItem[]> {
    const url = `${API_BASE}/requisitions${status ? `?status=${status}` : ''}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch requisitions');
    return res.json();
  }

  async submitRequisition(payload: {
    destination: string;
    purpose: string;
    planned_distance_km: number;
    requested_departure: string;
    expected_return: string;
  }): Promise<RequisitionItem> {
    const res = await fetch(`${API_BASE}/requisitions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Requisition submission failed');
    }
    return res.json();
  }

  async approveRequisition(requisition_id: string, vehicle_id: string, driver_id: string) {
    const res = await fetch(`${API_BASE}/requisitions/${requisition_id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ vehicle_id, driver_id })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Approval failed');
    }
    return res.json();
  }

  async rejectRequisition(requisition_id: string, reason: string) {
    const res = await fetch(`${API_BASE}/requisitions/${requisition_id}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Rejection failed');
    }
    return res.json();
  }

  async revokeToken(token_id: string, reason: string) {
    const res = await fetch(`${API_BASE}/tokens/${token_id}/revoke`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Revocation failed');
    }
    return res.json();
  }

  async getGatePassChit(token_id: string): Promise<GatePassChit> {
    const res = await fetch(`${API_BASE}/tokens/${token_id}/chit`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate gate pass chit');
    return res.json();
  }

  // --- Alerts ---
  async getAlerts(severity?: string): Promise<AlertItem[]> {
    const url = `${API_BASE}/alerts${severity ? `?severity=${severity}` : ''}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  }

  async acknowledgeAlert(alert_id: string) {
    const res = await fetch(`${API_BASE}/alerts/${alert_id}/ack`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  }

  connectAlertStream(onAlert: (alert: AlertItem) => void): () => void {
    const eventSource = new EventSource(`${API_BASE}/alerts/stream`);

    eventSource.addEventListener('alert', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onAlert(parsed);
      } catch (err) {
        // Ignore parse error
      }
    });

    return () => {
      eventSource.close();
    };
  }

  // --- Audit ---
  async getAuditLogs(params?: { entity_type?: string; entity_id?: string }): Promise<AuditLogItem[]> {
    const query = new URLSearchParams(params as any).toString();
    const url = `${API_BASE}/audit${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch audit log');
    return res.json();
  }

  async verifyAuditChain(): Promise<{
    chain_valid: boolean;
    total_entries_verified: number;
    tamper_detected: boolean;
    error: string | null;
    verified_at: string;
  }> {
    const res = await fetch(`${API_BASE}/audit/verify`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to verify audit chain');
    return res.json();
  }

  async exportAuditLedger(): Promise<any> {
    const res = await fetch(`${API_BASE}/audit/export`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to export audit ledger');
    return res.json();
  }

  // --- System, Time-Sync & Security Status ---
  async getTimeSync(): Promise<TimeSyncStatus> {
    const res = await fetch(`${API_BASE}/system/time-sync`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch time sync status');
    return res.json();
  }

  async getSecurityStatus(): Promise<SecuritySystemStatus> {
    const res = await fetch(`${API_BASE}/system/security-status`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch security status');
    return res.json();
  }
}

export const api = new ApiService();

