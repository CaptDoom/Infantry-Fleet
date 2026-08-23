// ============================================================================
// M-FTAMS Edge Kiosk — Localhost-Only API Service
// Talks ONLY to co-located edge backend over loopback
// ============================================================================

const EDGE_API_URL = (import.meta as any).env?.VITE_EDGE_API_URL || 'http://localhost:3001';

export interface GateScanResponse {
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
}

export interface GateStatusResponse {
  edge_id: string;
  is_online: boolean;
  is_seeded: boolean;
  pending_queue_count: number;
  last_sync_at: string;
}

export interface CachedVehicleItem {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  status: string;
  photo_hash: string;
  rfid_tag_id?: string;
  current_odometer: number;
}

export const kioskApi = {
  async getStatus(): Promise<GateStatusResponse> {
    const res = await fetch(`${EDGE_API_URL}/gate/status`);
    if (!res.ok) throw new Error('Failed to fetch gate status');
    return res.json();
  },

  async getVehicles(): Promise<CachedVehicleItem[]> {
    const res = await fetch(`${EDGE_API_URL}/gate/vehicles`);
    if (!res.ok) throw new Error('Failed to fetch cached vehicles');
    return res.json();
  },

  async scanTag(tag_id: string): Promise<GateScanResponse> {
    const res = await fetch(`${EDGE_API_URL}/gate/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Scan failed');
    }
    return data;
  },

  async verifyDriver(
    token_id: string,
    driver_id: string,
    verification_method: 'FINGERPRINT' | 'SMART_CARD' | 'SMART_CARD_PIN',
    result: boolean,
    match_score?: number
  ): Promise<{ message: string; match_score?: number; method?: string }> {
    const res = await fetch(`${EDGE_API_URL}/gate/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id, driver_id, verification_method, result, match_score })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Driver verification failed');
    }
    return data;
  },

  async getBarrierStatus(): Promise<any> {
    const res = await fetch(`${EDGE_API_URL}/gate/barrier/status`);
    if (!res.ok) throw new Error('Failed to fetch barrier status');
    return res.json();
  },

  async controlBarrier(action: 'RAISE' | 'LOWER' | 'HOLD_OPEN' | 'EMERGENCY_STOP' | 'RESET'): Promise<any> {
    const res = await fetch(`${EDGE_API_URL}/gate/barrier/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Barrier control command failed');
    return data;
  },

  async getTimeSync(): Promise<any> {
    const res = await fetch(`${EDGE_API_URL}/gate/time-sync`);
    if (!res.ok) throw new Error('Failed to fetch time sync status');
    return res.json();
  },

  async executeHandshake(params: {
    token_id: string;
    event_type: 'OUTBOUND' | 'INBOUND';
    odometer_reading: number;
    fuel_level_pct: number;
    sentry_id: string;
    override_flag?: boolean;
    override_remarks?: string;
  }): Promise<{ success: boolean; event_id: string; barrier_signal: 'RAISE' | 'RELEASE'; direction: string; relay_status?: string }> {
    const res = await fetch(`${EDGE_API_URL}/gate/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Handshake recording failed');
    }
    return data;
  },

  async triggerSync(): Promise<any> {
    const res = await fetch(`${EDGE_API_URL}/gate/sync`, { method: 'POST' });
    return res.json();
  },

  async seedCache(snapshot: any): Promise<any> {
    const res = await fetch(`${EDGE_API_URL}/gate/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });
    return res.json();
  }
};

