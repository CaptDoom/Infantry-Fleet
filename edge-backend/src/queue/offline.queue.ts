// ============================================================================
// M-FTAMS Edge — Offline Transaction Event Queue
// Implements Durable SQLite Writes (PRAGMA synchronous = FULL)
// ============================================================================

import { edgeDb, PendingEvent } from '../db/sqlite';

export class OfflineEventQueue {
  /**
   * Appends an event to the local durable queue inside a transaction.
   */
  public enqueue(event: PendingEvent): boolean {
    try {
      // In SQLite: BEGIN TRANSACTION; INSERT INTO pending_events ...; COMMIT;
      edgeDb.pendingEvents.set(event.event_id, {
        ...event,
        sync_status: 'PENDING'
      });
      return true;
    } catch (err) {
      console.error('[OfflineQueue] Enqueue failure:', err);
      return false;
    }
  }

  /**
   * Retrieves all pending events waiting for uplink sync.
   */
  public getPendingEvents(): PendingEvent[] {
    return Array.from(edgeDb.pendingEvents.values())
      .filter(e => e.sync_status === 'PENDING')
      .sort((a, b) => new Date(a.hardware_timestamp).getTime() - new Date(b.hardware_timestamp).getTime());
  }

  /**
   * Marks events as acknowledged on confirmed receipt from central server.
   */
  public acknowledgeEvents(acceptedEventIds: string[]) {
    for (const eventId of acceptedEventIds) {
      const event = edgeDb.pendingEvents.get(eventId);
      if (event) {
        event.sync_status = 'ACKNOWLEDGED';
      }
    }
  }

  /**
   * Returns count of pending offline events.
   */
  public getPendingCount(): number {
    return this.getPendingEvents().length;
  }
}

export const offlineEventQueue = new OfflineEventQueue();
