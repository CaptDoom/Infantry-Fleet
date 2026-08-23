import React, { useState, useEffect } from 'react';
import {
  Send,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Sun,
  Shield,
  Truck,
  Printer,
  X,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { ChitModal } from '../components/ChitModal';

export interface ReqVehicle {
  id: string;
  reg: string;
  type: string;
  status: string;
}

export interface ReqDriver {
  id: string;
  name: string;
  unit: string;
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
  token?: { id: string; sig: string } | null;
  createdAt: string;
}

interface RequisitionsPageProps {
  requisitions: Requisition[];
  vehicles: ReqVehicle[];
  drivers: ReqDriver[];
  onSubmit: (req: Omit<Requisition, 'id' | 'status' | 'token' | 'createdAt'>) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  currentRole: string;
}

export const RequisitionsPage: React.FC<RequisitionsPageProps> = ({
  requisitions,
  vehicles,
  drivers,
  onSubmit,
  onApprove,
  onReject,
  currentRole,
}) => {
  const [dest, setDest] = useState('LZ-ECHO 44.9N 12.3E');
  const [purpose, setPurpose] = useState('Troop Transport');
  const [dist, setDist] = useState(145);
  const [departureTime, setDepartureTime] = useState('04, 08:00 AM');
  const [returnEta, setReturnEta] = useState('05/20/2026, 06:00 PM');
  const [tacticalNotes, setTacticalNotes] = useState(
    'Route ALPHA compromised. Recommend alternate via canyon pass. Weather clear.'
  );
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [selectedTokenForChit, setSelectedTokenForChit] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'table'>('create');

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dest || !purpose || !dist) return;
    onSubmit({
      unit: '1st Logistics (4 RAJPUT, Alpha Coy)',
      dest,
      purpose,
      dist,
      eta: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      vehicleId: vehicleId || vehicles[0]?.id || 'V1',
      driverId: driverId || drivers[0]?.id || 'D1',
    });
    setActiveTab('table');
  };

  const handleAbort = () => {
    setDest('');
    setTacticalNotes('');
  };

  return (
    <div className="space-y-4 animate-fade-in text-text">
      {/* Header (Stitch Screen 4) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-text">
            SORTIE REQUISITION
          </h1>
          <p className="text-xs text-text-dim font-sans mt-0.5">
            Stage 1: Authorization required prior to dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded bg-panel border border-gold/40 text-gold font-mono text-xs font-bold uppercase tracking-wider shadow-sm">
            REQUISITION ID: REQ-8472-ALX
          </div>

          <div className="flex gap-1 bg-panel border border-line p-1 rounded font-mono text-xs">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'create' ? 'bg-gold text-bg font-bold' : 'text-text-dim hover:text-text'
              }`}
            >
              Stage 1 Requisition
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'table' ? 'bg-gold text-bg font-bold' : 'text-text-dim hover:text-text'
              }`}
            >
              All Requisitions ({requisitions.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'create' ? (
        /* Stage 1 Layout: Form + Area Map (Stitch Screen 4) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left 2 Cols: MISSION PARAMETERS */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 bg-panel border border-line rounded-lg p-5 shadow-lg space-y-4"
          >
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-text pb-2 border-b border-line">
              MISSION PARAMETERS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Destination Coordinates / Facility
                </label>
                <input
                  required
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  placeholder="e.g. LZ-ECHO 44.9N 12.3E"
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Primary Purpose
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
                >
                  <option value="Troop Transport">Troop Transport</option>
                  <option value="Ammunition Resupply">Ammunition Resupply</option>
                  <option value="Medevac Standby">Medevac Standby</option>
                  <option value="Convoy Escort">Convoy Escort</option>
                  <option value="Reconnaissance Patrol">Reconnaissance Patrol</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Planned Distance (KM)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={dist}
                  onChange={(e) => setDist(Number(e.target.value))}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Req. Departure (ZULU)
                </label>
                <input
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Expected Return ETA (ZULU)
                </label>
                <input
                  value={returnEta}
                  onChange={(e) => setReturnEta(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Bind Fleet Asset
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg} — {v.type} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Bind Designated Driver
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                Tactical Notes / Hazards
              </label>
              <textarea
                rows={3}
                value={tacticalNotes}
                onChange={(e) => setTacticalNotes(e.target.value)}
                className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={handleAbort}
                className="px-5 py-2 rounded bg-panel-2 border border-line hover:border-red text-text-dim hover:text-red font-mono text-xs uppercase font-bold transition-all"
              >
                Abort
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 rounded bg-panel-2 hover:bg-gold hover:text-bg border border-gold text-gold font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Submit Requisition</span>
              </button>
            </div>
          </form>

          {/* Right 1 Col: AREA MAP & Tactical Info Panel (Stitch Screen 4) */}
          <div className="bg-panel border border-line rounded-lg p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-text pb-2 border-b border-line">
              <MapPin className="w-4 h-4 text-gold" />
              <span>AREA MAP</span>
            </div>

            {/* Tactical Radar Display */}
            <div className="relative w-full h-[180px] rounded-lg bg-[#060a12] border border-line overflow-hidden p-3 flex flex-col justify-between">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-[140px] h-[140px] rounded-full border border-cyan"></div>
                <div className="w-[80px] h-[80px] rounded-full border border-cyan"></div>
                <div className="absolute w-full h-[1px] bg-cyan"></div>
                <div className="absolute h-full w-[1px] bg-cyan"></div>
              </div>
              <div className="absolute top-[35%] left-[45%] w-2 h-2 rounded-full bg-gold animate-ping"></div>
              <div className="absolute top-[35%] left-[45%] w-2 h-2 rounded-full bg-gold"></div>
              <div className="absolute top-[45%] left-[48%] px-1.5 py-0.5 rounded bg-bg/90 border border-gold text-gold font-mono text-[8px] font-bold">
                LZ-ECHO (145km)
              </div>
              <div className="relative z-10 font-mono text-[8px] text-cyan/70">
                RADAR GRID SECURE // LZ-ECHO ACTIVE
              </div>
              <div className="relative z-10 font-mono text-[8px] text-text-faint">
                BEARING: 042° NNE // ELEV: 1,420M
              </div>
            </div>

            {/* Tactical Status Cards */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-panel-2 border border-line">
                <span className="text-text-dim">Threat Level</span>
                <span className="px-2 py-0.5 rounded bg-gold/20 border border-gold/40 text-gold font-bold text-[10px]">
                  ELEVATED
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-panel-2 border border-line">
                <span className="text-text-dim">Weather</span>
                <span className="text-emerald flex items-center gap-1.5 text-[11px] font-bold">
                  <Sun className="w-3.5 h-3.5" /> Clear
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-panel-2 border border-line">
                <span className="text-text-dim">Available Fleet</span>
                <span className="text-text font-bold text-[11px]">8 Vehicles</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* All Requisitions Table */
        <div className="bg-panel border border-line rounded-lg p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text">
              Active Unit Requisitions ({requisitions.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line text-text-faint font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">REQ ID</th>
                  <th className="py-2.5 px-3">UNIT</th>
                  <th className="py-2.5 px-3">DESTINATION</th>
                  <th className="py-2.5 px-3">DISTANCE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">ACTION / CHIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft font-sans">
                {requisitions.map((r) => (
                  <tr key={r.id} className="hover:bg-panel-2 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-text">{r.id}</td>
                    <td className="py-3 px-3 text-text-dim">{r.unit}</td>
                    <td className="py-3 px-3 text-text">{r.dest}</td>
                    <td className="py-3 px-3 font-mono text-text-dim">{r.dist} km</td>
                    <td className="py-3 px-3 font-mono">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border bg-panel-3 text-gold border-gold/30">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.token ? (
                        <button
                          onClick={() => setSelectedTokenForChit(r.token!.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-panel-2 border border-gold hover:bg-gold hover:text-bg text-gold font-mono text-[10px] uppercase font-bold transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Chit</span>
                        </button>
                      ) : (
                        <span className="text-text-faint font-mono text-[10px]">Awaiting MTO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chit Modal */}
      {selectedTokenForChit && (
        <ChitModal
          isOpen={!!selectedTokenForChit}
          onClose={() => setSelectedTokenForChit(null)}
          tokenId={selectedTokenForChit}
        />
      )}
    </div>
  );
};


