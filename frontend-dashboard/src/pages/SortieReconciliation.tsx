import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  FileCheck,
  RotateCcw,
  Eye,
  Check,
  X
} from 'lucide-react';

interface SortieRecord {
  id: string;
  missionType: string;
  route: string;
  plannedDist: number;
  actualDist: number;
  vehicleReg: string;
  driverName: string;
  departureTime: string;
  returnTime: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Active' | 'In Transit' | 'Delivered' | 'Reconciled' | 'Closed';
  deviationPct: number;
  isFlagged: boolean;
  notes?: string;
}

export const SortieReconciliation: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<string>('Reconciled');
  const [searchQuery, setSearchQuery] = useState('');
  const [investigatingSortie, setInvestigatingSortie] = useState<SortieRecord | null>(null);
  const [investigationRemarks, setInvestigationRemarks] = useState('');

  const subTabs = [
    'Draft',
    'Pending',
    'Approved',
    'Active',
    'In Transit',
    'Delivered',
    'Reconciled',
    'Closed'
  ];

  const [sorties, setSorties] = useState<SortieRecord[]>([
    {
      id: 'MSN-9942-A',
      missionType: 'Troop Transport',
      route: 'HQ -> Sector 4',
      plannedDist: 40,
      actualDist: 42,
      vehicleReg: 'V-1024 (AL 4x4)',
      driverName: 'Nb Sub Rakesh Yadav',
      departureTime: '08:00z',
      returnTime: '13:30z',
      status: 'Reconciled',
      deviationPct: 5.0,
      isFlagged: false,
      notes: 'Standard troop relief cycle.'
    },
    {
      id: 'MSN-9943-B',
      missionType: 'Ammunition Resupply',
      route: 'Base Depot -> FOB Bravo',
      plannedDist: 140,
      actualDist: 145,
      vehicleReg: 'V-0944 (Tata 2.5T)',
      driverName: 'Nk Vikram Thapa',
      departureTime: '06:30z',
      returnTime: '14:15z',
      status: 'Reconciled',
      deviationPct: 3.5,
      isFlagged: false,
      notes: 'Road detour around landslide.'
    },
    {
      id: 'MSN-9944-C',
      missionType: 'Convoy Patrol',
      route: 'Camp Alpha -> Highway 1A',
      plannedDist: 85,
      actualDist: 88,
      vehicleReg: 'V-0892 (Gypsy MP)',
      driverName: 'Hav Suresh Pillai',
      departureTime: '09:00z',
      returnTime: '15:00z',
      status: 'Reconciled',
      deviationPct: 3.5,
      isFlagged: false,
      notes: 'Routine security sweep.'
    }
  ]);

  const deviations: SortieRecord[] = [
    {
      id: 'TRP-8821-X',
      missionType: 'Border Recon Patrol',
      route: 'LZ-Echo -> Sector 4 Border Post',
      plannedDist: 40.0,
      actualDist: 45.6,
      vehicleReg: 'V-0892 (Gypsy MP)',
      driverName: 'Hav Suresh Pillai',
      departureTime: '07:00z',
      returnTime: '12:45z',
      status: 'Reconciled',
      deviationPct: 14.0,
      isFlagged: true,
      notes: 'Unplanned detour into river valley. Deviation exceeds 10% tolerance.'
    },
    {
      id: 'TRP-8824-Y',
      missionType: 'Special Ordnance Dispatch',
      route: 'Camp Alpha -> Forward Ammo Dump 2',
      plannedDist: 60.0,
      actualDist: 73.2,
      vehicleReg: 'V-1024 (AL 4x4)',
      driverName: 'Nb Sub Rakesh Yadav',
      departureTime: '05:30z',
      returnTime: '14:50z',
      status: 'Reconciled',
      deviationPct: 22.0,
      isFlagged: true,
      notes: 'Bridge collapse on Primary Route 4 required 13.2km diversion through mountain pass.'
    }
  ];

  const handleCloseOut = (id: string) => {
    setSorties((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Closed' } : s))
    );
  };

  const handleResolveInvestigation = () => {
    if (!investigatingSortie) return;
    setInvestigatingSortie(null);
    setInvestigationRemarks('');
  };

  const filteredSorties = sorties.filter(
    (s) =>
      (activeSubTab === 'All' || s.status === activeSubTab) &&
      (s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.driverName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 animate-fade-in text-text">
      {/* Header (Stitch Screen 2) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="font-mono text-[10px] text-text-faint uppercase tracking-wider">
            SORTIE OPERATIONS // RECONCILIATION SECTOR
          </div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-text">
            SORTIE RECONCILIATION
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-amber/10 border border-amber/30 text-amber font-mono text-xs font-bold">
            {deviations.length} DEVIATIONS FLAGGED
          </span>
        </div>
      </div>

      {/* Lifecycle Sub-Tabs (Stitch Screen 2) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-line">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 font-mono text-xs uppercase font-bold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-gold text-gold bg-gold/5'
                  : 'border-transparent text-text-dim hover:text-text hover:border-line'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 2-Column Master-Detail Grid: Table + Deviations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (8 Cols): Pending Approvals / Reconciled Table */}
        <div className="lg:col-span-8 bg-panel border border-line rounded-lg p-4 shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-line">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text">
              PENDING APPROVALS ({filteredSorties.length})
            </h3>

            <div className="flex items-center gap-2 bg-bg border border-line rounded px-2.5 py-1 text-xs">
              <Search className="w-3.5 h-3.5 text-text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Sortie ID or Driver..."
                className="bg-transparent text-text placeholder:text-text-faint outline-none font-sans w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line text-text-faint font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">SORTIE ID</th>
                  <th className="py-2.5 px-3">MISSION DETAILS</th>
                  <th className="py-2.5 px-3">DISTANCE LOGGED</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft font-sans">
                {filteredSorties.map((row) => (
                  <tr key={row.id} className="hover:bg-panel-2 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-gold">{row.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-text">{row.missionType}</div>
                      <div className="text-[11px] text-text-dim">{row.route}</div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-text">
                        {row.actualDist} / {row.plannedDist} km
                      </div>
                      <div className="text-[10px] text-emerald">+{row.deviationPct}% DEV</div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald/15 border border-emerald/30 text-emerald uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setInvestigatingSortie(row)}
                          className="px-2.5 py-1 rounded bg-panel-2 border border-line hover:border-gold text-text hover:text-gold font-mono text-[10px] uppercase font-bold transition-all"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleCloseOut(row.id)}
                          className="px-2.5 py-1 rounded bg-panel-2 border border-emerald/40 hover:bg-emerald hover:text-bg text-emerald font-mono text-[10px] uppercase font-bold transition-all"
                        >
                          Close Out
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 Cols): RECONCILIATION DEVIATIONS (>10%) (Stitch Screen 2) */}
        <div className="lg:col-span-4 bg-panel border border-line rounded-lg p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>DEVIATIONS (&gt;10%)</span>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-amber/20 text-amber">
              {deviations.length}
            </span>
          </div>

          <div className="space-y-3">
            {deviations.map((dev) => (
              <div
                key={dev.id}
                className="p-3.5 rounded-lg bg-panel-2 border-l-4 border-amber border-y border-r border-amber/30 space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gold">{dev.id}</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber/20 border border-amber/40 text-amber">
                    +{dev.deviationPct}% DEV
                  </span>
                </div>

                <div className="font-sans font-bold text-xs text-text">{dev.missionType}</div>
                <div className="font-mono text-[11px] text-text-dim">
                  Planned: <strong className="text-text">{dev.plannedDist} km</strong> | Actual:{' '}
                  <strong className="text-amber">{dev.actualDist} km</strong>
                </div>
                <div className="text-[11px] text-text-faint font-sans">{dev.route}</div>

                <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-dim">{dev.driverName}</span>
                  <button
                    onClick={() => setInvestigatingSortie(dev)}
                    className="px-3 py-1 rounded bg-amber/15 hover:bg-amber hover:text-bg border border-amber/40 text-amber font-mono text-[10px] font-bold uppercase transition-all"
                  >
                    Investigate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investigation & Audit Resolution Modal */}
      {investigatingSortie && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-gold rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber" />
                <h3 className="font-mono text-sm font-bold uppercase text-text">
                  Sortie Investigation: {investigatingSortie.id}
                </h3>
              </div>
              <button
                onClick={() => setInvestigatingSortie(null)}
                className="text-text-faint hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono bg-bg p-3 rounded-lg border border-line">
              <div className="flex justify-between">
                <span className="text-text-dim">Mission:</span>
                <span className="text-text font-bold">{investigatingSortie.missionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Driver:</span>
                <span className="text-text">{investigatingSortie.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Vehicle:</span>
                <span className="text-gold font-bold">{investigatingSortie.vehicleReg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Planned / Actual:</span>
                <span>
                  {investigatingSortie.plannedDist} km /{' '}
                  <strong className="text-amber">{investigatingSortie.actualDist} km</strong> (
                  +{investigatingSortie.deviationPct}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Field Notes:</span>
                <span className="text-text-dim font-sans">{investigatingSortie.notes}</span>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                Commander / MTO Investigation Finding &amp; Resolution
              </label>
              <textarea
                rows={3}
                value={investigationRemarks}
                onChange={(e) => setInvestigationRemarks(e.target.value)}
                placeholder="Enter authorized detour reason, weather divergence verification, or disciplinary flag..."
                className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
              <button
                onClick={() => setInvestigatingSortie(null)}
                className="px-4 py-2 rounded bg-panel-2 border border-line text-text-dim font-mono text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveInvestigation}
                className="px-6 py-2 rounded bg-gold hover:bg-gold-bright text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Sign &amp; Resolve Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
