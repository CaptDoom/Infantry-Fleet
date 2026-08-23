/* ============================================================
   M-FTAMS — In-Memory State Machine (Pure Logic)
   Extracted for unit testing. No React, no side effects.
   ============================================================ */

// ── Types ─────────────────────────────────────────────────────────
export interface Driver {
  id: string;
  name: string;
  unit: string;
  cardId: string;
}

export interface Vehicle {
  id: string;
  reg: string;
  type: string;
  unit: string;
  rfid: string;
  odometer: number;
  fuel: number;
  status: 'AVAILABLE' | 'RESERVED' | 'ON_SORTIE' | 'MAINTENANCE';
}

export interface Requisition {
  id: string;
  unit: string;
  dest: string;
  purpose: string;
  dist: number;
  eta: string;
  vehicleId: string;
  driverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPATCHED' | 'COMPLETED';
  createdAt: string;
  token?: Token | null;
  outboundOdo?: number;
  inboundOdo?: number;
  actualDist?: number;
  dispatchedAt?: string;
  completedAt?: string;
}

export interface Token {
  id: string;
  sig: string;
  validFrom: string;
  validTo: string;
  revoked: boolean;
}

export interface GateLog {
  ts: string;
  gate: string;
  vehicle: string;
  direction: string;
  sentry: string;
  flags: string;
}

export interface AuditEntry {
  ts: string;
  action: string;
  actor: string;
  resource: string;
  sig: string;
}

export interface StoreState {
  vehicles: Vehicle[];
  drivers: Driver[];
  requisitions: Requisition[];
  gateLogs: GateLog[];
  auditLogs: AuditEntry[];
  idCounter: number;
}

export type ToastFn = (msg: string, isErr?: boolean) => void;

// ── Helpers ───────────────────────────────────────────────────────
export function newId(state: StoreState, prefix: string): [string, StoreState] {
  const next = state.idCounter + 1;
  return [`${prefix}-${next}`, { ...state, idCounter: next }];
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Deterministic-looking mock signature — NOT real crypto, purely for UI demo.
 * Pure function: same input → same output (modulo Date.now via optional override).
 */
export function mockSignature(payload: string, ts?: number): string {
  const str = payload + '|' + (ts ?? Date.now());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  // Build a 40-char hex string by combining two independent hashes
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  let hash2 = hash ^ 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    hash2 = (hash2 << 3) + hash2 + str.charCodeAt(i);
    hash2 |= 0;
  }
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash * 31 + 7).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash ^ (hash >>> 16)).toString(16).padStart(8, '0');
  const hex5 = Math.abs(hash * 65537).toString(16).padStart(8, '0');
  return (hex1 + hex2 + hex3 + hex4 + hex5).slice(0, 40);
}

// ── Requisition: Submit ──────────────────────────────────────────
export interface SubmitInput {
  unit: string;
  dest: string;
  purpose: string;
  dist: number;
  eta: string;
  vehicleId: string;
  driverId: string;
}

export function submitRequisition(
  state: StoreState,
  input: SubmitInput,
  ts?: string
): { state: StoreState; req: Requisition } | { error: string } {
  const vehicle = state.vehicles.find((v) => v.id === input.vehicleId);
  if (!vehicle) return { error: 'Vehicle not found.' };
  if (vehicle.status !== 'AVAILABLE')
    return { error: 'Selected vehicle is no longer available.' };

  const [id, nextState] = newId(state, 'TRP');
  const now = ts ?? nowIso();

  const req: Requisition = {
    id,
    unit: input.unit,
    dest: input.dest,
    purpose: input.purpose,
    dist: input.dist,
    eta: input.eta,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    status: 'PENDING',
    createdAt: now,
    token: null,
  };

  const vehicles = nextState.vehicles.map((v) =>
    v.id === input.vehicleId ? { ...v, status: 'RESERVED' as const } : v
  );

  const auditEntry: AuditEntry = {
    ts: now,
    action: 'TRIP_REQUISITION_SUBMITTED',
    actor: input.unit,
    resource: id,
    sig: mockSignature('TRIP_REQUISITION_SUBMITTED' + id, 0),
  };

  return {
    state: {
      ...nextState,
      vehicles,
      requisitions: [req, ...nextState.requisitions],
      auditLogs: [auditEntry, ...nextState.auditLogs],
    },
    req,
  };
}

// ── Requisition: Approve ─────────────────────────────────────────
export function approveRequisition(
  state: StoreState,
  reqId: string,
  ts?: string
): { state: StoreState; token: Token } | { error: string } {
  const idx = state.requisitions.findIndex((r) => r.id === reqId);
  if (idx === -1) return { error: 'Requisition not found.' };

  const req = state.requisitions[idx];
  if (req.status !== 'PENDING') return { error: `Cannot approve: status is ${req.status}.` };

  const now = ts ?? nowIso();
  const [tokenId, nextState] = newId(state, 'TOK');

  const payload = req.id + req.vehicleId + req.driverId + req.eta;
  const token: Token = {
    id: tokenId,
    sig: mockSignature(payload, 0),
    validFrom: now,
    validTo: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    revoked: false,
  };

  const requisitions = [...nextState.requisitions];
  requisitions[idx] = { ...req, status: 'APPROVED', token };

  const auditEntry: AuditEntry = {
    ts: now,
    action: 'TRIP_APPROVED_TOKEN_ISSUED',
    actor: 'MTO',
    resource: `${req.id} / ${tokenId}`,
    sig: mockSignature('TRIP_APPROVED_TOKEN_ISSUED' + req.id + tokenId, 0),
  };

  return {
    state: {
      ...nextState,
      requisitions,
      auditLogs: [auditEntry, ...nextState.auditLogs],
    },
    token,
  };
}

// ── Requisition: Reject ──────────────────────────────────────────
export function rejectRequisition(
  state: StoreState,
  reqId: string,
  ts?: string
): { state: StoreState } | { error: string } {
  const idx = state.requisitions.findIndex((r) => r.id === reqId);
  if (idx === -1) return { error: 'Requisition not found.' };

  const req = state.requisitions[idx];
  if (req.status !== 'PENDING') return { error: `Cannot reject: status is ${req.status}.` };

  const now = ts ?? nowIso();

  // Release vehicle
  const vehicles = state.vehicles.map((v) =>
    v.id === req.vehicleId && v.status === 'RESERVED'
      ? { ...v, status: 'AVAILABLE' as const }
      : v
  );

  const requisitions = [...state.requisitions];
  requisitions[idx] = { ...req, status: 'REJECTED' };

  const auditEntry: AuditEntry = {
    ts: now,
    action: 'TRIP_REJECTED',
    actor: 'MTO',
    resource: req.id,
    sig: mockSignature('TRIP_REJECTED' + req.id, 0),
  };

  return {
    state: {
      ...state,
      vehicles,
      requisitions,
      auditLogs: [auditEntry, ...state.auditLogs],
    },
  };
}

// ── Gate: Dispatch (Outbound) ────────────────────────────────────
export function dispatchVehicle(
  state: StoreState,
  vehicleId: string,
  odometer: number,
  fuel: number,
  gate: string,
  ts?: string
): { state: StoreState; gateLog: GateLog } | { error: string } {
  const reqIdx = state.requisitions.findIndex(
    (r) =>
      r.vehicleId === vehicleId &&
      (r.status === 'APPROVED' || r.status === 'DISPATCHED')
  );
  if (reqIdx === -1) return { error: 'No valid gate-pass token for this vehicle.' };

  const now = ts ?? nowIso();
  const requisitions = [...state.requisitions];
  requisitions[reqIdx] = {
    ...requisitions[reqIdx],
    status: 'DISPATCHED',
    outboundOdo: odometer,
    dispatchedAt: now,
  };

  const vehicles = state.vehicles.map((v) =>
    v.id === vehicleId
      ? { ...v, status: 'ON_SORTIE' as const, odometer, fuel }
      : v
  );

  const gateLog: GateLog = {
    ts: now,
    gate,
    vehicle: state.vehicles.find((v) => v.id === vehicleId)?.reg || vehicleId,
    direction: 'OUTBOUND',
    sentry: 'Sentry Duty Officer',
    flags: '—',
  };

  const auditEntry: AuditEntry = {
    ts: now,
    action: 'GATE_OUTBOUND',
    actor: `Sentry@${gate}`,
    resource: `${gateLog.vehicle} / ${requisitions[reqIdx].id}`,
    sig: mockSignature('GATE_OUTBOUND' + gateLog.vehicle, 0),
  };

  return {
    state: {
      ...state,
      vehicles,
      requisitions,
      gateLogs: [gateLog, ...state.gateLogs],
      auditLogs: [auditEntry, ...state.auditLogs],
    },
    gateLog,
  };
}

// ── Gate: Return (Inbound) ───────────────────────────────────────
export interface ReturnResult {
  state: StoreState;
  gateLog: GateLog;
  actualDist: number;
  flagged: boolean;
}

export function returnVehicle(
  state: StoreState,
  vehicleId: string,
  odometer: number,
  fuel: number,
  gate: string,
  ts?: string
): ReturnResult | { error: string } {
  const reqIdx = state.requisitions.findIndex(
    (r) => r.vehicleId === vehicleId && r.status === 'DISPATCHED'
  );
  if (reqIdx === -1) return { error: 'No dispatched trip found for this vehicle.' };

  const req = state.requisitions[reqIdx];
  const now = ts ?? nowIso();
  const actualDist = odometer - (req.outboundOdo ?? odometer);
  const flagged = actualDist > req.dist * 1.1;

  const requisitions = [...state.requisitions];
  requisitions[reqIdx] = {
    ...req,
    status: 'COMPLETED',
    inboundOdo: odometer,
    actualDist,
    completedAt: now,
  };

  const vehicles = state.vehicles.map((v) =>
    v.id === vehicleId
      ? { ...v, status: 'AVAILABLE' as const, odometer, fuel }
      : v
  );

  const vehicleReg = state.vehicles.find((v) => v.id === vehicleId)?.reg || vehicleId;
  const flag = flagged
    ? `AUDIT_ALERT: mileage +${actualDist - req.dist}km over plan`
    : '—';

  const gateLog: GateLog = {
    ts: now,
    gate,
    vehicle: vehicleReg,
    direction: 'INBOUND',
    sentry: 'Sentry Duty Officer',
    flags: flag,
  };

  const auditEntry: AuditEntry = {
    ts: now,
    action: flagged ? 'GATE_INBOUND_FLAGGED' : 'GATE_INBOUND',
    actor: `Sentry@${gate}`,
    resource: `${vehicleReg} / ${req.id}${flagged ? ' [ANOMALY]' : ''}`,
    sig: mockSignature(
      (flagged ? 'GATE_INBOUND_FLAGGED' : 'GATE_INBOUND') + vehicleReg,
      0
    ),
  };

  return {
    state: {
      ...state,
      vehicles,
      requisitions,
      gateLogs: [gateLog, ...state.gateLogs],
      auditLogs: [auditEntry, ...state.auditLogs],
    },
    gateLog,
    actualDist,
    flagged,
  };
}

// ── Derived Stats ─────────────────────────────────────────────────
export function computeStats(state: StoreState) {
  return {
    available: state.vehicles.filter((v) => v.status === 'AVAILABLE').length,
    onSortie: state.vehicles.filter((v) => v.status === 'ON_SORTIE').length,
    pending: state.requisitions.filter((r) => r.status === 'PENDING').length,
    overdue: state.requisitions.filter(
      (r) =>
        r.status === 'COMPLETED' &&
        r.actualDist !== undefined &&
        r.dist > 0 &&
        r.actualDist > r.dist * 1.1
    ).length,
  };
}

export function computeTrafficBuckets(state: StoreState): { hour: string; count: number }[] {
  const buckets: Record<number, number> = {};
  state.gateLogs.forEach((g) => {
    const h = new Date(g.ts).getHours();
    buckets[h] = (buckets[h] || 0) + 1;
  });
  return Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .map((h) => ({ hour: `${h}:00`, count: buckets[h] }));
}

// ── Initial State Factory ─────────────────────────────────────────
export function createInitialState(): StoreState {
  return {
    drivers: [
      { id: 'D1', name: 'Nb Sub Rakesh Yadav', unit: 'Alpha Coy', cardId: 'SC-2291' },
      { id: 'D2', name: 'Hav Suresh Pillai', unit: 'Bravo Coy', cardId: 'SC-2304' },
      { id: 'D3', name: 'Nk Vikram Thapa', unit: 'Alpha Coy', cardId: 'SC-2318' },
      { id: 'D4', name: 'Sep Anil Kumar', unit: 'Charlie Coy', cardId: 'SC-2340' },
    ],
    vehicles: [
      { id: 'V1', reg: '25A-4471', type: 'SUV (Gypsy)', unit: 'Alpha Coy', rfid: 'RFID-A17E9C', odometer: 18420, fuel: 78, status: 'AVAILABLE' },
      { id: 'V2', reg: '25B-1129', type: 'Truck (2.5T)', unit: 'Bravo Coy', rfid: 'RFID-B22F41', odometer: 52130, fuel: 54, status: 'AVAILABLE' },
      { id: 'V3', reg: '25A-8802', type: 'Bus (Personnel)', unit: 'HQ Coy', rfid: 'RFID-C90A17', odometer: 9110, fuel: 91, status: 'AVAILABLE' },
      { id: 'V4', reg: '25C-3305', type: 'SUV (Gypsy)', unit: 'Charlie Coy', rfid: 'RFID-D45B62', odometer: 31005, fuel: 40, status: 'MAINTENANCE' },
    ],
    requisitions: [],
    gateLogs: [],
    auditLogs: [],
    idCounter: 1000,
  };
}
