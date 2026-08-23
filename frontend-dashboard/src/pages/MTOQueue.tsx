import React, { useState } from 'react';
import {
  Search,
  CheckSquare,
  AlertTriangle,
  Clock,
  Truck,
  Shield,
  Send,
  Package,
  Route,
  CheckCircle2,
  XCircle,
  Link as LinkIcon
} from 'lucide-react';

interface MTORequisition {
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
}

interface MTOVehicle {
  id: string;
  reg: string;
  type: string;
  status: string;
}

interface MTODriver {
  id: string;
  name: string;
  unit: string;
}

interface MTOQueueProps {
  requisitions: MTORequisition[];
  vehicles: MTOVehicle[];
  drivers: MTODriver[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const MTOQueue: React.FC<MTOQueueProps> = ({
  requisitions,
  vehicles,
  drivers,
  onApprove,
  onReject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(requisitions[0]?.id || 'REQ-7729-AX');
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicles[0]?.id || '');
  const [selectedDriver, setSelectedDriver] = useState<string>(drivers[0]?.id || '');
  const [bindingInProgress, setBindingInProgress] = useState(false);

  // Fallback demo requisitions matching Stitch Screenshot 5
  const demoCards = [
    {
      id: 'REQ-7729-AX',
      priority: 'CRITICAL PRIORITY',
      status: 'AWAITING MTO',
      title: 'Ammo Resupply - FOB Delta',
      requester: 'CPT. J. Riker, 3rd Inf',
      etaInfo: '1400Z TGT',
      vehicleReq: '1x MTV',
      unit: '3rd Infantry Division, B Co.',
      poc: 'CPT. J. Riker (Comm: 889-441-2)',
      timeToTarget: '02:14:59',
      origin: 'Camp Alpha (Grid XRay)',
      dest: 'FOB Delta (Grid Zulu)',
      routeCondition: 'AMBER',
      cargo: [
        { item: '5.56mm (M855A1)', qty: 'x10,000 rds' },
        { item: 'AT4 Anti-Armor', qty: 'x12 units' },
        { item: 'Class IV Medical', qty: 'x2 crates' },
      ],
      totalWeight: '3,450 lbs'
    },
    {
      id: 'REQ-7730-BZ',
      priority: 'HIGH PRIORITY',
      status: 'AWAITING MTO',
      title: 'Medevac Standby',
      requester: 'MAJ. E. Vance, 1st Med',
      etaInfo: 'ASAP',
      vehicleReq: '1x M997A3',
      unit: '1st Medical Evacuation Battalion',
      poc: 'MAJ. E. Vance (Comm: 889-442-1)',
      timeToTarget: '00:45:00',
      origin: 'Station Hospital',
      dest: 'Sector 4 Forward Triage',
      routeCondition: 'GREEN',
      cargo: [
        { item: 'Trauma Packs Level 3', qty: 'x8 units' },
        { item: 'Blood Units (O-Neg)', qty: 'x12 bags' },
      ],
      totalWeight: '420 lbs'
    }
  ];

  // Merge state requisitions with demo items
  const displayCards = [
    ...requisitions.map((r) => ({
      id: r.id,
      priority: 'STANDARD PRIORITY',
      status: r.status === 'PENDING' ? 'AWAITING MTO' : r.status,
      title: r.purpose || 'Troop Transport',
      requester: r.unit,
      etaInfo: '1600Z TGT',
      vehicleReq: '1x 4x4 Troop Carrier',
      unit: r.unit,
      poc: 'Duty Officer (Comm: 889-100-0)',
      timeToTarget: '03:30:00',
      origin: 'Camp Alpha (Grid XRay)',
      dest: r.dest,
      routeCondition: 'GREEN',
      cargo: [
        { item: 'Standard Field Gear', qty: 'x12 sets' },
        { item: 'Rations (MRE 24h)', qty: 'x24 boxes' },
      ],
      totalWeight: '1,800 lbs'
    })),
    ...demoCards
  ];

  const filteredCards = displayCards.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCard = displayCards.find((c) => c.id === selectedId) || displayCards[0];

  const handleInitiateBinding = () => {
    setBindingInProgress(true);
    setTimeout(() => {
      onApprove(activeCard.id);
      setBindingInProgress(false);
    }, 400);
  };

  return (
    <div className="space-y-4 animate-fade-in text-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-text">
            MTO Pending Approvals &amp; Asset Binding
          </h1>
          <p className="text-xs text-text-dim font-sans mt-0.5">
            Stage 2: MTO verifies mission parameters, binds capable asset &amp; driver, and mints HMAC gate-pass token.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-gold bg-panel border border-line px-3 py-1.5 rounded">
          <CheckSquare className="w-4 h-4" />
          <span>{filteredCards.length} REQUISITIONS IN QUEUE</span>
        </div>
      </div>

      {/* 2-Column Master-Detail Layout (Stitch Screen 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (5 Cols): Pending Requisitions List */}
        <div className="lg:col-span-5 bg-panel border border-line rounded-lg p-4 shadow-lg space-y-3">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-text pb-2 border-b border-line">
            Pending Requisitions
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 bg-bg border border-line rounded px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-text-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search REQ ID or Unit..."
              className="bg-transparent text-text placeholder:text-text-faint outline-none font-sans w-full"
            />
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
            {filteredCards.map((card) => {
              const isSelected = card.id === activeCard.id;
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedId(card.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-panel-2 border-gold shadow-md'
                      : 'bg-bg/50 border-line hover:border-line-soft hover:bg-panel-2/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-gold">{card.id}</span>
                    <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase bg-red/20 text-red border border-red/40">
                      {card.priority}
                    </span>
                  </div>

                  <div className="font-sans font-bold text-sm text-text mb-1">{card.title}</div>
                  <div className="text-[11px] text-text-dim mb-2 font-sans">
                    Requested by: <span className="text-text">{card.requester}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-text-faint border-t border-line/60 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-text-dim" />
                      <span>{card.etaInfo}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3 h-3 text-text-dim" />
                      <span>{card.vehicleReq}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 Cols): Selected Requisition Detail (Stitch Screen 5) */}
        <div className="lg:col-span-7 bg-panel border border-line rounded-lg p-5 shadow-lg space-y-4">
          {/* Detail Title Bar */}
          <div className="flex items-start justify-between pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-lg font-bold text-gold">{activeCard.id}</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-red/20 text-red border border-red/40">
                  {activeCard.priority}
                </span>
              </div>
              <h2 className="font-sans text-base font-bold text-text">{activeCard.title}</h2>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-text-faint uppercase tracking-wider">TIME TO TARGET</div>
              <div className="text-xl font-bold text-amber">{activeCard.timeToTarget}</div>
            </div>
          </div>

          {/* Requesting Unit Info */}
          <div className="p-3 rounded-lg bg-panel-2 border border-line space-y-1 text-xs">
            <div className="font-mono text-[10px] text-text-faint uppercase tracking-wider">
              REQUESTING UNIT
            </div>
            <div className="font-bold text-text">{activeCard.unit}</div>
            <div className="text-text-dim text-[11px] font-mono">POC: {activeCard.poc}</div>
          </div>

          {/* Cargo Payload Table (Stitch Layout) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs text-text-dim">
              <div className="flex items-center gap-1.5 uppercase font-bold text-text">
                <Package className="w-4 h-4 text-gold" />
                <span>CARGO PAYLOAD</span>
              </div>
              <span className="text-text font-bold">Total Est. Wgt: {activeCard.totalWeight}</span>
            </div>

            <div className="border border-line rounded-lg overflow-hidden bg-bg">
              <table className="w-full text-left border-collapse text-xs">
                <tbody className="divide-y divide-line font-mono">
                  {activeCard.cargo.map((item, i) => (
                    <tr key={i} className="hover:bg-panel-2">
                      <td className="py-2 px-3 text-text">{item.item}</td>
                      <td className="py-2 px-3 text-right text-text-dim font-bold">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Routing Information (Stitch Layout) */}
          <div className="p-3 rounded-lg bg-[#060a12] border border-line space-y-1 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-cyan font-bold uppercase mb-1">
              <Route className="w-4 h-4" />
              <span>ROUTING INFORMATION</span>
            </div>
            <div className="text-text-dim text-[11px]">ORIGIN: {activeCard.origin}</div>
            <div className="text-text-dim text-[11px]">DEST: {activeCard.dest}</div>
            <div className="text-amber font-bold text-[11px]">
              ROUTE CONDITION: {activeCard.routeCondition}
            </div>
          </div>

          {/* Asset & Driver Binding Selectors */}
          <div className="p-4 rounded-lg bg-panel-2 border border-gold/30 space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-gold uppercase tracking-wider">
              <LinkIcon className="w-4 h-4" />
              <span>MTO ACTION REQUIRED — BIND ASSET &amp; DRIVER</span>
            </div>
            <p className="text-[11px] text-text-dim font-sans leading-relaxed">
              This requisition requires asset binding. Select a capable vehicle and an authorized driver to generate the gate pass and dispatch order.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase mb-1">
                  Bind Vehicle
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-2.5 py-1.5 text-xs font-mono text-text outline-none focus:border-gold"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg} — {v.type} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase mb-1">
                  Bind Driver
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full bg-bg border border-line rounded px-2.5 py-1.5 text-xs font-mono text-text outline-none focus:border-gold"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => onReject(activeCard.id)}
                className="px-4 py-2 rounded bg-panel border border-red/40 hover:bg-red/10 text-red font-mono text-xs uppercase font-bold transition-all"
              >
                Reject Requisition
              </button>
              <button
                onClick={handleInitiateBinding}
                disabled={bindingInProgress}
                className="flex items-center gap-2 px-6 py-2 rounded bg-gold hover:bg-gold-bright text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg disabled:opacity-50"
              >
                <Truck className="w-4 h-4" />
                <span>{bindingInProgress ? 'MINTING TOKEN...' : 'Initiate Approve & Bind'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

