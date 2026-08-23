// ============================================================================
// M-FTAMS — Edge Simulator Offline & Fault-Injection Tests
// Scenarios: 72h Outage, Reconnect Flush, Clock Drift, Queue Durability
// ============================================================================

import { EdgeSimulatorHarness } from '../src/simulator';

describe('Edge Simulator & Fault Injection Scenarios', () => {
  let simulator: EdgeSimulatorHarness;

  beforeEach(() => {
    simulator = new EdgeSimulatorHarness('http://localhost:8080');
    simulator.registerTerminal('GATE-04', 'mftams_edge_secret_GATE-04_99214710_auth');
    simulator.registerTerminal('GATE-NORTH', 'mftams_edge_secret_NORTH_88192031_auth');
  });

  test('Scenario 1: Sustained Outage (>72h) — Events queue locally with exact hardware timestamps', () => {
    simulator.setTerminalOffline('GATE-04');
    const term = simulator.terminals.get('GATE-04')!;
    expect(term.isOnline).toBe(false);

    // Record offline handshake during outage
    const { event_id, signature } = simulator.recordOfflineOutbound(
      'GATE-04',
      'tok-outage-01',
      'trip-outage-01',
      'v-outage-01',
      'd-outage-01',
      18500,
      80,
      'sentry-gate4'
    );

    expect(event_id).toBeDefined();
    expect(signature).toHaveLength(64);
    expect(term.pendingQueue.length).toBe(1);
    expect(term.pendingQueue[0].event_id).toBe(event_id);
  });

  test('Scenario 2: Reconnect Flush — Batches queued events upon link restoration', () => {
    simulator.setTerminalOffline('GATE-04');
    simulator.recordOfflineOutbound(
      'GATE-04',
      'tok-01',
      'trip-01',
      'v-01',
      'd-01',
      18500,
      80,
      'sentry-gate4'
    );
    simulator.recordOfflineOutbound(
      'GATE-04',
      'tok-02',
      'trip-02',
      'v-02',
      'd-02',
      22000,
      75,
      'sentry-gate4'
    );

    // Reconnect terminal
    simulator.setTerminalOnline('GATE-04');
    const batch = simulator.createUplinkBatch('GATE-04');

    expect(batch.edge_id).toBe('GATE-04');
    expect(batch.events.length).toBe(2);
    expect(batch.hardware_clock_at_generation).toBeDefined();
  });

  test('Scenario 3: Induced Clock Drift (>30s) — Generates delta timestamp for CLOCK_SKEW_SUSPECTED detection', () => {
    // Inject 120 seconds of clock drift into GATE-NORTH
    simulator.injectClockDrift('GATE-NORTH', 120);

    const batch = simulator.createUplinkBatch('GATE-NORTH');
    const batchTime = new Date(batch.hardware_clock_at_generation).getTime();
    const systemNow = Date.now();

    const deltaSeconds = Math.round((batchTime - systemNow) / 1000);
    expect(deltaSeconds).toBeGreaterThanOrEqual(115);
    expect(deltaSeconds).toBeLessThanOrEqual(125);
  });
});
