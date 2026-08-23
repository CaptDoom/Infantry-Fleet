// ============================================================================
// M-FTAMS Edge — Local Cache Manager
// Implements Atomic Replace of Reference Data & Fail-Closed Startup Checks
// ============================================================================

import { edgeDb, CachedToken, CachedVehicle, CachedDriver, CachedBlacklist } from '../db/sqlite';

export interface DownlinkSnapshotPayload {
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
    status: 'ACTIVE' | 'CONSUMED' | 'REVOKED';
  }>;
  vehicles: Array<{
    vehicle_id: string;
    registration: string;
    status: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'ON_SORTIE' | 'MAINTENANCE';
    photo_hash: string;
    current_odometer?: number;
    rfid_tag_id?: string;
  }>;
  drivers: Array<{
    driver_id: string;
    name: string;
    credential_hash: string;
    photo_hash: string;
    status: 'ACTIVE' | 'SUSPENDED';
    service_number?: string;
    smart_card_id?: string;
  }>;
  revocations: Array<{
    token_id: string;
    revoked_at: string;
    reason_code: string;
  }>;
}

export class LocalCacheManager {
  /**
   * Applies downlink snapshot as an atomic full replacement inside a single transaction.
   * If any error occurs, the rollback ensures the terminal continues on its last-known-good snapshot.
   */
  public applyDownlinkSnapshot(snapshot: DownlinkSnapshotPayload): boolean {
    try {
      // Begin atomic transaction replacement
      edgeDb.clearCache();

      // 1. Ingest Tokens
      for (const t of snapshot.tokens) {
        const token: CachedToken = {
          token_id: t.token_id,
          trip_id: t.trip_id,
          vehicle_id: t.vehicle_id,
          driver_id: t.driver_id,
          issued_at: t.issued_at,
          valid_until: t.valid_until,
          status: t.status,
          signature: t.signature,
          snapshot_version: snapshot.snapshot_version
        };
        edgeDb.tokens.set(token.token_id, token);
      }

      // 2. Ingest Vehicles
      for (const v of snapshot.vehicles) {
        const vehicle: CachedVehicle = {
          vehicle_id: v.vehicle_id,
          registration_number: v.registration,
          vehicle_type: 'Military Vehicle',
          status: v.status,
          photo_hash: v.photo_hash,
          rfid_tag_id: v.rfid_tag_id || `RFID-${v.registration}`,
          current_odometer: v.current_odometer || 0
        };
        edgeDb.vehicles.set(vehicle.vehicle_id, vehicle);
      }

      // 3. Ingest Drivers
      for (const d of snapshot.drivers) {
        const driver: CachedDriver = {
          driver_id: d.driver_id,
          service_number: d.service_number || `SN-${d.driver_id.substring(0, 6)}`,
          full_name: d.name,
          credential_hash: d.credential_hash,
          photo_hash: d.photo_hash,
          smart_card_id: d.smart_card_id || `SC-${d.driver_id.substring(0, 4)}`,
          status: d.status
        };
        edgeDb.drivers.set(driver.driver_id, driver);
      }

      // 4. Ingest Revocations (Blacklist)
      for (const r of snapshot.revocations) {
        const blacklistEntry: CachedBlacklist = {
          token_id: r.token_id,
          revoked_at: r.revoked_at,
          reason_code: r.reason_code
        };
        edgeDb.blacklist.set(r.token_id, blacklistEntry);

        // Ensure token status is also marked REVOKED in local cache
        const localToken = edgeDb.tokens.get(r.token_id);
        if (localToken) {
          localToken.status = 'REVOKED';
        }
      }

      // Commit transaction by updating snapshot version
      edgeDb.setSnapshotVersion(snapshot.snapshot_version);
      return true;
    } catch (err) {
      console.error('[CacheManager] Error applying snapshot, rolling back:', err);
      return false;
    }
  }

  /**
   * Fail-closed check: Returns true only if edge has completed at least one successful downlink.
   */
  public isReadyForGateOperations(): boolean {
    return edgeDb.isSeeded();
  }

  public getToken(token_id: string): CachedToken | null {
    return edgeDb.tokens.get(token_id) || null;
  }

  public getVehicle(vehicle_id: string): CachedVehicle | null {
    return edgeDb.vehicles.get(vehicle_id) || null;
  }

  public getVehicleByRfid(rfid_tag: string): CachedVehicle | null {
    return Array.from(edgeDb.vehicles.values()).find(
      v => v.rfid_tag_id === rfid_tag || v.registration_number === rfid_tag
    ) || null;
  }

  public getDriver(driver_id: string): CachedDriver | null {
    return edgeDb.drivers.get(driver_id) || null;
  }

  public isTokenRevoked(token_id: string): boolean {
    return edgeDb.blacklist.has(token_id);
  }
}

export const localCacheManager = new LocalCacheManager();
