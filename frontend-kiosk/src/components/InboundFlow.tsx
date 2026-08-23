import React, { useState } from 'react';
import { Truck, AlertOctagon, Check, Fuel, Gauge, ArrowRight, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { GateScanResponse, kioskApi, CachedVehicleItem } from '../services/api';
import { BarrierAnimation } from './BarrierAnimation';
import { OverrideModal } from './OverrideModal';

interface InboundFlowProps {
  vehicles: CachedVehicleItem[];
  onHandshakeCompleted: () => void;
}

export const InboundFlow: React.FC<InboundFlowProps> = ({ vehicles, onHandshakeCompleted }) => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<GateScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Verification & Record State
  const [visualPhotoChecked, setVisualPhotoChecked] = useState(false);
  const [outboundOdometer, setOutboundOdometer] = useState<number>(0);
  const [inboundOdometer, setInboundOdometer] = useState<number>(0);
  const [fuelPct, setFuelPct] = useState<number>(65);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barrierRaised, setBarrierRaised] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Filter vehicles currently outside the wire (ON_SORTIE or DISPATCHED)
  const returningVehicles = vehicles.filter(v => v.status === 'ON_SORTIE' || v.status === 'DISPATCHED');

  const handleScan = async (tagToScan: string) => {
    if (!tagToScan) return;
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    setVisualPhotoChecked(false);

    try {
      const data = await kioskApi.scanTag(tagToScan);
      setScanResult(data);
      const priorOdo = data.current_odometer || 18420;
      setOutboundOdometer(priorOdo);
      // Default to estimated +40km
      setInboundOdometer(priorOdo + 40);
    } catch (err: any) {
      setScanError(err.message || 'No active return token found');
    } finally {
      setIsScanning(false);
    }
  };

  const deltaDistance = Math.max(0, inboundOdometer - outboundOdometer);

  const handleConfirmInbound = async () => {
    if (!scanResult) return;
    setIsSubmitting(true);

    try {
      await kioskApi.executeHandshake({
        token_id: scanResult.token_id,
        event_type: 'INBOUND',
        odometer_reading: Number(inboundOdometer),
        fuel_level_pct: Number(fuelPct),
        sentry_id: 'sentry_duty_officer'
      });
      setBarrierRaised(true);
    } catch (err: any) {
      setScanError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverrideSubmit = async (remarks: string, sentryId: string) => {
    setIsSubmitting(true);
    try {
      await kioskApi.executeHandshake({
        token_id: scanResult ? scanResult.token_id : 'OVERRIDE_INBOUND_TOKEN',
        event_type: 'INBOUND',
        odometer_reading: Number(inboundOdometer) || 18500,
        fuel_level_pct: Number(fuelPct),
        sentry_id: sentryId,
        override_flag: true,
        override_remarks: remarks
      });
      setShowOverrideModal(false);
      setBarrierRaised(true);
    } catch (err: any) {
      setScanError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setScanError(null);
    setBarrierRaised(false);
    setSelectedTag('');
    onHandshakeCompleted();
  };

  if (barrierRaised && scanResult) {
    return (
      <BarrierAnimation
        isRaised={true}
        direction="INBOUND"
        vehicleReg={scanResult.registration_number}
        onDone={handleReset}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Return Vehicle Selector */}
      <div className="lg:col-span-5 bg-panel border border-line rounded-lg p-6 space-y-6">
        <div>
          <h3 className="font-mono text-sm font-bold tracking-wider text-steel uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-steel animate-pulse" />
            1. Inbound Tag Reader (Return)
          </h3>
          <p className="text-xs text-text-faint font-sans mt-1">
            Detects returning vehicles currently on active sorties outside the cantonment perimeter.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block font-mono text-xs text-text-dim uppercase tracking-wider">
            Select Returning Vehicle
          </label>
          <select
            value={selectedTag}
            onChange={e => {
              setSelectedTag(e.target.value);
              handleScan(e.target.value);
            }}
            className="w-full bg-bg border border-line hover:border-steel rounded px-3 py-2.5 text-sm font-mono text-text outline-none transition-colors"
          >
            <option value="">-- Vehicles Currently On Sortie --</option>
            {returningVehicles.map(v => (
              <option key={v.vehicle_id} value={v.rfid_tag_id || v.registration_number}>
                {v.registration_number} — {v.vehicle_type} (ON SORTIE)
              </option>
            ))}
          </select>
        </div>

        {scanError && (
          <div className="bg-red/10 border border-red/30 rounded p-4 text-xs font-sans text-red space-y-3">
            <div className="flex items-start gap-2">
              <AlertOctagon className="w-5 h-5 shrink-0 text-red" />
              <div>
                <div className="font-mono font-bold uppercase text-red">INBOUND CHECK FAILED</div>
                <div className="text-text-dim mt-0.5">{scanError}</div>
              </div>
            </div>
            <button
              onClick={() => setShowOverrideModal(true)}
              className="w-full py-2 rounded bg-amber/20 hover:bg-amber/30 border border-amber/50 text-amber font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Sentry Return Override</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Inbound Verification & Odometer Check */}
      <div className="lg:col-span-7 bg-panel border border-line rounded-lg p-6 min-h-[420px] flex flex-col justify-between">
        {!scanResult ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 text-text-faint space-y-3">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-line flex items-center justify-center text-line">
              <ArrowLeftRight className="w-8 h-8" />
            </div>
            <div className="font-mono text-sm uppercase tracking-wider text-text-dim">Awaiting Inbound Return Scan</div>
            <p className="text-xs font-sans max-w-sm text-text-faint">
              Scan RFID tag of incoming vehicle to log return odometer and calculate actual distance.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-steel/10 border border-steel/30 flex items-center justify-center font-mono font-bold text-steel text-lg">
                  IN
                </div>
                <div>
                  <div className="font-mono text-base font-bold text-text">
                    {scanResult.registration_number}
                  </div>
                  <div className="text-xs font-mono text-text-dim">
                    DRIVER: {scanResult.driver_name} | TRIP: {scanResult.trip_id.substring(0, 8)}...
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-steel/10 border border-steel/30 text-steel text-xs font-mono font-bold">
                SORTIE CLOSING
              </span>
            </div>

            {/* Photo verification */}
            <div className="bg-panel-2 border border-line rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-bg border border-line flex items-center justify-center text-lg">
                  👤
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-text">{scanResult.driver_name}</div>
                  <div className="text-[11px] text-text-faint font-mono">Photo Hash Matched on Edge</div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={visualPhotoChecked}
                  onChange={e => setVisualPhotoChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-line bg-bg text-steel focus:ring-0"
                />
                <span className="font-mono text-xs font-bold text-steel">Photo Confirmed</span>
              </label>
            </div>

            {/* Odometer Sanity Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-panel-2 border border-line rounded-lg p-4">
                <label className="block font-mono text-xs text-text-faint uppercase mb-1">
                  Stored Outbound Reading
                </label>
                <div className="text-xl font-mono font-bold text-text-dim">
                  {outboundOdometer.toLocaleString()} km
                </div>
                <div className="text-[11px] text-text-faint font-mono mt-1">Captured at outbound gate</div>
              </div>

              <div className="bg-panel-2 border border-steel/40 rounded-lg p-4">
                <label className="block font-mono text-xs text-steel uppercase mb-1 flex items-center gap-1.5 font-bold">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Inbound Odometer (KM)</span>
                </label>
                <input
                  type="number"
                  value={inboundOdometer}
                  onChange={e => setInboundOdometer(Number(e.target.value))}
                  min={outboundOdometer}
                  className="w-full bg-bg border border-line focus:border-steel rounded px-3 py-1 text-xl font-mono text-text font-bold outline-none"
                />
                <div className="text-[11px] text-text-dim font-mono mt-1 flex justify-between">
                  <span>Delta Distance:</span>
                  <span className="text-olive font-bold">+{deltaDistance} km</span>
                </div>
              </div>
            </div>

            {/* Fuel Slider */}
            <div className="bg-panel-2 border border-line rounded-lg p-4">
              <div className="flex justify-between items-center mb-2 font-mono text-xs">
                <span className="text-text-faint flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5" />
                  <span>Return Fuel Level</span>
                </span>
                <span className="text-amber font-bold">{fuelPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={fuelPct}
                onChange={e => setFuelPct(Number(e.target.value))}
                className="w-full accent-steel"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="px-4 py-2 rounded border border-amber/30 bg-amber/10 hover:bg-amber/20 text-amber font-mono text-xs uppercase"
              >
                Override
              </button>

              <button
                type="button"
                disabled={!visualPhotoChecked || inboundOdometer < outboundOdometer || isSubmitting}
                onClick={handleConfirmInbound}
                className="px-6 py-2.5 rounded bg-steel hover:bg-[#6c9ba6] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-2"
              >
                <span>{isSubmitting ? 'Recording...' : 'Log Return & Release'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        onSubmit={handleOverrideSubmit}
        reason={scanError || 'Inbound Sentry Override'}
      />
    </div>
  );
};
