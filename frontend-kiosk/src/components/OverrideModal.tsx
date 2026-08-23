import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (remarks: string, sentryId: string) => void;
  reason?: string;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reason
}) => {
  const [remarks, setRemarks] = useState('');
  const [sentryId, setSentryId] = useState('sentry_duty_officer');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError('Override remarks are strictly mandatory. State operational justification or verbal order authority.');
      return;
    }
    setError('');
    onSubmit(remarks.trim(), sentryId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-panel border-2 border-amber rounded-lg max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-amber/10 border border-amber/30 flex items-center justify-center text-amber">
              <ShieldAlert className="w-6 h-6 text-amber" />
            </div>
            <div>
              <h3 className="font-mono text-base font-bold text-amber uppercase tracking-wide">
                Sentry Override-With-Remarks
              </h3>
              <p className="font-mono text-xs text-text-faint">
                SECTION 10.3 EXCEPTION PROCEDURE // PERMANENT AUDIT FLAG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text p-1 rounded hover:bg-panel-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber/10 border border-amber/30 rounded p-3 text-amber text-xs font-sans mb-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <div>
            <strong>NOTICE:</strong> Executing an override bypasses automated validation checks. This action is permanently recorded in the immutable audit log and flagged for Commander and MTO review.
            {reason && <div className="mt-1 text-text">Trigger Reason: <span className="font-mono text-amber">{reason}</span></div>}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase text-text-faint tracking-wider mb-2">
              Sentry Duty ID / Service Number
            </label>
            <input
              type="text"
              value={sentryId}
              onChange={e => setSentryId(e.target.value)}
              className="w-full bg-bg border border-line rounded px-3 py-2 text-sm font-mono text-text focus:border-amber outline-none"
              placeholder="e.g. Hav. Digvijay Singh (1482910P)"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase text-text-faint tracking-wider mb-2">
              Operational Justification / Verbal Authority (Mandatory)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => {
                setRemarks(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-bg border border-line rounded px-3 py-2 text-sm font-sans text-text focus:border-amber outline-none resize-none"
              placeholder="e.g. Authorized by Station Commander via tactical radio channel for immediate medical emergency convoy release."
              required
            />
            {error && <p className="text-red font-mono text-xs mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-panel-2 border border-line hover:border-line-soft text-text-dim text-xs font-mono uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-amber hover:bg-[#e0b04c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Authorize & Release Barrier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
