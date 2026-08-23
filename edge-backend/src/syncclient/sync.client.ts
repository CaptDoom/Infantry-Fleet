// ============================================================================
// M-FTAMS Edge — Sync Client (5-Min Scheduler & Immediate Reconnect Flush)
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { localCacheManager, DownlinkSnapshotPayload } from '../cache/cache.manager';
import { offlineEventQueue } from '../queue/offline.queue';

export class SyncClient {
  private centralUrl: string;
  private edgeId: string;
  private syncIntervalSeconds: number;
  private timer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private isOnline: boolean = true;

  constructor(
    centralUrl: string = process.env.CENTRAL_URL || 'http://localhost:8080',
    edgeId: string = process.env.EDGE_ID || 'GATE-04',
    syncIntervalSeconds: number = 300
  ) {
    this.centralUrl = centralUrl;
    this.edgeId = edgeId;
    this.syncIntervalSeconds = syncIntervalSeconds;
  }

  public setCentralUrl(url: string) {
    this.centralUrl = url;
  }

  public startScheduler() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.runSyncCycle(), this.syncIntervalSeconds * 1000);
    // Trigger initial sync immediately
    this.runSyncCycle();
  }

  public stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Executes a bidirectional sync exchange: Downlink followed by Uplink.
   */
  public async runSyncCycle(): Promise<{ downlinkOk: boolean; uplinkOk: boolean; pendingCount: number }> {
    if (this.isSyncing) {
      return { downlinkOk: false, uplinkOk: false, pendingCount: offlineEventQueue.getPendingCount() };
    }

    this.isSyncing = true;
    let downlinkOk = false;
    let uplinkOk = false;

    try {
      // 1. Downlink: Fetch Reference Snapshot from Central Server
      downlinkOk = await this.performDownlink();

      // 2. Uplink: Flush Pending Offline Events to Central Server
      uplinkOk = await this.performUplink();

      this.isOnline = true;
    } catch (err) {
      this.isOnline = false;
      console.warn('[SyncClient] Offline or central unreachable. Operating in offline mode.');
    } finally {
      this.isSyncing = false;
    }

    return {
      downlinkOk,
      uplinkOk,
      pendingCount: offlineEventQueue.getPendingCount()
    };
  }

  public async performDownlink(): Promise<boolean> {
    try {
      const currentVersion = localCacheManager.isReadyForGateOperations()
        ? (global as any).currentSnapshotVersion
        : undefined;

      const url = `${this.centralUrl}/sync/downlink?edge_id=${encodeURIComponent(this.edgeId)}${currentVersion ? `&since_version=${encodeURIComponent(currentVersion)}` : ''}`;

      const res = await fetch(url);
      if (res.status === 304) {
        return true; // Already up to date
      }

      if (!res.ok) {
        return false;
      }

      const snapshot = (await res.json()) as DownlinkSnapshotPayload;
      const applied = localCacheManager.applyDownlinkSnapshot(snapshot);
      return applied;
    } catch {
      return false;
    }
  }

  public async performUplink(): Promise<boolean> {
    const pending = offlineEventQueue.getPendingEvents();
    if (pending.length === 0) {
      return true;
    }

    try {
      const batch_id = uuidv4();
      const hardware_clock_at_generation = new Date().toISOString();

      const batchPayload = {
        edge_id: this.edgeId,
        batch_id,
        hardware_clock_at_generation,
        events: pending.map(e => ({
          event_id: e.event_id,
          event_type: e.event_type,
          trip_id: e.trip_id,
          vehicle_id: e.vehicle_id,
          driver_id: e.driver_id,
          token_id: e.token_id,
          odometer_reading: e.odometer_reading,
          fuel_level_pct: e.fuel_level_pct,
          hardware_timestamp: e.hardware_timestamp,
          sentry_id: e.sentry_id,
          event_signature: e.signature,
          override_flag: e.override_flag === 1,
          override_remarks: e.override_remarks
        }))
      };

      const res = await fetch(`${this.centralUrl}/sync/uplink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
      });

      if (!res.ok) {
        return false;
      }

      const data = (await res.json()) as { accepted_event_ids?: string[] };
      if (data.accepted_event_ids && Array.isArray(data.accepted_event_ids)) {
        offlineEventQueue.acknowledgeEvents(data.accepted_event_ids);
      }

      return true;
    } catch {
      return false;
    }
  }

  public getStatus() {
    return {
      edge_id: this.edgeId,
      is_online: this.isOnline,
      is_seeded: localCacheManager.isReadyForGateOperations(),
      pending_queue_count: offlineEventQueue.getPendingCount(),
      last_sync_at: new Date().toISOString()
    };
  }
}

export const syncClient = new SyncClient();
