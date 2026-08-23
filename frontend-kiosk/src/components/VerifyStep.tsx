import React, { useState } from 'react';
import { Fingerprint, CreditCard, Eye, CheckCircle2, XCircle, ShieldCheck, KeyRound, Cpu } from 'lucide-react';
import { ScanResult } from '../types';
import { kioskApi } from '../services/api';

interface VerifyStepProps {
  scanResult: ScanResult;
  onVerified: () => void;
  onFailed: (reason: string) => void;
  onOverride: () => void;
}

export const VerifyStep: React.FC<VerifyStepProps> = ({
  scanResult,
  onVerified,
  onFailed,
  onOverride,
}) => {
  const [method, setMethod] = useState<'FINGERPRINT' | 'SMART_CARD'>('FINGERPRINT');
  const [bioVerified, setBioVerified] = useState<boolean | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (selectedMethod: 'FINGERPRINT' | 'SMART_CARD', shouldSucceed: boolean) => {
    setIsVerifying(true);
    setBioVerified(null);
    setMatchScore(null);

    try {
      const score = shouldSucceed ? Math.floor(92 + Math.random() * 7) : Math.floor(45 + Math.random() * 25);
      const res = await kioskApi.verifyDriver(
        scanResult.token_id,
        scanResult.driver_id,
        selectedMethod,
        shouldSucceed,
        score
      );

      setBioVerified(true);
      setMatchScore(score);
    } catch (err: any) {
      setBioVerified(false);
      setMatchScore(err.match_score || 58);
    } finally {
      setIsVerifying(false);
    }
  };

  const canProceed = bioVerified === true && photoConfirmed;

  return (
    <div className="bg-panel border border-line rounded-lg p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-olive" />
          <span className="font-mono text-sm font-bold text-text uppercase tracking-wider">
            Identity Verification — Multi-Factor
          </span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-panel-2 border border-line text-steel">
          AIR-GAPPED ON-BOX ENGINE
        </span>
      </div>

      {/* Method Tabs */}
      <div className="flex gap-2 p-1 bg-panel-2 rounded border border-line mb-4">
        <button
          onClick={() => { setMethod('FINGERPRINT'); setBioVerified(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all ${
            method === 'FINGERPRINT' ? 'bg-olive text-bg font-bold shadow' : 'text-text-dim hover:text-text'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          <span>Biometric (SourceAFIS / libfprint)</span>
        </button>
        <button
          onClick={() => { setMethod('SMART_CARD'); setBioVerified(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all ${
            method === 'SMART_CARD' ? 'bg-olive text-bg font-bold shadow' : 'text-text-dim hover:text-text'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Smart Card (PC/SC PKI)</span>
        </button>
      </div>

      {/* Step 1: Credential Verification */}
      <div className="mb-5 p-4 rounded bg-panel-2 border border-line">
        <div className="text-xs font-mono text-text-faint uppercase tracking-wider mb-3">
          Step 1: Driver Physical Factor Match
        </div>

        {method === 'FINGERPRINT' ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded bg-bg border border-line flex items-center justify-center relative overflow-hidden">
                <Fingerprint className={`w-10 h-10 ${isVerifying ? 'text-olive animate-pulse' : 'text-text-dim'}`} />
                {isVerifying && (
                  <div className="absolute inset-0 bg-olive/10 border-b-2 border-olive animate-bounce" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-mono text-xs text-text font-bold">Optical Minutiae Matcher</div>
                <div className="font-mono text-[11px] text-text-dim mt-0.5">
                  Reference Template: <span className="text-steel font-mono">{scanResult.driver_photo_hash.substring(0, 12)}...</span>
                </div>
                <div className="font-mono text-[10px] text-text-faint mt-1">
                  Threshold: &ge;85.0% similarity score
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVerify('FINGERPRINT', true)}
                disabled={isVerifying || bioVerified === true}
                className="flex items-center justify-center gap-2 p-3 rounded bg-olive/20 border border-olive hover:bg-olive hover:text-bg text-olive font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Simulate Fingerprint Match</span>
              </button>
              <button
                onClick={() => handleVerify('FINGERPRINT', false)}
                disabled={isVerifying || bioVerified === true}
                className="flex items-center justify-center gap-2 p-3 rounded bg-red/10 border border-red/30 hover:bg-red/20 text-red font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
                <span>Simulate Mismatch</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded bg-bg border border-line flex items-center justify-center">
                <CreditCard className={`w-10 h-10 ${isVerifying ? 'text-steel animate-pulse' : 'text-text-dim'}`} />
              </div>
              <div className="flex-1">
                <div className="font-mono text-xs text-text font-bold">PC/SC Smart-Card Chip Reader</div>
                <div className="font-mono text-[11px] text-text-dim mt-0.5">
                  Slot: USB Contactless / ISO 7816 Terminal
                </div>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter 4-6 digit Driver PIN (Default: 1234)"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 rounded bg-bg border border-line text-text font-mono text-xs focus:border-steel outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVerify('SMART_CARD', true)}
                disabled={isVerifying || bioVerified === true}
                className="flex items-center justify-center gap-2 p-3 rounded bg-steel/20 border border-steel hover:bg-steel hover:text-bg text-steel font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                <KeyRound className="w-4 h-4" />
                <span>Verify Smart-Card PIN</span>
              </button>
              <button
                onClick={() => handleVerify('SMART_CARD', false)}
                disabled={isVerifying || bioVerified === true}
                className="flex items-center justify-center gap-2 p-3 rounded bg-red/10 border border-red/30 hover:bg-red/20 text-red font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
                <span>Bad PIN / Invalid Chip</span>
              </button>
            </div>
          </div>
        )}

        {/* Verification Result Banner */}
        {bioVerified !== null && (
          <div className={`mt-3 flex items-center justify-between p-3 rounded border ${
            bioVerified ? 'bg-olive/10 border-olive/30 text-olive' : 'bg-red/10 border-red/30 text-red'
          }`}>
            <div className="flex items-center gap-2">
              {bioVerified ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-mono text-xs font-bold uppercase">
                {bioVerified ? 'Driver Factor Validated' : 'Identity Factor Rejected'}
              </span>
            </div>
            {matchScore !== null && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg border border-line">
                Score: {matchScore}%
              </span>
            )}
          </div>
        )}

        {bioVerified === false && (
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => setBioVerified(null)}
              className="flex-1 p-2 rounded border border-line bg-bg text-text-dim hover:text-text font-mono text-xs uppercase"
            >
              Retry Factor
            </button>
            <button
              onClick={onOverride}
              className="flex-1 p-2 rounded border border-amber/30 bg-amber/10 text-amber font-mono text-xs uppercase"
            >
              Sentry Override with Remarks
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Visual Photo Cross-Check (Mandatory) */}
      <div className="mb-5">
        <div className="text-xs font-mono text-text-faint uppercase tracking-wider mb-2">
          Step 2: Mandatory Visual Cross-Check
        </div>

        <div className="p-4 bg-panel-2 rounded border border-line">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded bg-bg border border-line flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <div className="flex-1">
              <div className="font-mono font-bold text-text text-sm">{scanResult.driver_name}</div>
              <div className="text-xs text-text-faint font-sans mt-0.5">
                On-file reference photo — visually compare with driver physically at sentry window
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded bg-bg border border-line cursor-pointer hover:border-olive-dim transition-colors">
            <input
              type="checkbox"
              checked={photoConfirmed}
              onChange={e => setPhotoConfirmed(e.target.checked)}
              disabled={bioVerified !== true}
              className="w-4 h-4 accent-olive"
            />
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-olive" />
              <span className="font-mono text-xs text-text uppercase tracking-wider">
                I confirm the driver physically present matches this on-file record
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onVerified}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-4 h-4" />
        Verification Complete — Proceed to Recording
      </button>
    </div>
  );
};

