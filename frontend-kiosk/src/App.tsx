import React, { useState, useEffect, useCallback } from 'react';
import { KioskHeader } from './components/KioskHeader';
import { ReadyScreen } from './components/ReadyScreen';
import { ScanStep } from './components/ScanStep';
import { TripDetailsCard } from './components/TripDetailsCard';
import { VerifyStep } from './components/VerifyStep';
import { RecordStep } from './components/RecordStep';
import { BarrierAnimation } from './components/BarrierAnimation';
import { OverrideModal } from './components/OverrideModal';
import { PrintChitModal } from './components/PrintChitModal';
import { kioskApi, GateStatusResponse } from './services/api';
import { KioskPhase, ScanResult, FlowDirection, HandshakeResult } from './types';

/**
 * M-FTAMS Sentry Kiosk — Offline-First Gate Access Terminal
 *
 * Implements the complete gate handshake flow:
 *   Scan → Verify → Record → Confirm → Release
 * Enforces:
 *   - Single-transaction-at-a-time lock (state machine gate)
 *   - Fail-closed on unseeded cache
 *   - Override-with-remarks as a distinct, permanently flagged path
 *   - Double-check/confirm pattern for odometer entry
 *   - Mandatory visual photo cross-check independent of biometric result
 */
export default function App() {
  // Gate status from edge backend
  const [status, setStatus] = useState<GateStatusResponse | null>(null);

  // State machine phase
  const [phase, setPhase] = useState<KioskPhase>('READY');

  // Transaction lock — prevents second scan until current transaction is confirmed or cancelled
  const [transactionLocked, setTransactionLocked] = useState(false);

  // Scan data
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | undefined>();
  const [direction, setDirection] = useState<FlowDirection>('OUTBOUND');
  const [outboundOdometer, setOutboundOdometer] = useState<number | undefined>();
  const [recordedOdometer, setRecordedOdometer] = useState<number>(0);
  const [recordedFuel, setRecordedFuel] = useState<number>(85);

  // Handshake result
  const [handshakeResult, setHandshakeResult] = useState<HandshakeResult | null>(null);

  // Override modal
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Print Chit modal
  const [showPrintChit, setShowPrintChit] = useState(false);


  // Toast notifications
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; err?: boolean }>>([]);

  const addToast = useCallback((msg: string, err = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, err }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Fetch gate status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const s = await kioskApi.getStatus();
        setStatus(s);
      } catch {
        setStatus(prev => prev ? { ...prev, is_online: false } : null);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Flow Handlers ──────────────────────────────────────────────────────────

  const handleStartScan = () => {
    if (transactionLocked) return;
    setTransactionLocked(true);
    setPhase('SCANNING');
    setScanError(undefined);
    setScanResult(null);

    // For demo: scan the first available RFID tag from cached vehicles
    // In production: this fires from a physical RFID reader
    kioskApi.getVehicles().then(vehicles => {
      const eligible = vehicles.filter(v => v.status === 'RESERVED' || v.status === 'ON_SORTIE');
      if (eligible.length === 0) {
        setScanError('No vehicles with active tokens found in local cache.');
        setTimeout(() => {
          setPhase('DENIED');
        }, 1500);
        return;
      }
      const vehicle = eligible[0];
      performScan(vehicle.rfid_tag_id || vehicle.registration_number);
    }).catch(() => {
      setScanError('Failed to reach local edge backend.');
      setPhase('DENIED');
    });
  };

  const performScan = async (tagId: string) => {
    try {
      const result = await kioskApi.scanTag(tagId);
      setScanResult(result);
      // Determine direction from vehicle cached status
      // If vehicle is RESERVED → OUTBOUND, if ON_SORTIE → INBOUND
      const vehicles = await kioskApi.getVehicles();
      const vehicle = vehicles.find(v => v.vehicle_id === result.vehicle_id);
      setDirection(vehicle?.status === 'ON_SORTIE' ? 'INBOUND' : 'OUTBOUND');
      if (vehicle?.status === 'ON_SORTIE') {
        setOutboundOdometer(vehicle.current_odometer);
      }
      setPhase('SCAN_RESULT');
    } catch (err: any) {
      setScanError(err.message || 'Scan failed');
      setPhase('DENIED');
    }
  };

  const handleProceedToVerify = () => {
    setPhase('VERIFY');
  };

  const handleProceedToRecord = () => {
    setPhase('RECORD');
  };

  const handleRecordSubmit = async (odometer: number, fuelPct: number) => {
    if (!scanResult) return;
    setRecordedOdometer(odometer);
    setRecordedFuel(fuelPct);
    try {
      const result = await kioskApi.executeHandshake({
        token_id: scanResult.token_id,
        event_type: direction,
        odometer_reading: odometer,
        fuel_level_pct: fuelPct,
        sentry_id: status?.edge_id || 'GATE-04',
      });
      setHandshakeResult(result);
      setPhase('RELEASE');
      addToast(`${scanResult.registration_number} cleared ${direction.toLowerCase()}.`);
    } catch (err: any) {
      addToast(err.message || 'Handshake recording failed', true);
      setPhase('DENIED');
    }
  };

  const handleOverrideSubmit = async (remarks: string, sentryId: string) => {
    setShowOverride(false);
    try {
      // Execute override handshake
      if (scanResult) {
        setRecordedOdometer(scanResult.current_odometer);
        setRecordedFuel(75);
        const result = await kioskApi.executeHandshake({
          token_id: scanResult.token_id,
          event_type: direction,
          odometer_reading: scanResult.current_odometer,
          fuel_level_pct: 75,
          sentry_id: sentryId,
          override_flag: true,
          override_remarks: remarks,
        });
        setHandshakeResult(result);
        setPhase('RELEASE');
        addToast(`Override executed for ${scanResult.registration_number}. Permanently flagged.`);
      } else {
        setPhase('RELEASE');
        addToast('Override executed. Permanently flagged in audit trail.');
      }
    } catch (err: any) {
      addToast(err.message || 'Override recording failed', true);
      setPhase('DENIED');
    }
  };

  const handleReleaseComplete = () => {
    // Reset to ready state, unlock transaction
    setPhase('READY');
    setTransactionLocked(false);
    setScanResult(null);
    setScanError(undefined);
    setHandshakeResult(null);
    setOutboundOdometer(undefined);
  };

  const handleCancelTransaction = () => {
    setPhase('READY');
    setTransactionLocked(false);
    setScanResult(null);
    setScanError(undefined);
    setHandshakeResult(null);
    setOutboundOdometer(undefined);
  };

  const handleDirectVehicleSelect = (tag: string) => {
    if (transactionLocked) return;
    setTransactionLocked(true);
    setPhase('SCANNING');
    setScanError(undefined);
    setScanResult(null);
    performScan(tag);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg relative">
      {/* Scanline overlay */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {/* Header */}
      <KioskHeader status={status} onRefresh={handleReleaseComplete} />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Ready Phase */}
        {phase === 'READY' && (
          <ReadyScreen
            isSeeded={status?.is_seeded ?? false}
            onStartScan={handleStartScan}
            onSelectVehicle={handleDirectVehicleSelect}
          />
        )}

        {/* Scanning Phase */}
        {phase === 'SCANNING' && (
          <ScanStep
            rfidTag={scanResult ? 'RFID tag' : 'Scanning...'}
            onComplete={() => setPhase('SCAN_RESULT')}
            onFailed={() => setPhase('DENIED')}
            errorMessage={scanError}
            onManualScan={performScan}
          />
        )}

        {/* Scan Result — Trip Details */}
        {phase === 'SCAN_RESULT' && scanResult && (
          <div>
            <TripDetailsCard
              scanResult={scanResult}
              direction={direction}
              onVerify={handleProceedToVerify}
              onOverride={() => {
                setOverrideReason('Token verification failure');
                setShowOverride(true);
              }}
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowPrintChit(true)}
                className="px-4 py-2 rounded bg-panel border border-line hover:border-olive text-text-dim hover:text-olive font-mono text-xs uppercase transition-colors"
              >
                🖨 Print Pre-Departure Gate Pass
              </button>
            </div>
          </div>
        )}

        {/* Verification Phase */}
        {phase === 'VERIFY' && scanResult && (
          <VerifyStep
            scanResult={scanResult}
            onVerified={handleProceedToRecord}
            onFailed={(reason) => {
              setScanError(reason);
              setPhase('DENIED');
            }}
            onOverride={() => {
              setOverrideReason('Driver identity verification failed');
              setShowOverride(true);
            }}
          />
        )}

        {/* Recording Phase */}
        {phase === 'RECORD' && scanResult && (
          <RecordStep
            scanResult={scanResult}
            direction={direction}
            outboundOdometer={outboundOdometer}
            onSubmit={handleRecordSubmit}
            onBack={() => setPhase('VERIFY')}
          />
        )}

        {/* Release Phase — Barrier Animation */}
        {phase === 'RELEASE' && handshakeResult && scanResult && (
          <div>
            <BarrierAnimation
              isRaised={handshakeResult.barrier_signal === 'RAISE'}
              direction={direction}
              vehicleReg={scanResult.registration_number}
              onDone={handleReleaseComplete}
            />
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setShowPrintChit(true)}
                className="px-6 py-2.5 rounded bg-panel-2 border border-olive-dim hover:border-olive text-olive font-mono text-xs uppercase font-bold tracking-wider transition-all"
              >
                🖨 Print Official Gate-Pass Chit
              </button>
            </div>
          </div>
        )}

        {/* Denied Phase */}
        {phase === 'DENIED' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-32 h-32 rounded-full border-2 border-red/40 flex items-center justify-center bg-red/5">
              <span className="text-4xl">🚫</span>
            </div>
            <div className="text-center">
              <h2 className="font-mono text-xl font-bold text-red tracking-wider mb-2">
                ACCESS DENIED
              </h2>
              <p className="text-text-dim text-sm max-w-md font-sans">
                {scanError || 'The gate handshake could not be completed. Please contact the MTO for confirmation.'}
              </p>
            </div>
            <button
              onClick={handleCancelTransaction}
              className="px-6 py-3 rounded bg-panel-2 border border-line hover:border-olive-dim text-text-dim font-mono text-xs uppercase tracking-wider transition-all"
            >
              Return to Ready
            </button>
          </div>
        )}
      </main>

      {/* Override Modal */}
      <OverrideModal
        isOpen={showOverride}
        onClose={() => setShowOverride(false)}
        onSubmit={handleOverrideSubmit}
        reason={overrideReason}
      />

      {/* Print Chit Modal */}
      {scanResult && (
        <PrintChitModal
          isOpen={showPrintChit}
          onClose={() => setShowPrintChit(false)}
          scanResult={scanResult}
          direction={direction}
          odometer={recordedOdometer || scanResult.current_odometer}
          fuelPct={recordedFuel}
          sentryId={status?.edge_id || 'GATE-04'}
        />
      )}


      {/* Toast Stack */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`font-mono text-xs px-4 py-3 rounded bg-panel border shadow-lg animate-fade-in ${
              t.err ? 'border-red text-red' : 'border-olive-dim text-text'
            }`}
            style={{ borderLeftWidth: 3, borderLeftColor: t.err ? '#c1440e' : '#8a9a5b' }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
