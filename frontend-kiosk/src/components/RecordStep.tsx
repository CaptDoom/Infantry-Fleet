import React, { useState } from 'react';
import { Gauge, Fuel, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ScanResult, FlowDirection } from '../types';

interface RecordStepProps {
  scanResult: ScanResult;
  direction: FlowDirection;
  outboundOdometer?: number;
  onSubmit: (odometer: number, fuelPct: number) => void;
  onBack: () => void;
}

export const RecordStep: React.FC<RecordStepProps> = ({
  scanResult,
  direction,
  outboundOdometer,
  onSubmit,
  onBack,
}) => {
  const [odometer, setOdometer] = useState(scanResult.current_odometer.toString());
  const [fuel, setFuel] = useState('75');
  const [confirmStep, setConfirmStep] = useState(false);

  const odometerNum = parseInt(odometer, 10);
  const fuelNum = parseInt(fuel, 10);

  const isValid = !isNaN(odometerNum) && odometerNum > 0 && !isNaN(fuelNum) && fuelNum >= 0 && fuelNum <= 100;
  const isLowerThanOutbound = Boolean(direction === 'INBOUND' && outboundOdometer && odometerNum < outboundOdometer);

  const handleSubmit = () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    onSubmit(odometerNum, fuelNum);
  };

  return (
    <div className="bg-panel border border-line rounded-lg p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-olive" />
          <span className="font-mono text-sm font-bold text-text uppercase tracking-wider">
            Record Gate Reading — {direction}
          </span>
        </div>
        <button
          onClick={onBack}
          className="font-mono text-xs text-text-faint hover:text-text transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Outbound Reference (for INBOUND) */}
      {direction === 'INBOUND' && outboundOdometer && (
        <div className="mb-4 p-3 bg-panel-2 rounded border border-line">
          <div className="text-xs font-mono text-text-faint uppercase tracking-wider mb-1">
            Outbound Odometer at Departure
          </div>
          <div className="font-mono text-lg font-bold text-steel">
            {outboundOdometer.toLocaleString()} km
          </div>
          <div className="text-xs text-text-faint mt-1">
            The new reading must be ≥ this value for a valid return.
          </div>
        </div>
      )}

      {/* Odometer Input */}
      <div className="mb-4">
        <label className="block font-mono text-xs uppercase text-text-faint tracking-wider mb-2">
          Odometer Reading (km)
        </label>
        <div className="relative">
          <input
            type="number"
            value={odometer}
            onChange={e => {
              setOdometer(e.target.value);
              setConfirmStep(false);
            }}
            className="w-full bg-bg border border-line rounded px-4 py-3 text-lg font-mono text-text focus:border-olive outline-none transition-colors"
            min="0"
          />
          <Gauge className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-faint" />
        </div>
        {isLowerThanOutbound && (
          <div className="flex items-center gap-2 mt-2 text-red text-xs font-mono">
            <AlertTriangle className="w-4 h-4" />
            Reading is lower than outbound departure reading — verify correctness
          </div>
        )}
      </div>

      {/* Fuel Level Slider */}
      <div className="mb-5">
        <label className="block font-mono text-xs uppercase text-text-faint tracking-wider mb-2">
          Fuel Level (%)
        </label>
        <div className="flex items-center gap-4">
          <Fuel className="w-5 h-5 text-text-faint shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={fuel}
            onChange={e => {
              setFuel(e.target.value);
              setConfirmStep(false);
            }}
            className="flex-1 accent-olive h-2"
          />
          <span className="font-mono text-sm font-bold text-text w-12 text-right">{fuel}%</span>
        </div>
      </div>

      {/* Confirmation Step (Double-Check Pattern) */}
      {confirmStep && (
        <div className="mb-4 p-4 bg-amber/10 border border-amber/30 rounded">
          <div className="flex items-center gap-2 text-amber text-xs font-mono font-bold uppercase mb-2">
            <AlertTriangle className="w-4 h-4" />
            Confirm Gate Reading
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-text-faint text-xs">Odometer</div>
              <div className="font-mono font-bold text-text">{odometerNum.toLocaleString()} km</div>
            </div>
            <div>
              <div className="text-text-faint text-xs">Fuel Level</div>
              <div className="font-mono font-bold text-text">{fuelNum}%</div>
            </div>
          </div>
          <p className="text-amber/80 text-xs font-sans mt-2">
            Transcription errors corrupt distance deviation calculations. Please verify these readings are correct.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || isLowerThanOutbound}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {confirmStep ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Release {direction === 'OUTBOUND' ? 'Boom Barrier' : 'Vehicle Return'}
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4" />
            Proceed to Confirmation
          </>
        )}
      </button>
    </div>
  );
};
