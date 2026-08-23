// ============================================================================
// M-FTAMS — Multi-Terminal Edge Simulator & Network Fault Injection Harness
// Tests: 72h+ Outages, Reconnect Flush, Clock Drift (>30s), Mid-Outage Revocations
// ============================================================================

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface SimulatedEdgeTerminal {
  edgeId: string;
  edgeSecret: string;
  isOnline: boolean;
  clockSkewSeconds: number;
  localTokens: Map<string, any>;
  localVehicles: Map<string, any>;
  localDrivers: Map<string, any>;
  localBlacklist: Set<string>;
  pendingQueue: any[];
}

export class EdgeSimulatorHarness {
  public terminals: Map<string, SimulatedEdgeTerminal> = new Map();
  public centralUrl: string;

  constructor(centralUrl: string = 'http://localhost:8080') {
    this.centralUrl = centralUrl;
  }

  public registerTerminal(edgeId: string, edgeSecret: string): SimulatedEdgeTerminal {
    const term: SimulatedEdgeTerminal = {
      edgeId,
      edgeSecret,
      isOnline: true,
      clockSkewSeconds: 0,
      localTokens: new Map(),
      localVehicles: new Map(),
      localDrivers: new Map(),
      localBlacklist: new Set(),
      pendingQueue: []
    };
    this.terminals.set(edgeId, term);
    return term;
  }

  /**
   * Simulates network fault: Disconnects terminal.
   */
  public setTerminalOffline(edgeId: string) {
    const term = this.terminals.get(edgeId);
    if (term) term.isOnline = false;
  }

  /**
   * Simulates network recovery: Reconnects terminal.
   */
  public setTerminalOnline(edgeId: string) {
    const term = this.terminals.get(edgeId);
    if (term) term.isOnline = true;
  }

  /**
   * Injects hardware clock drift (in seconds).
   */
  public injectClockDrift(edgeId: string, deltaSeconds: number) {
    const term = this.terminals.get(edgeId);
    if (term) term.clockSkewSeconds = deltaSeconds;
  }

  /**
   * Simulates offline gate outbound handshake.
   */
  public recordOfflineOutbound(
    edgeId: string,
    tokenId: string,
    tripId: string,
    vehicleId: string,
    driverId: string,
    odometer: number,
    fuel: number,
    sentryId: string
  ): { event_id: string; signature: string } {
    const term = this.terminals.get(edgeId);
    if (!term) throw new Error('Terminal not found');

    const eventId = uuidv4();
    const hardwareTimestamp = new Date(Date.now() + term.clockSkewSeconds * 1000).toISOString();

    const canonicalBytes = [
      eventId,
      edgeId,
      'OUTBOUND',
      tripId,
      vehicleId,
      driverId,
      tokenId,
      odometer.toString(),
      fuel.toString(),
      sentryId,
      hardwareTimestamp
    ].join('|');

    const signature = crypto.createHmac('sha256', term.edgeSecret).update(canonicalBytes, 'utf8').digest('hex');

    const event = {
      event_id: eventId,
      event_type: 'OUTBOUND',
      trip_id: tripId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      token_id: tokenId,
      odometer_reading: odometer,
      fuel_level_pct: fuel,
      hardware_timestamp: hardwareTimestamp,
      sentry_id: sentryId,
      event_signature: signature
    };

    term.pendingQueue.push(event);
    return { event_id: eventId, signature };
  }

  /**
   * Creates an uplink batch ready for submission.
   */
  public createUplinkBatch(edgeId: string) {
    const term = this.terminals.get(edgeId);
    if (!term) throw new Error('Terminal not found');

    const hardwareClock = new Date(Date.now() + term.clockSkewSeconds * 1000).toISOString();

    return {
      edge_id: edgeId,
      batch_id: uuidv4(),
      hardware_clock_at_generation: hardwareClock,
      events: [...term.pendingQueue]
    };
  }
}
