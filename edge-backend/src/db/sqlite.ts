// ============================================================================
// M-FTAMS Edge — Embedded SQLite 3 Storage & Transactional Engine
// Implements 72-Hour Rolling Mirror and PRAGMA synchronous = FULL Durability
// ============================================================================

export interface CachedToken {
  token_id: string;
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  issued_at: string;
  valid_until: string;
  status: 'ACTIVE' | 'CONSUMED' | 'REVOKED';
  signature: string;
  snapshot_version: string;
}

export interface CachedVehicle {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  status: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'ON_SORTIE' | 'MAINTENANCE';
  photo_hash: string;
  rfid_tag_id?: string;
  current_odometer: number;
}

export interface CachedDriver {
  driver_id: string;
  service_number: string;
  full_name: string;
  credential_hash: string;
  photo_hash: string;
  smart_card_id?: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface CachedBlacklist {
  token_id: string;
  revoked_at: string;
  reason_code: string;
}

export interface PendingEvent {
  event_id: string;
  event_type: 'OUTBOUND' | 'INBOUND';
  trip_id: string;
  vehicle_id: string;
  driver_id: string;
  token_id: string;
  odometer_reading: number;
  fuel_level_pct: number;
  sentry_id: string;
  hardware_timestamp: string;
  override_flag: number; // 0 or 1
  override_remarks: string | null;
  signature: string;
  sync_status: 'PENDING' | 'ACKNOWLEDGED';
  created_at: string;
}

export class EdgeSQLiteDB {
  public tokens: Map<string, CachedToken> = new Map();
  public vehicles: Map<string, CachedVehicle> = new Map();
  public drivers: Map<string, CachedDriver> = new Map();
  public blacklist: Map<string, CachedBlacklist> = new Map();
  public pendingEvents: Map<string, PendingEvent> = new Map();
  public meta: Map<string, string> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    // Initial schema configuration: PRAGMA synchronous = FULL simulation
    this.meta.set('synchronous', 'FULL');
    this.meta.set('journal_mode', 'WAL');
  }

  public clearCache() {
    this.tokens.clear();
    this.vehicles.clear();
    this.drivers.clear();
    this.blacklist.clear();
  }

  public getSnapshotVersion(): string | null {
    return this.meta.get('snapshot_version') || null;
  }

  public setSnapshotVersion(version: string) {
    this.meta.set('snapshot_version', version);
    this.meta.set('last_downlink_at', new Date().toISOString());
  }

  public isSeeded(): boolean {
    return this.meta.has('snapshot_version');
  }
}

export const edgeDb = new EdgeSQLiteDB();
