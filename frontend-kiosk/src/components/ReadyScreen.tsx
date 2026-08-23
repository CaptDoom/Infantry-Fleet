import React, { useEffect, useState } from 'react';
import { Shield, Radio, QrCode, ChevronRight, Truck } from 'lucide-react';
import { kioskApi, CachedVehicleItem } from '../services/api';

interface ReadyScreenProps {
  isSeeded: boolean;
  onStartScan: () => void;
  onSelectVehicle?: (tagOrReg: string) => void;
}

export const ReadyScreen: React.FC<ReadyScreenProps> = ({ isSeeded, onStartScan, onSelectVehicle }) => {
  const [vehicles, setVehicles] = useState<CachedVehicleItem[]>([]);

  useEffect(() => {
    if (isSeeded) {
      kioskApi.getVehicles().then(setVehicles).catch(() => {});
    }
  }, [isSeeded]);

  const activeVehicles = vehicles.filter(v => v.status === 'RESERVED' || v.status === 'ON_SORTIE');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in">
      {/* Gate Indicator */}
      <div className="relative">
        <div className="w-36 h-36 rounded-full border-2 border-olive-dim flex items-center justify-center bg-panel">
          <Shield className="w-14 h-14 text-olive opacity-50" />
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-olive shadow-[0_0_12px_#8a9a5b] animate-pulse" />
      </div>

      {/* Status */}
      <div className="text-center">
        <h2 className="font-mono text-xl font-bold text-text tracking-wider mb-1">
          GATE ACCESS READY
        </h2>
        <p className="text-text-dim text-xs max-w-md font-sans">
          {isSeeded
            ? 'Awaiting vehicle arrival in gate lane. Scan RFID vehicle tag or 2D Gate-Pass QR code.'
            : '⚠ Edge terminal has not been seeded with central cache. Gate operations unavailable.'}
        </p>
      </div>

      {/* Main Scan Button */}
      <button
        onClick={onStartScan}
        disabled={!isSeeded}
        className="group flex items-center gap-3 px-8 py-3.5 rounded-lg bg-olive/10 border-2 border-olive-dim hover:border-olive text-olive font-mono font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-olive/20 shadow-lg"
      >
        <Radio className="w-5 h-5" />
        <span>Initiate Gate Scan</span>
        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </button>

      {/* Active Vehicles Quick Lane Selector */}
      {isSeeded && activeVehicles.length > 0 && onSelectVehicle && (
        <div className="w-full max-w-md bg-panel border border-line rounded-lg p-3.5 mt-2">
          <div className="text-[11px] font-mono text-text-faint uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Active Tokens in Local SQLite Queue ({activeVehicles.length})</span>
            <span className="text-olive">CLICK TO SIMULATE APPROACH</span>
          </div>
          <div className="space-y-2">
            {activeVehicles.map(v => (
              <div
                key={v.vehicle_id}
                className="flex items-center justify-between p-2 rounded bg-panel-2 border border-line hover:border-olive-dim transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-steel" />
                  <div>
                    <span className="font-mono text-xs font-bold text-text">{v.registration_number}</span>
                    <span className="font-mono text-[10px] text-text-dim ml-2">({v.vehicle_type})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    v.status === 'RESERVED' ? 'bg-amber/10 text-amber' : 'bg-steel/10 text-steel'
                  }`}>
                    {v.status === 'RESERVED' ? 'OUTBOUND' : 'INBOUND'}
                  </span>
                  <button
                    onClick={() => onSelectVehicle(v.rfid_tag_id || v.registration_number)}
                    className="px-2 py-1 rounded bg-olive/20 hover:bg-olive hover:text-bg text-olive font-mono text-[10px] uppercase font-semibold transition-colors"
                  >
                    Tap Tag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Queue Warning */}
      {!isSeeded && (
        <div className="mt-4 px-4 py-3 rounded bg-red/10 border border-red/30 text-red text-xs font-mono max-w-md text-center">
          FAIL-CLOSED MODE — An initial downlink sync from the central server is required before any gate operations can be authorized.
        </div>
      )}
    </div>
  );
};

