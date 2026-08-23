import React, { useState } from 'react';
import {
  Download,
  AlertTriangle,
  Radio,
  Wifi,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

interface DashboardStats {
  available: number;
  onSortie: number;
  pending: number;
  overdue: number;
}

interface ActiveTrip {
  vehicleReg: string;
  driverName: string;
  destination: string;
  elapsed: string;
  isOverdue: boolean;
}

interface GateEvent {
  time: string;
  gate: string;
  vehicle: string;
  direction: string;
  sentry: string;
  flags: string;
}

interface HourBucket {
  hour: string;
  count: number;
  pct: number;
}

interface CommanderDashboardProps {
  stats: DashboardStats;
  activeSorties: ActiveTrip[];
  recentEvents: GateEvent[];
  trafficData: HourBucket[];
}

export const CommanderDashboard: React.FC<CommanderDashboardProps> = ({
  stats,
  activeSorties,
  recentEvents,
  trafficData,
}) => {
  const [filterMode, setFilterMode] = useState(false);
  const [selectedSortie, setSelectedSortie] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fleetRows = [
    {
      unitId: 'V-1024',
      type: 'Logistics Heavy (Ashok Leyland 4x4)',
      status: 'EN ROUTE',
      eta: '14:30z',
      deviation: '2.1%',
      isDevFlagged: false,
      lastSync: '00:01m',
      driver: 'Nb Sub Rakesh Yadav',
      dest: 'FOB Delta (Grid Zulu)'
    },
    {
      unitId: 'V-0892',
      type: 'Recon Light (Gypsy MP)',
      status: 'DELAYED',
      eta: '15:45z',
      deviation: '14.5%',
      isDevFlagged: true,
      lastSync: '00:12m',
      driver: 'Hav Suresh Pillai',
      dest: 'Sector 4 Border Post'
    },
    {
      unitId: 'V-1105',
      type: 'Armored Trans (Casspir APC)',
      status: 'MAINTENANCE',
      eta: '--:--',
      deviation: '0.0%',
      isDevFlagged: false,
      lastSync: '12:45h',
      driver: 'Unassigned',
      dest: 'Base Workshop Depot'
    },
    {
      unitId: 'V-0944',
      type: 'Logistics Med (Tata 2.5T)',
      status: 'EN ROUTE',
      eta: '16:10z',
      deviation: '4.8%',
      isDevFlagged: false,
      lastSync: '00:02m',
      driver: 'Nk Vikram Thapa',
      dest: 'Brigade Ammo Depot'
    },
    {
      unitId: 'V-1052',
      type: 'Medevac Ambulance (M997A3)',
      status: 'STANDBY',
      eta: '17:00z',
      deviation: '0.0%',
      isDevFlagged: false,
      lastSync: '00:04m',
      driver: 'Sep Anil Kumar',
      dest: 'Station Military Hospital'
    }
  ];

  const filteredFleet = fleetRows.filter((row) => {
    const matchesSearch =
      row.unitId.toLowerCase().includes(tableSearch.toLowerCase()) ||
      row.type.toLowerCase().includes(tableSearch.toLowerCase()) ||
      row.driver.toLowerCase().includes(tableSearch.toLowerCase()) ||
      row.dest.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || row.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleExportData = () => {
    const jsonStr = JSON.stringify(fleetRows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `M-FTAMS-Fleet-Telemetry-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in text-text">
      {/* Top Header & Overview KPI Cards (Stitch Screen 1) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-text flex items-center gap-2">
            <span>Fleet Readiness Overview</span>
          </h1>
          <div className="font-mono text-[10px] text-text-faint uppercase tracking-wider mt-0.5">
            GLOBAL COMMAND SECTOR — SECURE CONNECTION // STRATUM-1 DISCIPLINE
          </div>
        </div>

        {/* Dual Primary KPI Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-panel border border-line rounded-lg px-4 py-2.5 min-w-[130px] shadow-md">
            <div className="font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold">
              TOTAL UNITS
            </div>
            <div className="font-mono text-2xl font-extrabold text-text leading-tight">
              1,240
            </div>
          </div>
          <div className="bg-panel border border-line rounded-lg px-4 py-2.5 min-w-[140px] shadow-md">
            <div className="font-mono text-[9px] uppercase tracking-wider text-emerald font-semibold flex items-center justify-between">
              <span>COMBAT READY</span>
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse"></span>
            </div>
            <div className="font-mono text-2xl font-extrabold text-emerald leading-tight">
              98.2%
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Tactical Radar Map + Critical Alerts & System Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left 2 Cols: Tactical Radar Map (Stitch Screen 1) */}
        <div className="lg:col-span-2 bg-panel border border-line rounded-lg p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-text uppercase tracking-wider">
              <Radio className="w-4 h-4 text-cyan animate-pulse" />
              <span>ACTIVE SORTIES (LIVE TRACKING)</span>
            </div>
            <button
              onClick={() => setFilterMode(!filterMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] uppercase font-bold border transition-all ${
                filterMode
                  ? 'bg-cyan/20 text-cyan border-cyan/40'
                  : 'bg-panel-2 text-text-dim border-line hover:text-text'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>FILTERS: {filterMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Tactical Map Canvas / SVG (Stitch Visual Layout) */}
          <div className="relative w-full h-[290px] rounded-lg bg-[#060a12] border border-line overflow-hidden p-3 flex flex-col justify-between">
            {/* Radar Circular Grid Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-[260px] h-[260px] rounded-full border border-cyan"></div>
              <div className="w-[180px] h-[180px] rounded-full border border-cyan"></div>
              <div className="w-[100px] h-[100px] rounded-full border border-cyan"></div>
              <div className="absolute w-full h-[1px] bg-cyan"></div>
              <div className="absolute h-full w-[1px] bg-cyan"></div>
            </div>

            {/* Radar Sweep Line */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-[260px] h-[260px] rounded-full bg-gradient-to-tr from-cyan/30 to-transparent animate-radar-sweep"></div>
            </div>

            {/* Tactical Sector Headers */}
            <div className="relative z-10 flex items-center justify-between font-mono text-[9px] text-cyan/70">
              <div>TOP PANEL // SYSTEM SPATIAL SECURE // GRID ACTIVE // TIME: 14:02Z</div>
              <div>AO LYNX / SECTOR 4</div>
            </div>

            {/* Tactical Marker 1: ALPHA-7 (ETA 12m) */}
            <div
              onClick={() => setSelectedSortie('ALPHA-7')}
              className="absolute top-[42%] left-[34%] z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
            >
              <div className="w-3 h-3 bg-emerald/30 border border-emerald rounded-full flex items-center justify-center animate-ping absolute"></div>
              <div className="w-3 h-3 bg-emerald border border-emerald rounded-full"></div>
              <div className="absolute top-4 -left-12 px-2 py-0.5 rounded bg-bg/90 border border-emerald text-emerald font-mono text-[9px] font-bold whitespace-nowrap shadow-lg">
                ALPHA-7 (ETA 12m)
              </div>
            </div>

            {/* Tactical Marker 2: BRAVO-9 (DEV 12%) */}
            <div
              onClick={() => setSelectedSortie('BRAVO-9')}
              className="absolute top-[58%] left-[62%] z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
            >
              <div className="w-3 h-3 bg-amber/30 border border-amber rounded-full flex items-center justify-center animate-ping absolute"></div>
              <div className="w-3 h-3 bg-amber border border-amber rounded-full"></div>
              <div className="absolute top-4 -left-14 px-2 py-0.5 rounded bg-bg/90 border border-amber text-amber font-mono text-[9px] font-bold whitespace-nowrap shadow-lg">
                BRAVO-9 (DEV 12%)
              </div>
            </div>

            {/* Tactical Marker 3: CHARLIE-4 (ON TIME) */}
            <div
              onClick={() => setSelectedSortie('CHARLIE-4')}
              className="absolute top-[28%] left-[72%] z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
            >
              <div className="w-2.5 h-2.5 bg-steel border border-steel rounded-full"></div>
              <div className="absolute top-3.5 -left-10 px-1.5 py-0.5 rounded bg-bg/90 border border-steel text-steel font-mono text-[8.5px] font-bold whitespace-nowrap shadow-lg">
                CHARLIE-4
              </div>
            </div>

            {/* Bottom Radar Status Strip */}
            <div className="relative z-10 font-mono text-[8.5px] text-text-faint flex items-center justify-between border-t border-line/60 pt-1.5">
              <span>COMMS LOG: OK | WEATHER: CLR | TIDE: HIGH | FIRE SUPPORT: AVAILABLE</span>
              <span className="text-emerald">AIR-GAPPED TELEMETRY SYNCED</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Critical Alerts & System Integrity (Stitch Screen 1) */}
        <div className="space-y-4">
          {/* Critical Alerts Card */}
          <div className="bg-panel border border-line rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-line mb-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-red uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>CRITICAL ALERTS</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-red/20 text-red font-mono text-[10px] font-bold">
                3
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Alert 1 */}
              <div className="p-3 rounded-lg bg-red/10 border-l-4 border-red border-y border-r border-red/30">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-red mb-1">
                  <span>SYNC FAILURE: NODE-72</span>
                  <span className="text-[10px] text-red/80 font-normal">4m ago</span>
                </div>
                <div className="text-[11px] text-text font-sans">
                  Vehicle telemetry lost on Route 4. Awaiting automated reconnect.
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-3 rounded-lg bg-amber/10 border-l-4 border-amber border-y border-r border-amber/30">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-amber mb-1">
                  <span>OVERDUE: CONVOY DELTA</span>
                  <span className="text-[10px] text-amber/80 font-normal">15m delay</span>
                </div>
                <div className="text-[11px] text-text font-sans">
                  ETA exceeded by 15m. Route deviation detected in Sector 4.
                </div>
              </div>
            </div>
          </div>

          {/* System Integrity Card */}
          <div className="bg-panel border border-line rounded-lg p-4 shadow-lg">
            <div className="font-mono text-xs font-bold text-text uppercase tracking-wider pb-2 border-b border-line mb-3">
              SYSTEM INTEGRITY
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-panel-2 border border-line">
                <span className="text-text-dim">SATELLITE UPLINK</span>
                <span className="px-2 py-0.5 rounded bg-emerald/20 border border-emerald/40 text-emerald font-bold text-[10px]">
                  STABLE
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-panel-2 border border-line">
                <span className="text-text-dim">LOCAL MESH NETWORK</span>
                <span className="px-2 py-0.5 rounded bg-amber/20 border border-amber/40 text-amber font-bold text-[10px]">
                  DEGRADED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wide Table: Active Fleet Status (Tabular) (Stitch Screen 1) */}
      <div className="bg-panel border border-line rounded-lg p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text">
              ACTIVE FLEET STATUS (TABULAR)
            </h3>
            <div className="flex items-center gap-2 bg-panel-2 border border-line rounded px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-text-faint" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter by unit ID, driver, destination..."
                className="bg-transparent text-xs text-text placeholder:text-text-faint outline-none font-sans w-48 sm:w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-panel-2 border border-line rounded px-2.5 py-1.5 text-xs font-mono text-text outline-none focus:border-gold"
            >
              <option value="ALL">All Statuses</option>
              <option value="EN ROUTE">En Route</option>
              <option value="DELAYED">Delayed</option>
              <option value="STANDBY">Standby</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>

            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-panel-2 border border-line hover:border-gold text-text hover:text-gold font-mono text-xs font-bold uppercase transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Data ⤓</span>
            </button>
          </div>
        </div>

        {/* Tabular Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line text-text-faint font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">UNIT ID</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">ETA</th>
                <th className="py-2.5 px-3">DISTANCE DEV.</th>
                <th className="py-2.5 px-3">LAST SYNC</th>
                <th className="py-2.5 px-3 text-right">DRIVER &amp; DEST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft font-sans">
              {filteredFleet.map((row) => (
                <tr key={row.unitId} className="hover:bg-panel-2 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-text">{row.unitId}</td>
                  <td className="py-3 px-3 text-text-dim">{row.type}</td>
                  <td className="py-3 px-3 font-mono">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-bold border ${
                        row.status === 'EN ROUTE'
                          ? 'bg-emerald/15 border-emerald/30 text-emerald'
                          : row.status === 'DELAYED'
                          ? 'bg-amber/15 border-amber/30 text-amber'
                          : row.status === 'MAINTENANCE'
                          ? 'bg-steel/15 border-steel/30 text-steel'
                          : 'bg-panel-3 border-line text-text-dim'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-text">{row.eta}</td>
                  <td className="py-3 px-3 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        row.isDevFlagged
                          ? 'bg-amber/20 border-2 border-gold text-amber shadow-sm'
                          : 'text-emerald'
                      }`}
                    >
                      {row.deviation}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-text-dim text-[11px]">{row.lastSync}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="font-semibold text-text">{row.driver}</div>
                    <div className="font-mono text-[10px] text-text-dim">{row.dest}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

