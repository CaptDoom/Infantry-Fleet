import React from 'react';

export interface FleetVehicle {
  id: string;
  reg: string;
  type: string;
  unit: string;
  rfid: string;
  odometer: number;
  fuel: number;
  status: 'AVAILABLE' | 'RESERVED' | 'ON_SORTIE' | 'MAINTENANCE';
}

interface FleetPageProps {
  vehicles: FleetVehicle[];
}

const badgeClass = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-olive/10 text-olive border-olive/25',
    ON_SORTIE: 'bg-steel/12 text-steel border-steel/30',
    RESERVED: 'bg-amber/10 text-amber border-amber/25',
    MAINTENANCE: 'bg-red/12 text-red border-red/30',
  };
  return map[status] || 'bg-white/4 text-text-dim border-line';
};

export const FleetPage: React.FC<FleetPageProps> = ({ vehicles }) => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <div className="font-mono text-xs text-olive tracking-widest uppercase font-bold mb-1">
          Master Data
        </div>
        <h1 className="font-mono text-xl font-semibold tracking-tight text-text">
          Fleet Registry
        </h1>
        <p className="text-xs text-text-dim font-sans mt-1">
          All registered vehicles, their RFID tag UID, and live status.
        </p>
      </div>

      <div className="bg-panel border border-line rounded-lg p-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-line text-text-faint font-mono uppercase text-[10px]">
              <th className="py-2 px-2.5">Reg. No.</th>
              <th className="py-2 px-2.5">Type</th>
              <th className="py-2 px-2.5">Unit</th>
              <th className="py-2 px-2.5">RFID UID</th>
              <th className="py-2 px-2.5">Odometer</th>
              <th className="py-2 px-2.5">Fuel</th>
              <th className="py-2 px-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft font-sans">
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-panel-2 transition-colors">
                <td className="py-2.5 px-2.5 font-mono font-semibold text-text">{v.reg}</td>
                <td className="py-2.5 px-2.5 text-text-dim">{v.type}</td>
                <td className="py-2.5 px-2.5 text-text-dim">{v.unit}</td>
                <td className="py-2.5 px-2.5 font-mono text-text-faint">{v.rfid}</td>
                <td className="py-2.5 px-2.5 font-mono text-text-dim">
                  {v.odometer.toLocaleString()} km
                </td>
                <td className="py-2.5 px-2.5 font-mono text-text-dim">{v.fuel}%</td>
                <td className="py-2.5 px-2.5 font-mono">
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-full font-semibold border ${badgeClass(
                      v.status
                    )}`}
                  >
                    <span className="w-[5px] h-[5px] rounded-full bg-current" />
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
