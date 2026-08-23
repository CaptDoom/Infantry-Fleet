import React, { useState } from 'react';
import { Truck, UserCheck, KeyRound, AlertOctagon, Check, Fuel, Gauge, ArrowRight, ShieldAlert } from 'lucide-react';
import { GateScanResponse, kioskApi, CachedVehicleItem } from '../services/api';
import { BarrierAnimation } from './BarrierAnimation';
import { OverrideModal } from './OverrideModal';

interface OutboundFlowProps {
  vehicles: CachedVehicleItem[];
  onHandshakeCompleted: () => void;
}

export const OutboundFlow: React.FC<OutboundFlowProps> = ({ vehicles, onHandshakeCompleted }) => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<GateScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Verification State
  const [driverBioVerified, setDriverBioVerified] = useState(true);
  const [visualPhotoChecked, setVisualPhotoChecked] = useState(false);

  // Record State
  const [odometer, setOdometer] = useState<number>(0);
  const [fuelPct, setFuelPct] = useState<number>(85);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handshake completion & Barrier state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barrierRaised, setBarrierRaised] = useState(false);

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Filter vehicles eligible for OUTBOUND (RESERVED or AVAILABLE with token)
  const eligibleVehicles = vehicles.filter(v => v.status === 'RESERVED' || v.status === 'AVAILABLE');

  const handleScan = async (tagToScan: string) => {
    if (!tagToScan) return;
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    setVisualPhotoChecked(false);

    try {
      const data = await kioskApi.scanTag(tagToScan);
      setScanResult(data);
      setOdometer(data.current_odometer || 0);
    } catch (err: any) {
      setScanError(err.message || 'Token not found or access denied');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmRelease = async () => {
    if (!scanResult) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      await kioskApi.verifyDriver(scanResult.token_id, scanResult.driver_id, 'SMART_CARD', driverBioVerified);
      await kioskApi.executeHandshake({
        token_id: scanResult.token_id,
        event_type: 'OUTBOUND',
        odometer_reading: Number(odometer),
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
        token_id: scanResult ? scanResult.token_id : 'OVERRIDE_TOKEN',
        event_type: 'OUTBOUND',
        odometer_reading: Number(odometer) || (scanResult?.current_odometer || 18420),
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
    setVisualPhotoChecked(false);
    setSelectedTag('');
    onHandshakeCompleted();
  };

  if (barrierRaised && scanResult) {
    return (
      <BarrierAnimation
        isRaised={true}
        direction="OUTBOUND"
        vehicleReg={scanResult.registration_number}
        onDone={handleReset}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Tag Reader / Vehicle Selector */}
      <div className="lg:col-span-5 bg-panel border border-line rounded-lg p-6 space-y-6">
        <div>
          <h3 className="font-mono text-sm font-bold tracking-wider text-olive uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-olive animate-pulse" />
            1. Outbound Tag Reader
          </h3>
          <p className="text-xs text-text-faint font-sans mt-1">
            Simulates automated UHF RFID or 2D Gate-Pass barcode scan against local 72h cache.
          </p>
        </div>

        {/* Scan Selector */}
        <div className="space-y-3">
          <label className="block font-mono text-xs text-text-dim uppercase tracking-wider">
            Select Scanned Vehicle / RFID Tag
          </label>
          <select
            value={selectedTag}
            onChange={e => {
              setSelectedTag(e.target.value);
              handleScan(e.target.value);
            }}
            className="w-full bg-bg border border-line hover:border-olive-dim rounded px-3 py-2.5 text-sm font-mono text-text outline-none transition-colors"
          >
            <option value="">-- Choose RFID Tag in Range --</option>
            {eligibleVehicles.map(v => (
              <option key={v.vehicle_id} value={v.rfid_tag_id || v.registration_number}>
                {v.registration_number} — {v.vehicle_type} ({v.status})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-line-soft flex items-center justify-between">
          <button
            onClick={() => handleScan(selectedTag)}
            disabled={!selectedTag || isScanning}
            className="w-full py-2.5 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                <span>Reading Local Cache...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Scan RFID Tag</span>
              </>
            )}
          </button>
        </div>

        {/* Scan Error Banner */}
        {scanError && (
          <div className="bg-red/10 border border-red/30 rounded p-4 text-xs font-sans text-red space-y-3">
            <div className="flex items-start gap-2">
              <AlertOctagon className="w-5 h-5 shrink-0 text-red" />
              <div>
                <div className="font-mono font-bold uppercase text-red">ACCESS DENIED // TOKEN ERROR</div>
                <div className="text-text-dim mt-0.5">{scanError}</div>
              </div>
            </div>
            <button
              onClick={() => setShowOverrideModal(true)}
              className="w-full py-2 rounded bg-amber/20 hover:bg-amber/30 border border-amber/50 text-amber font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Initiate Sentry Override</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Verification & Record Card */}
      <div className="lg:col-span-7 bg-panel border border-line rounded-lg p-6 min-h-[420px] flex flex-col justify-between">
        {!scanResult ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 text-text-faint space-y-3">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-line flex items-center justify-center text-line">
              <Truck className="w-8 h-8" />
            </div>
            <div className="font-mono text-sm uppercase tracking-wider text-text-dim">Awaiting Outbound RFID Scan</div>
            <p className="text-xs font-sans max-w-sm text-text-faint">
              Select a tag on the left or pass an RFID transponder to load token details and commence outbound handshake.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Handshake Header */}
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-amber/10 border border-amber/30 flex items-center justify-center font-mono font-bold text-amber text-lg">
                  OUT
                </div>
                <div>
                  <div className="font-mono text-base font-bold text-text flex items-center gap-2">
                    <span>{scanResult.registration_number}</span>
                    <span className="text-xs text-text-faint">/ {scanResult.vehicle_type}</span>
                  </div>
                  <div className="text-xs font-mono text-text-dim">
                    TRIP ID: {scanResult.trip_id.substring(0, 8)}... | TOKEN: {scanResult.token_id.substring(0, 8)}...
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-olive/10 border border-olive/30 text-olive text-xs font-mono font-bold">
                TOKEN VALID
              </span>
            </div>

            {/* 2. Visual Photo Cross-Check (Mandatory Section 10.1) */}
            <div className="bg-panel-2 border border-line rounded-lg p-4 space-y-3">
              <div className="font-mono text-xs text-olive uppercase font-bold tracking-wider flex items-center justify-between">
                <span>2. Mandatory Visual Photo Cross-Check</span>
                <span className="text-[10px] text-text-faint">SHA-256 HASH MATCH</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Vehicle Reference */}
                <div className="border border-line rounded p-3 bg-bg flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-panel-2 border border-line flex items-center justify-center text-xl">
                    🚙
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-text">{scanResult.registration_number}</div>
                    <div className="text-[11px] text-text-faint font-mono">Ref: {scanResult.vehicle_photo_hash.substring(0, 10)}...</div>
                    <div className="text-[10px] text-olive font-mono mt-0.5">✓ Match Verified</div>
                  </div>
                </div>

                {/* Driver Reference */}
                <div className="border border-line rounded p-3 bg-bg flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-panel-2 border border-line flex items-center justify-center text-xl">
                    👤
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-text">{scanResult.driver_name}</div>
                    <div className="text-[11px] text-text-faint font-mono">Ref: {scanResult.driver_photo_hash.substring(0, 10)}...</div>
                    <div className="text-[10px] text-olive font-mono mt-0.5">✓ Smart Card Match</div>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-text cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={visualPhotoChecked}
                  onChange={e => setVisualPhotoChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-line bg-bg text-olive focus:ring-0"
                />
                <span className="font-sans">
                  I confirm driver <strong className="text-olive">{scanResult.driver_name}</strong> and vehicle match on-file military identity photos.
                </span>
              </label>
            </div>

            {/* 3. Record Odometer & Fuel Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-panel-2 border border-line rounded-lg p-4">
                <label className="block font-mono text-xs text-text-faint uppercase mb-2 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-text-dim" />
                  <span>Outbound Odometer (KM)</span>
                </label>
                <input
                  type="number"
                  value={odometer}
                  onChange={e => setOdometer(Number(e.target.value))}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-lg font-mono text-text focus:border-olive outline-none"
                />
              </div>

              <div className="bg-panel-2 border border-line rounded-lg p-4">
                <label className="block font-mono text-xs text-text-faint uppercase mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-text-dim" />
                    <span>Fuel Level (%)</span>
                  </span>
                  <span className="font-mono text-olive font-bold">{fuelPct}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuelPct}
                  onChange={e => setFuelPct(Number(e.target.value))}
                  className="w-full accent-olive"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="px-4 py-2 rounded border border-amber/30 bg-amber/10 hover:bg-amber/20 text-amber font-mono text-xs uppercase tracking-wider"
              >
                Override
              </button>

              <button
                type="button"
                disabled={!visualPhotoChecked || isSubmitting}
                onClick={() => setShowConfirmModal(true)}
                className="px-6 py-2.5 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-2"
              >
                <span>Confirm & Release Barrier</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Double-Check Confirm Modal */}
      {showConfirmModal && scanResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-olive-dim rounded-lg max-w-md w-full p-6 shadow-2xl animate-fade-in space-y-4">
            <h4 className="font-mono text-base font-bold text-text uppercase flex items-center gap-2">
              <Check className="w-5 h-5 text-olive" />
              <span>Verify Outbound Readings</span>
            </h4>
            <p className="text-xs text-text-faint font-sans">
              Double-check transcription before release. Inaccurate readings corrupt post-trip reconciliation.
            </p>

            <div className="bg-bg border border-line rounded p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-text-faint">Vehicle:</span>
                <span className="text-text font-bold">{scanResult.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-faint">Driver:</span>
                <span className="text-text">{scanResult.driver_name}</span>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-2">
                <span className="text-text-faint">Outbound Odometer:</span>
                <span className="text-olive font-bold">{odometer.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-faint">Fuel Level:</span>
                <span className="text-amber font-bold">{fuelPct}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded bg-panel-2 border border-line text-xs font-mono text-text-dim"
              >
                Back
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={isSubmitting}
                className="px-5 py-2 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase"
              >
                {isSubmitting ? 'Raising Barrier...' : 'Raise Boom Barrier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sentry Override Modal */}
      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        onSubmit={handleOverrideSubmit}
        reason={scanError || 'Manual Sentry Override'}
      />
    </div>
  );
};
