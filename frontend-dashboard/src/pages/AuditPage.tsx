import React, { useState } from 'react';
import { ShieldCheck, Download, CheckCircle2, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { api } from '../services/api';

export interface AuditEntry {
  ts: string;
  action: string;
  actor: string;
  resource: string;
  sig: string;
}

interface AuditPageProps {
  auditLogs: AuditEntry[];
}

export const AuditPage: React.FC<AuditPageProps> = ({ auditLogs }) => {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    chain_valid: boolean;
    total_entries_verified: number;
    tamper_detected: boolean;
    verified_at: string;
  } | null>(null);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyAuditChain();
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        chain_valid: false,
        total_entries_verified: auditLogs.length,
        tamper_detected: true,
        verified_at: new Date().toISOString()
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.exportAuditLedger();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `M-FTAMS-Audit-Ledger-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.print();
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="font-mono text-xs text-olive tracking-widest uppercase font-bold mb-1">
            Cryptographic Hash-Chain // Immutable Audit Ledger
          </div>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-text">
            Audit Trail &amp; Verification
          </h1>
          <p className="text-xs text-text-dim font-sans mt-1">
            Every gate transaction, MTO approval, role assignment and system alert signed via HMAC-SHA256 hash-chain (§9.2).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-panel-2 border border-line hover:border-olive text-text hover:text-olive font-mono text-xs uppercase font-bold transition-all disabled:opacity-40"
          >
            <ShieldCheck className={`w-4 h-4 text-olive ${verifying ? 'animate-spin' : ''}`} />
            <span>Verify Hash-Chain</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono text-xs uppercase font-bold transition-all shadow"
          >
            <Download className="w-4 h-4" />
            <span>Export Certified Ledger</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div className={`p-4 rounded border flex items-center justify-between font-mono text-xs ${
          verificationResult.chain_valid
            ? 'bg-olive/10 border-olive/30 text-olive'
            : 'bg-red/10 border-red/30 text-red'
        }`}>
          <div className="flex items-center gap-2.5">
            {verificationResult.chain_valid ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <div>
              <div className="font-bold uppercase tracking-wider">
                {verificationResult.chain_valid
                  ? 'Cryptographic Hash-Chain Integrity: Fully Verified (0 Tamper Events)'
                  : 'INTEGRITY ALERT: Chain verification failed / potential tamper detected'}
              </div>
              <div className="text-[11px] text-text-dim mt-0.5">
                Verified {verificationResult.total_entries_verified} blocks from Genesis block to Tip at {new Date(verificationResult.verified_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-bg border border-line text-text text-[10px] font-bold">
            HMAC-SHA256 CERTIFIED
          </span>
        </div>
      )}

      {/* Audit Table */}
      <div className="bg-panel border border-line rounded-lg p-4">
        {auditLogs.length === 0 ? (
          <div className="text-center py-10 text-text-faint font-sans text-xs">
            <div className="font-mono text-lg text-line mb-2">＿</div>
            No audit entries yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line text-text-faint font-mono uppercase text-[10px]">
                  <th className="py-2 px-2.5">Timestamp</th>
                  <th className="py-2 px-2.5">Action</th>
                  <th className="py-2 px-2.5">Actor</th>
                  <th className="py-2 px-2.5">Resource</th>
                  <th className="py-2 px-2.5">HMAC Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft font-sans">
                {auditLogs.slice(0, 60).map((a, i) => (
                  <tr key={i} className="hover:bg-panel-2 transition-colors">
                    <td className="py-2.5 px-2.5 font-mono text-text-faint text-[11px]">
                      {fmtDateTime(a.ts)}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono font-semibold text-text">
                      {a.action}
                    </td>
                    <td className="py-2.5 px-2.5 text-text-dim">{a.actor}</td>
                    <td className="py-2.5 px-2.5 font-mono text-text-dim">{a.resource}</td>
                    <td className="py-2.5 px-2.5">
                      <span className="font-mono text-[9.5px] text-steel bg-steel/8 border border-steel/25 px-2 py-0.5 rounded inline-block">
                        {a.sig.slice(0, 20)}…
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

