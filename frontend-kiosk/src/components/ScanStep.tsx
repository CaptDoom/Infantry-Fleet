import React, { useEffect, useState } from 'react';
import { Radio, QrCode, AlertTriangle, Cpu, Scan } from 'lucide-react';

interface ScanStepProps {
  rfidTag: string;
  onComplete: () => void;
  onFailed: () => void;
  errorMessage?: string;
  onManualScan?: (tag: string) => void;
}

export const ScanStep: React.FC<ScanStepProps> = ({
  rfidTag,
  onComplete,
  onFailed,
  errorMessage,
  onManualScan
}) => {
  const [progress, setProgress] = useState(0);
  const [scanMode, setScanMode] = useState<'RFID' | 'QR'>('RFID');
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [scanMode]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        if (errorMessage) {
          onFailed();
        } else {
          onComplete();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [progress, errorMessage, onComplete, onFailed]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim() && onManualScan) {
      onManualScan(manualInput.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
      {/* Mode Selector */}
      <div className="flex items-center gap-2 p-1 rounded bg-panel-2 border border-line">
        <button
          onClick={() => { setScanMode('RFID'); setProgress(0); }}
          className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all ${
            scanMode === 'RFID'
              ? 'bg-olive text-bg font-bold shadow'
              : 'text-text-dim hover:text-text'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>RFID / NFC (libnfc)</span>
        </button>
        <button
          onClick={() => { setScanMode('QR'); setProgress(0); }}
          className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all ${
            scanMode === 'QR'
              ? 'bg-olive text-bg font-bold shadow'
              : 'text-text-dim hover:text-text'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Optical QR (ZXing)</span>
        </button>
      </div>

      {/* Scanner Visualizer */}
      <div className="relative">
        <div className={`w-48 h-48 rounded-full border-2 ${scanMode === 'RFID' ? 'border-olive' : 'border-steel'} border-dashed animate-spin-slow flex items-center justify-center bg-panel`}>
          <div className="w-32 h-32 rounded-full border border-line flex items-center justify-center bg-panel-2">
            {scanMode === 'RFID' ? (
              <Radio className="w-12 h-12 text-olive animate-pulse" />
            ) : (
              <Scan className="w-12 h-12 text-steel animate-pulse" />
            )}
          </div>
        </div>

        {/* Progress Arc */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100" cy="100" r="96"
            fill="none"
            stroke={scanMode === 'RFID' ? '#8a9a5b' : '#68829e'}
            strokeWidth="3"
            strokeDasharray={`${progress * 6.03} 603`}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
      </div>

      {/* Status Text */}
      <div className="text-center">
        <h2 className="font-mono text-lg font-bold text-text tracking-wider mb-1">
          {scanMode === 'RFID' ? 'READING HARDWARE RFID TAG' : 'OPTICAL 2D QR CODE DECODE'}
        </h2>
        <p className="font-mono text-xs text-text-dim">
          Target: <span className="text-steel font-bold">{rfidTag}</span>
        </p>
        <div className="mt-3 w-64 mx-auto h-1.5 bg-panel-2 rounded-full overflow-hidden">
          <div
            className={`h-full ${scanMode === 'RFID' ? 'bg-olive' : 'bg-steel'} rounded-full transition-all duration-100`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-mono text-[10px] text-text-faint mt-2">
          {progress}% — SQLite indexed lookup (&lt;500ms deterministic)
        </p>
      </div>

      {/* Manual Sentry Override / Direct Tag Bar */}
      {onManualScan && (
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-sm w-full mt-2">
          <input
            type="text"
            placeholder="Scan / Type RFID Tag or Token ID..."
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-panel-2 border border-line text-text font-mono text-xs focus:border-olive outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-panel border border-line hover:border-olive text-olive font-mono text-xs uppercase"
          >
            Scan
          </button>
        </form>
      )}

      {/* Error Display */}
      {errorMessage && progress >= 100 && (
        <div className="bg-red/10 border border-red/30 rounded-lg p-4 max-w-md flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-xs text-red font-bold uppercase">Access Denied</p>
            <p className="text-sm text-text-dim mt-1">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

