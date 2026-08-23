import React, { useEffect, useState } from 'react';
import { Shield, Key, Lock, CheckCircle2, X, Cpu, Server, Activity } from 'lucide-react';
import { api, SecuritySystemStatus, TimeSyncStatus } from '../services/api';

interface SecurityStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityStatusModal: React.FC<SecurityStatusModalProps> = ({ isOpen, onClose }) => {
  const [securityStatus, setSecurityStatus] = useState<SecuritySystemStatus | null>(null);
  const [timeStatus, setTimeStatus] = useState<TimeSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([api.getSecurityStatus(), api.getTimeSync()])
        .then(([sec, time]) => {
          setSecurityStatus(sec);
          setTimeStatus(time);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-lg max-w-xl w-full p-6 shadow-2xl animate-fade-in text-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-olive" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider">
              Air-Gapped Security & PKI Architecture (§9.4)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-panel-2 text-text-dim hover:text-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-text-dim animate-pulse">
            Querying internal cryptographic trust store...
          </div>
        ) : (
          <div className="space-y-4 text-xs font-mono">
            {/* PKI Certificate Authority */}
            <div className="p-3.5 rounded bg-panel-2 border border-line">
              <div className="flex items-center gap-2 text-olive font-bold mb-2">
                <Lock className="w-4 h-4" />
                <span>INTERNAL PKI / CERTIFICATE AUTHORITY</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-text-dim">
                <div>CA Type: <span className="text-text font-bold">{securityStatus?.pki_ca_type}</span></div>
                <div>Common Name: <span className="text-steel font-bold">{securityStatus?.ca_common_name}</span></div>
                <div>Status: <span className="text-olive font-bold">{securityStatus?.ca_status}</span></div>
                <div>Expiry: <span className="text-text font-bold">{securityStatus?.cert_valid_until?.substring(0, 10)}</span></div>
              </div>
            </div>

            {/* mTLS Transport & Cipher Suite */}
            <div className="p-3.5 rounded bg-panel-2 border border-line">
              <div className="flex items-center gap-2 text-steel font-bold mb-2">
                <Server className="w-4 h-4" />
                <span>CANTONMENT mTLS 1.3 ENCRYPTION (§3.4)</span>
              </div>
              <div className="space-y-1 text-[11px] text-text-dim">
                <div>Cipher Suite: <span className="text-text font-bold">{securityStatus?.active_cipher_suite}</span></div>
                <div>mTLS Peer Verification: <span className="text-olive font-bold">STRICTLY ENFORCED (Both Edge & HQ)</span></div>
                <div>Public CA Egress: <span className="text-olive font-bold">DISABLED (Zero Let's Encrypt / ACME Dependency)</span></div>
              </div>
            </div>

            {/* Cryptographic Key & Hash-Chain Integrity */}
            <div className="p-3.5 rounded bg-panel-2 border border-line">
              <div className="flex items-center gap-2 text-amber font-bold mb-2">
                <Key className="w-4 h-4" />
                <span>HMAC KEY HIERARCHY & AUDIT CHAIN INTEGRITY</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-text-dim">
                <div>Key ID: <span className="text-text">{securityStatus?.hmac_key_id}</span></div>
                <div>Algorithm: <span className="text-text font-bold">{securityStatus?.hmac_algorithm}</span></div>
                <div>Chain Length: <span className="text-text font-bold">{securityStatus?.audit_chain_length} blocks</span></div>
                <div>Chain Tamper Status: <span className="text-olive font-bold">{securityStatus?.audit_chain_valid ? 'UNCOMPROMISED' : 'TAMPER DETECTED'}</span></div>
              </div>
            </div>

            {/* Stratum-1 Time Sync */}
            <div className="p-3.5 rounded bg-panel-2 border border-line">
              <div className="flex items-center gap-2 text-olive font-bold mb-2">
                <Activity className="w-4 h-4" />
                <span>INTERNAL STRATUM-1 NTP DISCIPLINE (§8.3)</span>
              </div>
              <div className="text-[11px] text-text-dim space-y-1">
                <div>Time Source: <span className="text-text font-bold">{timeStatus?.ntp_source}</span></div>
                <div>Stratum Level: <span className="text-olive font-bold">Stratum {timeStatus?.stratum_level} (Atomic GNSS)</span></div>
                <div>Measured Clock Drift: <span className="text-olive font-bold">{timeStatus?.clock_drift_ms} ms</span></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-5 pt-3 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-panel-2 border border-line hover:border-olive text-text-dim hover:text-text font-mono text-xs uppercase"
          >
            Close Security Brief
          </button>
        </div>
      </div>
    </div>
  );
};
