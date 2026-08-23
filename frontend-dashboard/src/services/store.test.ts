import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  submitRequisition,
  approveRequisition,
  rejectRequisition,
  dispatchVehicle,
  returnVehicle,
  computeStats,
  computeTrafficBuckets,
  mockSignature,
  newId,
  type StoreState,
} from './store';

// ── Helpers ───────────────────────────────────────────────────────
const NOW = '2026-08-23T12:00:00.000Z';
const ETA = '2026-08-23T15:00:00.000Z';

function makeReqInput(overrides?: Partial<{ vehicleId: string; driverId: string; dest: string; dist: number }>) {
  return {
    unit: 'Alpha Company, 4 RAJPUT',
    dest: 'Brigade HQ, Leh',
    purpose: 'Ration collection',
    dist: 40,
    eta: ETA,
    vehicleId: overrides?.vehicleId ?? 'V1',
    driverId: overrides?.driverId ?? 'D1',
    ...(overrides?.dest !== undefined && { dest: overrides.dest }),
    ...(overrides?.dist !== undefined && { dist: overrides.dist }),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════

describe('mockSignature', () => {
  it('returns a 40-char hex string', () => {
    const sig = mockSignature('test', 1000);
    expect(sig).toMatch(/^[0-9a-f]{40}$/);
  });

  it('is deterministic for same input', () => {
    const a = mockSignature('payload', 42);
    const b = mockSignature('payload', 42);
    expect(a).toBe(b);
  });

  it('differs for different payloads', () => {
    const a = mockSignature('foo', 1);
    const b = mockSignature('bar', 1);
    expect(a).not.toBe(b);
  });
});

describe('newId', () => {
  it('increments counter and returns prefixed ID', () => {
    const state = createInitialState();
    const [id, next] = newId(state, 'TRP');
    expect(id).toBe('TRP-1001');
    expect(next.idCounter).toBe(1001);
  });

  it('increments sequentially', () => {
    const [id1, s1] = newId(createInitialState(), 'TOK');
    const [id2, s2] = newId(s1, 'TOK');
    expect(id1).toBe('TOK-1001');
    expect(id2).toBe('TOK-1002');
  });
});

describe('submitRequisition', () => {
  it('creates a PENDING requisition and reserves the vehicle', () => {
    const state = createInitialState();
    const result = submitRequisition(state, makeReqInput(), NOW);

    expect(result).toHaveProperty('req');
    if (!('req' in result)) throw new Error('expected req');

    expect(result.req.id).toBe('TRP-1001');
    expect(result.req.status).toBe('PENDING');
    expect(result.req.unit).toBe('Alpha Company, 4 RAJPUT');
    expect(result.req.dest).toBe('Brigade HQ, Leh');
    expect(result.req.token).toBeNull();

    const v = result.state.vehicles.find((v) => v.id === 'V1');
    expect(v?.status).toBe('RESERVED');
  });

  it('adds an audit entry', () => {
    const state = createInitialState();
    const result = submitRequisition(state, makeReqInput(), NOW);
    if (!('state' in result)) throw new Error('expected state');

    expect(result.state.auditLogs).toHaveLength(1);
    expect(result.state.auditLogs[0].action).toBe('TRIP_REQUISITION_SUBMITTED');
    expect(result.state.auditLogs[0].resource).toBe('TRP-1001');
  });

  it('rejects if vehicle is not AVAILABLE', () => {
    const state = createInitialState();
    const result = submitRequisition(state, makeReqInput({ vehicleId: 'V4' }), NOW);
    expect(result).toHaveProperty('error');
    expect('error' in result && result.error).toContain('no longer available');
  });

  it('rejects if vehicle ID is invalid', () => {
    const state = createInitialState();
    const result = submitRequisition(state, makeReqInput({ vehicleId: 'V999' }), NOW);
    expect(result).toHaveProperty('error');
  });
});

describe('approveRequisition', () => {
  function approvedState(): StoreState {
    const s = createInitialState();
    const r = submitRequisition(s, makeReqInput(), NOW);
    if (!('state' in r)) throw new Error('submit failed');
    return r.state;
  }

  it('changes status to APPROVED and generates a token', () => {
    const state = approvedState();
    const result = approveRequisition(state, 'TRP-1001', NOW);
    if (!('token' in result)) throw new Error('expected token');

    expect(result.token.id).toMatch(/^TOK-/);
    expect(result.token.sig).toMatch(/^[0-9a-f]{40}$/);
    expect(result.token.revoked).toBe(false);

    const req = result.state.requisitions.find((r) => r.id === 'TRP-1001');
    expect(req?.status).toBe('APPROVED');
    expect(req?.token?.id).toBe(result.token.id);
  });

  it('adds an audit entry for approval', () => {
    const state = approvedState();
    const result = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in result)) throw new Error('expected state');

    const audit = result.state.auditLogs.find((a) => a.action === 'TRIP_APPROVED_TOKEN_ISSUED');
    expect(audit).toBeDefined();
    expect(audit!.resource).toContain('TRP-1001');
    expect(audit!.resource).toContain('TOK-');
  });

  it('rejects if req is not PENDING', () => {
    const state = approvedState();
    approveRequisition(state, 'TRP-1001', NOW);
    // The state from approveRequisition is the one with APPROVED status
    // We need to use the state that has the approved req
    const approved = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in approved)) throw new Error('expected state');

    const result = approveRequisition(approved.state, 'TRP-1001', NOW);
    expect(result).toHaveProperty('error');
  });

  it('rejects if req ID is invalid', () => {
    const state = approvedState();
    const result = approveRequisition(state, 'TRP-9999', NOW);
    expect(result).toHaveProperty('error');
  });
});

describe('rejectRequisition', () => {
  function pendingState(): StoreState {
    const s = createInitialState();
    const r = submitRequisition(s, makeReqInput(), NOW);
    if (!('state' in r)) throw new Error('submit failed');
    return r.state;
  }

  it('changes status to REJECTED and releases vehicle', () => {
    const state = pendingState();
    const result = rejectRequisition(state, 'TRP-1001', NOW);
    if (!('state' in result)) throw new Error('expected state');

    const req = result.state.requisitions.find((r) => r.id === 'TRP-1001');
    expect(req?.status).toBe('REJECTED');

    const v = result.state.vehicles.find((v) => v.id === 'V1');
    expect(v?.status).toBe('AVAILABLE');
  });

  it('adds an audit entry for rejection', () => {
    const state = pendingState();
    const result = rejectRequisition(state, 'TRP-1001', NOW);
    if (!('state' in result)) throw new Error('expected state');

    const audit = result.state.auditLogs.find((a) => a.action === 'TRIP_REJECTED');
    expect(audit).toBeDefined();
    expect(audit!.resource).toBe('TRP-1001');
  });

  it('rejects if req is not PENDING', () => {
    const state = pendingState();
    const first = rejectRequisition(state, 'TRP-1001', NOW);
    if (!('state' in first)) throw new Error('first reject failed');
    const result = rejectRequisition(first.state, 'TRP-1001', NOW);
    expect(result).toHaveProperty('error');
  });
});

describe('dispatchVehicle (outbound)', () => {
  function approvedState(): StoreState {
    const s = createInitialState();
    const r1 = submitRequisition(s, makeReqInput(), NOW);
    if (!('state' in r1)) throw new Error('submit failed');
    const r2 = approveRequisition(r1.state, 'TRP-1001', NOW);
    if (!('state' in r2)) throw new Error('approve failed');
    return r2.state;
  }

  it('sets vehicle to ON_SORTIE and req to DISPATCHED', () => {
    const state = approvedState();
    const result = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('gateLog' in result)) throw new Error('expected gateLog');

    const v = result.state.vehicles.find((v) => v.id === 'V1');
    expect(v?.status).toBe('ON_SORTIE');
    expect(v?.odometer).toBe(18420);
    expect(v?.fuel).toBe(78);

    const req = result.state.requisitions.find((r) => r.id === 'TRP-1001');
    expect(req?.status).toBe('DISPATCHED');
    expect(req?.outboundOdo).toBe(18420);
  });

  it('logs an OUTBOUND gate event', () => {
    const state = approvedState();
    const result = dispatchVehicle(state, 'V1', 18420, 78, 'NORTH', NOW);
    if (!('gateLog' in result)) throw new Error('expected gateLog');

    expect(result.gateLog.direction).toBe('OUTBOUND');
    expect(result.gateLog.gate).toBe('NORTH');
    expect(result.gateLog.vehicle).toBe('25A-4471');
    expect(result.gateLog.flags).toBe('—');
  });

  it('adds an audit entry', () => {
    const state = approvedState();
    const result = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('state' in result)) throw new Error('expected state');

    const audit = result.state.auditLogs.find((a) => a.action === 'GATE_OUTBOUND');
    expect(audit).toBeDefined();
    expect(audit!.actor).toBe('Sentry@MAIN');
  });

  it('rejects if no valid token', () => {
    const state = createInitialState();
    const result = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    expect(result).toHaveProperty('error');
  });
})

describe('returnVehicle (inbound)', () => {
  function dispatchedState(): StoreState {
    const s = createInitialState();
    const r1 = submitRequisition(s, makeReqInput({ dist: 40 }), NOW);
    if (!('state' in r1)) throw new Error('submit failed');
    const r2 = approveRequisition(r1.state, 'TRP-1001', NOW);
    if (!('state' in r2)) throw new Error('approve failed');
    const r3 = dispatchVehicle(r2.state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('state' in r3)) throw new Error('dispatch failed');
    return r3.state;
  }

  it('completes trip and sets vehicle back to AVAILABLE', () => {
    const state = dispatchedState();
    const result = returnVehicle(state, 'V1', 18440, 72, 'MAIN', NOW);
    if (!('gateLog' in result)) throw new Error('expected gateLog');

    const v = result.state.vehicles.find((v) => v.id === 'V1');
    expect(v?.status).toBe('AVAILABLE');
    expect(v?.odometer).toBe(18440);
    expect(v?.fuel).toBe(72);

    const req = result.state.requisitions.find((r) => r.id === 'TRP-1001');
    expect(req?.status).toBe('COMPLETED');
    expect(req?.actualDist).toBe(20); // 18440 - 18420
    expect(req?.inboundOdo).toBe(18440);
  });

  it('does NOT flag if within 10% tolerance', () => {
    const state = dispatchedState();
    const result = returnVehicle(state, 'V1', 18440, 72, 'MAIN', NOW);
    if (!('flagged' in result)) throw new Error('expected flagged');

    expect(result.flagged).toBe(false);
    expect(result.actualDist).toBe(20);
    expect(result.gateLog.flags).toBe('—');

    const audit = result.state.auditLogs.find((a) => a.action === 'GATE_INBOUND');
    expect(audit).toBeDefined();
    expect(audit!.action).not.toContain('FLAGGED');
  });

  it('flags if actual distance exceeds planned by >10%', () => {
    const state = dispatchedState();
    // Planned: 40km, Actual: 50km → 25% over → flagged
    const result = returnVehicle(state, 'V1', 18470, 65, 'SOUTH', NOW);
    if (!('flagged' in result)) throw new Error('expected flagged');

    expect(result.flagged).toBe(true);
    expect(result.actualDist).toBe(50); // 18470 - 18420
    expect(result.gateLog.flags).toContain('AUDIT_ALERT');
    expect(result.gateLog.flags).toContain('+10km over plan');

    const audit = result.state.auditLogs.find((a) => a.action === 'GATE_INBOUND_FLAGGED');
    expect(audit).toBeDefined();
    expect(audit!.resource).toContain('[ANOMALY]');
  });

  it('logs an INBOUND gate event', () => {
    const state = dispatchedState();
    const result = returnVehicle(state, 'V1', 18440, 72, 'NORTH', NOW);
    if (!('gateLog' in result)) throw new Error('expected gateLog');

    expect(result.gateLog.direction).toBe('INBOUND');
    expect(result.gateLog.gate).toBe('NORTH');
    expect(result.gateLog.sentry).toBe('Sentry Duty Officer');
  });

  it('rejects if no dispatched trip', () => {
    const state = createInitialState();
    const result = returnVehicle(state, 'V1', 18440, 72, 'MAIN', NOW);
    expect(result).toHaveProperty('error');
  });

  it('handles zero outbound odometer gracefully', () => {
    const state = dispatchedState();
    // Manually clear outboundOdo to simulate edge case
    const reqs = state.requisitions.map((r) =>
      r.id === 'TRP-1001' ? { ...r, outboundOdo: undefined } : r
    );
    const s = { ...state, requisitions: reqs };
    const result = returnVehicle(s, 'V1', 18440, 72, 'MAIN', NOW);
    if (!('actualDist' in result)) throw new Error('expected result');
    // When outboundOdo is undefined, function uses odometer as fallback → actualDist = 0
    expect(result.actualDist).toBe(0);
    expect(result.flagged).toBe(false);
  });
});

describe('computeStats', () => {
  it('returns correct counts for initial state', () => {
    const state = createInitialState();
    const stats = computeStats(state);
    expect(stats.available).toBe(3); // V1, V2, V3 (V4 is MAINTENANCE)
    expect(stats.onSortie).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.overdue).toBe(0);
  });

  it('counts after full lifecycle', () => {
    let state = createInitialState();

    // Submit two requisitions
    const r1 = submitRequisition(state, makeReqInput({ vehicleId: 'V1' }), NOW);
    if (!('state' in r1)) throw new Error('submit1');
    state = r1.state;

    const r2 = submitRequisition(state, makeReqInput({ vehicleId: 'V2' }), NOW);
    if (!('state' in r2)) throw new Error('submit2');
    state = r2.state;

    expect(computeStats(state).pending).toBe(2);
    expect(computeStats(state).available).toBe(1); // only V3

    // Approve and dispatch V1
    const a1 = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in a1)) throw new Error('approve1');
    state = a1.state;

    const d1 = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('state' in d1)) throw new Error('dispatch1');
    state = d1.state;

    expect(computeStats(state).onSortie).toBe(1);
    expect(computeStats(state).pending).toBe(1);

    // Complete V1 trip
    const ret1 = returnVehicle(state, 'V1', 18470, 65, 'MAIN', NOW); // 50km vs 40km planned → flagged
    if (!('state' in ret1)) throw new Error('return1');
    state = ret1.state;

    expect(computeStats(state).onSortie).toBe(0);
    expect(computeStats(state).overdue).toBe(1);
    expect(computeStats(state).available).toBe(2); // V1 back + V3
  });
});

describe('computeTrafficBuckets', () => {
  it('returns empty for no events', () => {
    const state = createInitialState();
    expect(computeTrafficBuckets(state)).toEqual([]);
  });

  it('buckets events by hour', () => {
    let state = createInitialState();
    const r1 = submitRequisition(state, makeReqInput(), NOW);
    if (!('state' in r1)) throw new Error('submit');
    state = r1.state;

    const a1 = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in a1)) throw new Error('approve');
    state = a1.state;

    const dispatchTs = '2026-08-23T08:00:00.000Z';
    const d1 = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', dispatchTs);
    if (!('state' in d1)) throw new Error('dispatch');
    state = d1.state;

    // The dispatch adds 1 gate log. Audit entries from submit/approve don't go into gateLogs.
    const buckets = computeTrafficBuckets(state);
    expect(buckets.length).toBe(1);
    expect(buckets[0].count).toBe(1);
    // Hour depends on local timezone; verify the bucket exists with correct count
    expect(buckets[0].hour).toMatch(/^\d{1,2}:00$/);
  });
});

describe('full end-to-end lifecycle', () => {
  it('submit → approve → dispatch → return → complete', () => {
    let state = createInitialState();

    // 1. Submit
    const sub = submitRequisition(state, makeReqInput({ dest: 'Sector 4 Forward Post', dist: 40 }), NOW);
    if (!('state' in sub)) throw new Error('submit failed');
    state = sub.state;
    expect(state.requisitions).toHaveLength(1);
    expect(state.vehicles.find((v) => v.id === 'V1')?.status).toBe('RESERVED');

    // 2. Approve
    const app = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in app)) throw new Error('approve failed');
    state = app.state;
    expect(state.requisitions[0].status).toBe('APPROVED');
    expect(state.requisitions[0].token).toBeDefined();

    // 3. Dispatch (outbound)
    const dis = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('state' in dis)) throw new Error('dispatch failed');
    state = dis.state;
    expect(state.vehicles.find((v) => v.id === 'V1')?.status).toBe('ON_SORTIE');
    expect(state.requisitions[0].status).toBe('DISPATCHED');
    expect(state.gateLogs).toHaveLength(1);
    expect(state.gateLogs[0].direction).toBe('OUTBOUND');

    // 4. Return (inbound) — within tolerance
    const ret = returnVehicle(state, 'V1', 18440, 72, 'MAIN', NOW);
    if (!('state' in ret)) throw new Error('return failed');
    state = ret.state;
    expect(state.vehicles.find((v) => v.id === 'V1')?.status).toBe('AVAILABLE');
    expect(state.requisitions[0].status).toBe('COMPLETED');
    expect(ret.actualDist).toBe(20);
    expect(ret.flagged).toBe(false);
    expect(state.gateLogs).toHaveLength(2);
    expect(state.gateLogs[0].direction).toBe('INBOUND');
    expect(state.auditLogs.length).toBeGreaterThanOrEqual(4);

    // Stats
    const stats = computeStats(state);
    expect(stats.available).toBe(3); // V1, V2, V3
    expect(stats.onSortie).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.overdue).toBe(0);
  });

  it('submit → approve → dispatch → return with >10% deviation → flagged', () => {
    let state = createInitialState();

    const sub = submitRequisition(state, makeReqInput({ dist: 40 }), NOW);
    if (!('state' in sub)) throw new Error('submit');
    state = sub.state;

    const app = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in app)) throw new Error('approve');
    state = app.state;

    const dis = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('state' in dis)) throw new Error('dispatch');
    state = dis.state;

    // Return with 50km actual vs 40km planned = 25% over
    const ret = returnVehicle(state, 'V1', 18470, 65, 'MAIN', NOW);
    if (!('state' in ret)) throw new Error('return');
    state = ret.state;

    expect(ret.flagged).toBe(true);
    expect(ret.actualDist).toBe(50);

    const stats = computeStats(state);
    expect(stats.overdue).toBe(1);
    expect(stats.available).toBe(3);
  });

  it('submit → reject → vehicle released', () => {
    let state = createInitialState();

    const sub = submitRequisition(state, makeReqInput(), NOW);
    if (!('state' in sub)) throw new Error('submit');
    state = sub.state;

    expect(state.vehicles.find((v) => v.id === 'V1')?.status).toBe('RESERVED');

    const rej = rejectRequisition(state, 'TRP-1001', NOW);
    if (!('state' in rej)) throw new Error('reject');
    state = rej.state;

    expect(state.requisitions[0].status).toBe('REJECTED');
    expect(state.vehicles.find((v) => v.id === 'V1')?.status).toBe('AVAILABLE');

    const stats = computeStats(state);
    expect(stats.available).toBe(3);
    expect(stats.pending).toBe(0);
  });
});

describe('edge cases', () => {
  it('cannot dispatch a MAINTENANCE vehicle', () => {
    const state = createInitialState();
    const result = dispatchVehicle(state, 'V4', 31005, 40, 'MAIN', NOW);
    expect(result).toHaveProperty('error');
  });

  it('cannot submit requisition for non-existent vehicle', () => {
    const state = createInitialState();
    const result = submitRequisition(state, makeReqInput({ vehicleId: 'V999' }), NOW);
    expect(result).toHaveProperty('error');
  });

  it('cannot return a vehicle that was never dispatched', () => {
    const state = createInitialState();
    const result = returnVehicle(state, 'V1', 18440, 72, 'MAIN', NOW);
    expect(result).toHaveProperty('error');
  });

  it('cannot approve a non-existent requisition', () => {
    const state = createInitialState();
    const result = approveRequisition(state, 'TRP-9999', NOW);
    expect(result).toHaveProperty('error');
  });

  it('cannot reject a non-existent requisition', () => {
    const state = createInitialState();
    const result = rejectRequisition(state, 'TRP-9999', NOW);
    expect(result).toHaveProperty('error');
  });

  it('audit log is append-only (newest first)', () => {
    let state = createInitialState();

    const sub = submitRequisition(state, makeReqInput(), NOW);
    if (!('state' in sub)) throw new Error('submit');
    state = sub.state;

    const app = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in app)) throw new Error('approve');
    state = app.state;

    // Newest audit entry should be first
    expect(state.auditLogs[0].action).toBe('TRIP_APPROVED_TOKEN_ISSUED');
    expect(state.auditLogs[1].action).toBe('TRIP_REQUISITION_SUBMITTED');
  });

  it('gate log is append-only (newest first)', () => {
    let state = createInitialState();

    const sub = submitRequisition(state, makeReqInput(), NOW);
    if (!('state' in sub)) throw new Error('submit');
    state = sub.state;

    const app = approveRequisition(state, 'TRP-1001', NOW);
    if (!('state' in app)) throw new Error('approve');
    state = app.state;

    const dis = dispatchVehicle(state, 'V1', 18420, 78, 'MAIN', NOW);
    if (!('state' in dis)) throw new Error('dispatch');
    state = dis.state;

    const ret = returnVehicle(state, 'V1', 18440, 72, 'MAIN', NOW);
    if (!('state' in ret)) throw new Error('return');
    state = ret.state;

    expect(state.gateLogs[0].direction).toBe('INBOUND');
    expect(state.gateLogs[1].direction).toBe('OUTBOUND');
  });
});
