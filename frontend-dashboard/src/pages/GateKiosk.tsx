import React, { useState } from 'react';
import {
  Scan,
  QrCode,
  Truck,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  XCircle,
  Sliders,
  CheckCircle2,
  Lock,
  Radio
} from 'lucide-react';
import { OverrideModal } from '../../../frontend-kiosk/src/components/OverrideModal';

export interface KioskVehicle {
  id: string;
  reg: string;
  type: string;
  unit: string;
  rfid: string;
  odometer: number;
  fuel: number;
  status: 'AVAILABLE' | 'RESERVED' | 'ON_SORTIE' | 'MAINTENANCE';
}

export interface KioskDriver {
  id: string;
  name: string;
  unit: string;
  cardId: string;
}

export interface KioskRequisition {
  id: string;
  unit: string;
  dest: string;
  purpose: string;
  dist: number;
  eta: string;
  vehicleId: string;
  driverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPATCHED' | 'COMPLETED';
  token?: {
    id: string;
    sig: string;
  } | null;
  outboundOdo?: number;
}

interface GateKioskProps {
  vehicles: KioskVehicle[];
  drivers: KioskDriver[];
  requisitions: KioskRequisition[];
  onDispatch: (vehicleId: string, odometer: number, fuel: number) => void;
  onReturn: (vehicleId: string, odometer: number, fuel: number, flagged: boolean) => void;
  onToast: (msg: string, isErr?: boolean) => void;
  onLogGateEvent: (event: { ts: string; gate: string; vehicle: string; direction: string; sentry: string; flags: string }) => void;
  onLogAudit: (action: string, actor: string, resource: string) => void;
}

export const GateKiosk: React.FC<GateKioskProps> = ({
  vehicles,
  drivers,
  requisitions,
  onDispatch,
  onReturn,
  onToast,
  onLogGateEvent,
  onLogAudit,
}) => {
  const [direction, setDirection] = useState<'OUTBOUND' | 'INBOUND'>('OUTBOUND');
  const [isScanning, setIsScanning] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<KioskVehicle | null>(null);
  const [activeDriver, setActiveDriver] = useState<KioskDriver | null>(null);
  const [activeReq, setActiveReq] = useState<KioskRequisition | null>(null);
  const [odometer, setOdometer] = useState<number>(18420);
  const [fuelLevel, setFuelLevel] = useState<number>(50);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const eligibleVehicles = vehicles.filter((v) =>
    direction === 'OUTBOUND' ? v.status === 'RESERVED' : v.status === 'ON_SORTIE'
  );

  const handleSimulateScan = (vehicle?: KioskVehicle) => {
    const target = vehicle || eligibleVehicles[0] || vehicles[0];
    if (!target) {
      onToast('No vehicle matching current gate direction.', true);
      return;
    }

    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsScanned(true);
      setActiveVehicle(target);
      setOdometer(target.odometer);
      setFuelLevel(target.fuel);

      const matchedReq = requisitions.find(
        (r) =>
          r.vehicleId === target.id &&
          (r.status === 'APPROVED' || r.status === 'DISPATCHED')
      ) || requisitions[0];

      setActiveReq(matchedReq || null);

      const matchedDriver = drivers.find((d) => d.id === matchedReq?.driverId) || drivers[0];
      setActiveDriver(matchedDriver || null);

      onToast(`RFID scanned: ${target.reg} (${target.type}) — Token verified.`);
    }, 600);
  };

  const handleClear = () => {
    setIsScanned(false);
    setActiveVehicle(null);
    setActiveDriver(null);
    setActiveReq(null);
    setOdometer(18420);
    setFuelLevel(50);
  };

  const handleAuthorize = () => {
    if (!activeVehicle || !activeReq) return;

    if (direction === 'OUTBOUND') {
      onDispatch(activeVehicle.id, odometer, fuelLevel);
      onLogGateEvent({
        ts: new Date().toISOString(),
        gate: 'GATE-04 (MAIN)',
        vehicle: activeVehicle.reg,
        direction: 'OUTBOUND',
        sentry: 'Sentry Duty Officer',
        flags: '—',
      });
      onLogAudit('GATE_OUTBOUND', 'Sentry@Gate-04', `${activeVehicle.reg} / ${activeReq.id}`);
      onToast(`${activeVehicle.reg} authorized OUTBOUND. Boom-barrier actuated.`);
    } else {
      const actualDist = odometer - (activeReq.outboundOdo ?? odometer);
      const overLimit = actualDist > activeReq.dist * 1.1;
      onReturn(activeVehicle.id, odometer, fuelLevel, overLimit);
      onLogGateEvent({
        ts: new Date().toISOString(),
        gate: 'GATE-04 (MAIN)',
        vehicle: activeVehicle.reg,
        direction: 'INBOUND',
        sentry: 'Sentry Duty Officer',
        flags: overLimit ? `AUDIT_ALERT: +${actualDist - activeReq.dist}km deviation` : '—',
      });
      onLogAudit(
        overLimit ? 'GATE_INBOUND_FLAGGED' : 'GATE_INBOUND',
        'Sentry@Gate-04',
        `${activeVehicle.reg} / ${activeReq.id}`
      );
      onToast(`${activeVehicle.reg} authorized INBOUND. Handshake closed.`);
    }

    handleClear();
  };

  const handleOverrideSubmit = (remarks: string, sentryId: string) => {
    setShowOverrideModal(false);
    if (!activeVehicle) return;
    onLogAudit('GATE_OVERRIDE_FLAGGED', sentryId, `${activeVehicle.reg} - ${remarks}`);
    onToast(`Override logged for ${activeVehicle.reg}. Flagged in immutable audit trail.`);
    handleAuthorize();
  };

  return (
    <div className="space-y-4 animate-fade-in text-text">
      {/* Header (Stitch Screen 3) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-line">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-xl font-bold tracking-tight text-text">
            SENTRY KIOSK
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-panel-2 border border-line text-text-dim font-mono">
            AIR-GAPPED ACCESS TERMINAL
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald/10 border border-emerald/30 text-emerald font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald animate-pulse"></span>
            <span>ONLINE — READY</span>
          </div>
        </div>
      </div>

      {/* 2-Column Sentry Interface (Stitch Screen 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (4 Cols): Direction Select & Scan Box */}
        <div className="lg:col-span-4 space-y-4">
          {/* Outbound / Inbound Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setDirection('OUTBOUND');
                handleClear();
              }}
              className={`p-4 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all ${
                direction === 'OUTBOUND'
                  ? 'bg-panel-2 border-gold text-gold shadow-md'
                  : 'bg-panel border-line text-text-dim hover:text-text'
              }`}
            >
              <ArrowUpRight className="w-6 h-6 text-gold" />
              <span>New Outbound</span>
            </button>

            <button
              onClick={() => {
                setDirection('INBOUND');
                handleClear();
              }}
              className={`p-4 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all ${
                direction === 'INBOUND'
                  ? 'bg-panel-2 border-cyan text-cyan shadow-md'
                  : 'bg-panel border-line text-text-dim hover:text-text'
              }`}
            >
              <ArrowDownLeft className="w-6 h-6 text-cyan" />
              <span>New Inbound</span>
            </button>
          </div>

          {/* Dotted Scan ID / Vehicle Tag Box (Stitch Screen 3) */}
          <div
            onClick={() => handleSimulateScan()}
            className={`h-72 rounded-lg bg-panel border-2 border-dashed flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer transition-all ${
              isScanning
                ? 'border-gold bg-gold/5 animate-pulse'
                : isScanned
                ? 'border-emerald bg-emerald/5'
                : 'border-emerald/40 hover:border-emerald bg-[#060a12]'
            }`}
          >
            <div className="w-16 h-16 rounded-xl border border-emerald/50 flex items-center justify-center bg-emerald/10 text-emerald">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="font-mono text-sm font-bold text-text">
              {isScanning
                ? 'DECODING RFID / 2D QR...'
                : isScanned
                ? 'TOKEN & ASSET VERIFIED'
                : 'Scan ID or Vehicle Tag'}
            </div>

            <div className="font-sans text-xs text-text-dim">
              Tap to simulate RFID read or QR scan from local SQLite cache
            </div>
          </div>

          {/* Override & Remarks Button */}
          <button
            onClick={() => setShowOverrideModal(true)}
            className="w-full py-3 px-4 rounded-lg bg-panel border border-red/40 hover:bg-red/10 text-red font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>⚠ Override &amp; Remarks</span>
          </button>
        </div>

        {/* Right Column (8 Cols): Active Verification & Telemetry Entry */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Verification Card (Stitch Screen 3) */}
          <div className="bg-panel border border-line rounded-lg p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-text">
                Active Verification
              </span>
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  isScanned
                    ? 'bg-emerald/20 border-emerald text-emerald'
                    : 'bg-panel-3 border-line text-text-faint'
                }`}
              >
                {isScanned ? 'ASSET VERIFIED' : 'WAITING FOR SCAN'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Driver Photo Placeholder Box */}
              <div className="p-4 rounded-lg bg-panel-2 border border-line flex flex-col justify-between h-48">
                <div className="font-mono text-[10px] text-text-faint uppercase tracking-wider">
                  DRIVER PHOTO &amp; BIOMETRIC
                </div>
                <div className="flex-1 flex flex-col items-center justify-center my-2">
                  <div className="w-16 h-16 rounded-full bg-bg border border-line flex items-center justify-center text-text-dim text-2xl">
                    👤
                  </div>
                  {activeDriver && (
                    <div className="font-sans font-bold text-xs text-text mt-2">
                      {activeDriver.name}
                    </div>
                  )}
                </div>
                <div className="font-mono text-[11px] text-text-dim pt-2 border-t border-line/60 flex items-center justify-between">
                  <span>ID:</span>
                  <span className="text-text font-bold">
                    {activeDriver ? activeDriver.cardId : '---'}
                  </span>
                </div>
              </div>

              {/* Vehicle Plate Placeholder Box */}
              <div className="p-4 rounded-lg bg-panel-2 border border-line flex flex-col justify-between h-48">
                <div className="font-mono text-[10px] text-text-faint uppercase tracking-wider">
                  VEHICLE PLATE &amp; RFID
                </div>
                <div className="flex-1 flex flex-col items-center justify-center my-2">
                  <div className="w-16 h-16 rounded-lg bg-bg border border-line flex items-center justify-center text-text-dim text-2xl">
                    🚙
                  </div>
                  {activeVehicle && (
                    <div className="font-mono font-bold text-xs text-gold mt-2">
                      {activeVehicle.reg}
                    </div>
                  )}
                </div>
                <div className="font-mono text-[11px] text-text-dim pt-2 border-t border-line/60 flex items-center justify-between">
                  <span>TAG: <strong className="text-text">{activeVehicle ? activeVehicle.rfid : '---'}</strong></span>
                  <span>CLASS: <strong className="text-text">{activeVehicle ? activeVehicle.type.split(' ')[0] : '---'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Telemetry Entry (Stitch Screen 3) */}
          <div className="bg-panel border border-line rounded-lg p-5 shadow-lg space-y-4">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-text pb-2 border-b border-line">
              Manual Telemetry Entry
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  ODOMETER (KM)
                </label>
                <input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  placeholder="000,000"
                  className="w-full bg-bg border border-line rounded px-3 py-2.5 text-sm font-mono text-text outline-none focus:border-gold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  <span>FUEL LEVEL</span>
                  <span className="text-gold font-bold">{fuelLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(Number(e.target.value))}
                  className="w-full accent-gold bg-bg h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                onClick={handleClear}
                className="px-6 py-2.5 rounded bg-panel-2 border border-line hover:border-line-soft text-text-dim hover:text-text font-mono text-xs uppercase font-bold transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleAuthorize}
                disabled={!isScanned}
                className="px-8 py-2.5 rounded bg-panel-2 hover:bg-gold hover:text-bg border border-gold text-gold font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                Authorize &amp; Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sentry Override Modal */}
      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        onSubmit={handleOverrideSubmit}
        reason="Biometric / RFID mismatch at gate"
      />
    </div>
  );
};

