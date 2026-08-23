import React from 'react';
import { Car, User, MapPin, Hash, Fuel, Gauge, CheckCircle2 } from 'lucide-react';
import { ScanResult } from '../types';

interface TripDetailsCardProps {
  scanResult: ScanResult;
  direction: 'OUTBOUND' | 'INBOUND';
  onVerify: () => void;
  onOverride: () => void;
}

export const TripDetailsCard: React.FC<TripDetailsCardProps> = ({
  scanResult,
  direction,
  onVerify,
  onOverride,
}) => {
  const dirColor = direction === 'OUTBOUND' ? 'text-amber' : 'text-steel';
  const dirBg = direction === 'OUTBOUND' ? 'bg-amber/10 border-amber/30' : 'bg-steel/10 border-steel/30';

  return (
    <div className="bg-panel border border-line rounded-lg p-5 animate-fade-in">
      {/* Match Flag */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-olive" />
          <span className="font-mono text-xs text-olive font-bold uppercase tracking-wider">
            RFID Tag Matched
          </span>
        </div>
        <span className={`font-mono text-xs font-bold uppercase px-2.5 py-1 rounded border ${dirBg} ${dirColor}`}>
          {direction} PENDING
        </span>
      </div>

      {/* Vehicle Info */}
      <div className="flex items-center gap-4 p-3 bg-panel-2 rounded border border-line-soft mb-3">
        <div className="w-12 h-12 rounded bg-olive/10 border border-olive-dim flex items-center justify-center">
          <Car className="w-6 h-6 text-olive" />
        </div>
        <div className="flex-1">
          <div className="font-mono font-bold text-text text-base">{scanResult.registration_number}</div>
          <div className="text-xs text-text-faint font-sans">{scanResult.vehicle_type}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-text-dim">
            <Gauge className="w-3 h-3" />
            <span className="font-mono">{scanResult.current_odometer.toLocaleString()} km</span>
          </div>
        </div>
      </div>

      {/* Driver Info */}
      <div className="flex items-center gap-4 p-3 bg-panel-2 rounded border border-line-soft mb-4">
        <div className="w-12 h-12 rounded bg-steel/10 border border-steel/30 flex items-center justify-center">
          <User className="w-6 h-6 text-steel" />
        </div>
        <div className="flex-1">
          <div className="font-mono font-bold text-text text-base">{scanResult.driver_name}</div>
          <div className="text-xs text-text-faint font-sans">Bound to this trip — verification required</div>
        </div>
      </div>

      {/* Token Signature */}
      <div className="p-3 bg-bg rounded border border-line mb-4">
        <div className="text-xs text-text-faint font-mono mb-1 uppercase tracking-wider">Token Signature (HMAC-SHA256)</div>
        <div className="font-mono text-xs text-steel break-all leading-relaxed">
          {scanResult.token_id}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onVerify}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          Begin Driver Verification
        </button>
        <button
          onClick={onOverride}
          className="px-4 py-3 rounded border border-amber/30 bg-amber/10 text-amber font-mono font-bold text-xs uppercase tracking-wider hover:bg-amber/20 transition-all"
        >
          Override
        </button>
      </div>
    </div>
  );
};
