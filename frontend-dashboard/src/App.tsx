import React, { useState, useCallback, useEffect } from 'react';
import { Topbar } from './components/Topbar';
import { Sidebar, DashboardView } from './components/Sidebar';
import { CommanderDashboard } from './pages/CommanderDashboard';
import { RequisitionsPage } from './pages/RequisitionsPage';
import { GateKiosk } from './pages/GateKiosk';
import { FleetPage, FleetVehicle } from './pages/FleetPage';
import { MTOQueue } from './pages/MTOQueue';
import { SortieReconciliation } from './pages/SortieReconciliation';
import { AuditPage, AuditEntry } from './pages/AuditPage';
import { CommandPalette } from './components/CommandPalette';
import { NewMissionModal } from './components/NewMissionModal';
import { UserManagementModal } from './components/UserManagementModal';
import { SecurityStatusModal } from './components/SecurityStatusModal';
import { UserRole } from './services/api';

/* ============================================================
   M-FTAMS — fully in-memory prototype state manager.
   Replicates the spec: requisition → approval → token →
   outbound handshake → mission tracking → inbound handshake →
   reconciliation → audit trail.
   ============================================================ */

// ── Helpers ───────────────────────────────────────────────────────
let idCounter = 1000;
function newId(prefix: string) {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

function nowIso() {
  return new Date().toISOString();
}

function mockSignature(payload: string) {
  const str = payload + '|' + Date.now();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return (hex + hex.split('').reverse().join('')).slice(0, 40);
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Seed Data ─────────────────────────────────────────────────────
interface Driver {
  id: string;
  name: string;
  unit: string;
  cardId: string;
}

interface Vehicle {
  id: string;
  reg: string;
  type: string;
  unit: string;
  rfid: string;
  odometer: number;
  fuel: number;
  status: 'AVAILABLE' | 'RESERVED' | 'ON_SORTIE' | 'MAINTENANCE';
}

interface Requisition {
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
  token?: { id: string; sig: string; validFrom: string; validTo: string; revoked: boolean } | null;
  outboundOdo?: number;
  inboundOdo?: number;
  actualDist?: number;
  dispatchedAt?: string;
  completedAt?: string;
}

interface GateLog {
  ts: string;
  gate: string;
  vehicle: string;
  direction: string;
  sentry: string;
  flags: string;
}

const initialDrivers: Driver[] = [
  { id: 'D1', name: 'Nb Sub Rakesh Yadav', unit: 'Alpha Coy', cardId: 'SC-2291' },
  { id: 'D2', name: 'Hav Suresh Pillai', unit: 'Bravo Coy', cardId: 'SC-2304' },
  { id: 'D3', name: 'Nk Vikram Thapa', unit: 'Alpha Coy', cardId: 'SC-2318' },
  { id: 'D4', name: 'Sep Anil Kumar', unit: 'Charlie Coy', cardId: 'SC-2340' },
];

const initialVehicles: Vehicle[] = [
  { id: 'V1', reg: '25A-4471', type: 'SUV (Gypsy)', unit: 'Alpha Coy', rfid: 'RFID-A17E9C', odometer: 18420, fuel: 78, status: 'AVAILABLE' },
  { id: 'V2', reg: '25B-1129', type: 'Truck (2.5T)', unit: 'Bravo Coy', rfid: 'RFID-B22F41', odometer: 52130, fuel: 54, status: 'AVAILABLE' },
  { id: 'V3', reg: '25A-8802', type: 'Bus (Personnel)', unit: 'HQ Coy', rfid: 'RFID-C90A17', odometer: 9110, fuel: 91, status: 'AVAILABLE' },
  { id: 'V4', reg: '25C-3305', type: 'SUV (Gypsy)', unit: 'Charlie Coy', rfid: 'RFID-D45B62', odometer: 31005, fuel: 40, status: 'MAINTENANCE' },
];

// ── Toast System ──────────────────────────────────────────────────
interface ToastMsg {
  id: number;
  text: string;
  isErr: boolean;
}
let toastId = 0;

// ── App Component ─────────────────────────────────────────────────
export const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('COMMANDER');
  const [view, setView] = useState<DashboardView>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [drivers] = useState<Driver[]>(initialDrivers);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Modal State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewMissionModalOpen, setIsNewMissionModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Global Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Toast ───────────────────────────────────────────────────────
  const toast = useCallback((text: string, isErr = false) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, isErr }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // ── Audit Log ───────────────────────────────────────────────────
  const logAudit = useCallback(
    (action: string, actor: string, resource: string) => {
      setAuditLogs((prev) => [
        {
          ts: nowIso(),
          action,
          actor,
          resource,
          sig: mockSignature(action + resource),
        },
        ...prev,
      ]);
    },
    []
  );

  // ── Gate Event Log ──────────────────────────────────────────────
  const logGateEvent = useCallback(
    (event: { ts: string; gate: string; vehicle: string; direction: string; sentry: string; flags: string }) => {
      setGateLogs((prev) => [event, ...prev]);
    },
    []
  );

  // ── Requisition Submit ──────────────────────────────────────────
  const submitRequisition = useCallback(
    (data: {
      unit: string;
      dest: string;
      purpose: string;
      dist: number;
      eta: string;
      vehicleId: string;
      driverId: string;
    }) => {
      const vehicle = vehicles.find((v) => v.id === data.vehicleId);
      if (!vehicle || vehicle.status !== 'AVAILABLE') {
        toast('Selected vehicle is no longer available.', true);
        return;
      }

      const req: Requisition = {
        id: newId('TRP'),
        ...data,
        status: 'PENDING',
        createdAt: nowIso(),
        token: null,
      };
      setRequisitions((prev) => [req, ...prev]);
      setVehicles((prev) =>
        prev.map((v) => (v.id === data.vehicleId ? { ...v, status: 'RESERVED' as const } : v))
      );
      logAudit('TRIP_REQUISITION_SUBMITTED', data.unit, req.id);
      toast(`Requisition ${req.id} submitted for MTO approval.`);
    },
    [vehicles, toast, logAudit]
  );

  // ── Requisition Approve ─────────────────────────────────────────
  const approveRequisition = useCallback(
    (id: string) => {
      setRequisitions((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const payload = r.id + r.vehicleId + r.driverId + r.eta;
          const token = {
            id: newId('TOK'),
            sig: mockSignature(payload),
            validFrom: nowIso(),
            validTo: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
            revoked: false,
          };
          logAudit('TRIP_APPROVED_TOKEN_ISSUED', 'MTO', `${r.id} / ${token.id}`);
          toast(`Approved. Gate-pass token ${token.id} issued & signed.`);
          return { ...r, status: 'APPROVED' as const, token, createdAt: r.createdAt };
        })
      );
    },
    [toast, logAudit]
  );

  // ── Requisition Reject ──────────────────────────────────────────
  const rejectRequisition = useCallback(
    (id: string) => {
      setRequisitions((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          // Release the vehicle
          setVehicles((vs) =>
            vs.map((v) =>
              v.id === r.vehicleId && v.status === 'RESERVED'
                ? { ...v, status: 'AVAILABLE' as const }
                : v
            )
          );
          logAudit('TRIP_REJECTED', 'MTO', r.id);
          toast(`Requisition ${r.id} rejected.`, true);
          return { ...r, status: 'REJECTED' as const, createdAt: r.createdAt };
        })
      );
    },
    [toast, logAudit]
  );

  // ── Gate Kiosk: Dispatch (Outbound) ─────────────────────────────
  const handleDispatch = useCallback(
    (vehicleId: string, odometer: number, fuel: number) => {
      setRequisitions((prev) =>
        prev.map((r) => {
          if (r.vehicleId !== vehicleId || (r.status !== 'APPROVED' && r.status !== 'DISPATCHED'))
            return r;
          return { ...r, status: 'DISPATCHED' as const, outboundOdo: odometer, dispatchedAt: nowIso() };
        })
      );
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId
            ? { ...v, status: 'ON_SORTIE' as const, odometer, fuel }
            : v
        )
      );
    },
    []
  );

  // ── Gate Kiosk: Return (Inbound) ────────────────────────────────
  const handleReturn = useCallback(
    (vehicleId: string, odometer: number, fuel: number, flagged: boolean) => {
      setRequisitions((prev) =>
        prev.map((r) => {
          if (r.vehicleId !== vehicleId || r.status !== 'DISPATCHED') return r;
          const actualDist = odometer - (r.outboundOdo ?? odometer);
          return {
            ...r,
            status: 'COMPLETED' as const,
            inboundOdo: odometer,
            actualDist,
            completedAt: nowIso(),
          };
        })
      );
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId
            ? { ...v, status: 'AVAILABLE' as const, odometer, fuel }
            : v
        )
      );
    },
    []
  );

  // ── Role Change ─────────────────────────────────────────────────
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'COMMANDER' && (view === 'mto-queue' || view === 'flagged')) {
      setView('dashboard');
    }
  };

  // ── Emergency Lockout Action ────────────────────────────────────
  const handleEmergencyLockout = () => {
    logAudit('EMERGENCY_LOCKOUT_ACTUATED', `${role} User`, 'ALL_GATES_SHUT');
    toast('EMERGENCY LOCKOUT INITIATED: All gate booms lowered. Local nodes air-gapped.', true);
  };

  // ── Derived Data ────────────────────────────────────────────────
  const pendingCount = requisitions.filter((r) => r.status === 'PENDING').length;
  const flaggedCount = requisitions.filter(
    (r) =>
      r.status === 'COMPLETED' &&
      r.actualDist !== undefined &&
      r.dist > 0 &&
      r.actualDist > r.dist * 1.1
  ).length;

  // Dashboard stats
  const stats = {
    available: vehicles.filter((v) => v.status === 'AVAILABLE').length,
    onSortie: vehicles.filter((v) => v.status === 'ON_SORTIE').length,
    pending: pendingCount,
    overdue: flaggedCount,
  };

  // Active sorties for dashboard table
  const activeSorties = requisitions
    .filter((r) => r.status === 'DISPATCHED')
    .map((r) => {
      const v = vehicles.find((v) => v.id === r.vehicleId);
      const d = drivers.find((d) => d.id === r.driverId);
      const elapsedMin = Math.floor(
        (Date.now() - new Date(r.dispatchedAt || nowIso()).getTime()) / 60000
      );
      const overdue = r.eta ? Date.now() > new Date(r.eta).getTime() : false;
      return {
        vehicleReg: v?.reg || '—',
        driverName: d?.name || '—',
        destination: r.dest,
        elapsed: `${elapsedMin}m`,
        isOverdue: overdue,
      };
    });

  // Recent gate events
  const recentEvents = gateLogs.slice(0, 8).map((g) => ({
    time: fmtTime(g.ts),
    gate: g.gate,
    vehicle: g.vehicle,
    direction: g.direction,
    sentry: g.sentry,
    flags: g.flags,
  }));

  // Traffic chart — bucket by hour
  const buckets: Record<number, number> = {};
  gateLogs.forEach((g) => {
    const h = new Date(g.ts).getHours();
    buckets[h] = (buckets[h] || 0) + 1;
  });
  const maxVal = Math.max(1, ...Object.values(buckets));
  const hoursToShow = Object.keys(buckets).length
    ? Object.keys(buckets)
        .map(Number)
        .sort((a, b) => a - b)
    : [new Date().getHours()];
  const trafficData = hoursToShow.map((h) => ({
    hour: `${h}:00`,
    count: buckets[h] || 0,
    pct: Math.max(6, ((buckets[h] || 0) / maxVal) * 100),
  }));

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
      {/* Scanline overlay */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50 opacity-20" />

      {/* Top Header */}
      <Topbar
        currentRole={role}
        onRoleChange={handleRoleChange}
        currentView={view}
        onViewChange={setView}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={view}
          onViewChange={setView}
          currentRole={role}
          pendingCount={pendingCount}
          flaggedCount={flaggedCount}
          alertsCount={3}
          onNewMission={() => setIsNewMissionModalOpen(true)}
          onOpenUsers={() => setIsUserModalOpen(true)}
          onEmergencyLockout={handleEmergencyLockout}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 max-w-[1360px] w-full">
          {view === 'dashboard' && (
            <CommanderDashboard
              stats={stats}
              activeSorties={activeSorties}
              recentEvents={recentEvents}
              trafficData={trafficData}
            />
          )}

          {view === 'requisitions' && (
            <RequisitionsPage
              requisitions={requisitions}
              vehicles={vehicles}
              drivers={drivers}
              onSubmit={submitRequisition}
              onApprove={approveRequisition}
              onReject={rejectRequisition}
              currentRole={role}
            />
          )}

          {view === 'mto-queue' && (
            <MTOQueue
              requisitions={requisitions}
              vehicles={vehicles}
              drivers={drivers}
              onApprove={approveRequisition}
              onReject={rejectRequisition}
            />
          )}

          {(view === 'reconciliation' || view === 'flagged') && (
            <SortieReconciliation />
          )}

          {view === 'kiosk' && (
            <GateKiosk
              vehicles={vehicles}
              drivers={drivers}
              requisitions={requisitions}
              onDispatch={handleDispatch}
              onReturn={handleReturn}
              onToast={toast}
              onLogGateEvent={logGateEvent}
              onLogAudit={logAudit}
            />
          )}

          {view === 'fleet' && <FleetPage vehicles={vehicles} />}

          {view === 'audit' && <AuditPage auditLogs={auditLogs} />}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(targetView) => {
          setView(targetView);
          setIsCommandPaletteOpen(false);
        }}
        onNewMission={() => {
          setIsCommandPaletteOpen(false);
          setIsNewMissionModalOpen(true);
        }}
      />

      {/* New Mission Multi-Step Requisition Modal */}
      <NewMissionModal
        isOpen={isNewMissionModalOpen}
        onClose={() => setIsNewMissionModalOpen(false)}
        onSubmit={(missionData) => {
          submitRequisition(missionData);
          setIsNewMissionModalOpen(false);
        }}
        vehicles={vehicles}
        drivers={drivers}
      />

      {/* User Management & Station RBAC Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentRole={role}
      />

      {/* Security CA & NTP Stratum-1 Status Modal */}
      <SecurityStatusModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Toast Stack */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`font-mono text-[11.5px] bg-panel border text-text px-4 py-2.5 rounded shadow-xl min-w-[240px] animate-[toastin_0.2s_ease] border-l-[3px] ${
              t.isErr ? 'border-l-red border-line' : 'border-l-gold border-gold/40'
            }`}
            style={{ animation: 'toastin 0.2s ease' }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
};

