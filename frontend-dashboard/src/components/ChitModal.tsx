import React, { useEffect, useState } from 'react';
import { Printer, X, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { QrCodeRenderer } from './QrCodeRenderer';
import { api, GatePassChit } from '../services/api';

interface ChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
}

export const ChitModal: React.FC<ChitModalProps> = ({ isOpen, onClose, tokenId }) => {
  const [chit, setChit] = useState<GatePassChit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tokenId) {
      setLoading(true);
      setError(null);
      api.getGatePassChit(tokenId)
        .then(setChit)
        .catch((err) => setError(err.message || 'Failed to generate chit'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, tokenId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-lg max-w-lg w-full p-6 shadow-2xl animate-fade-in text-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-olive" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider">
              Official Sortie Gate-Pass Chit
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
            Generating cryptographic gate-pass chit and QR matrix...
          </div>
        ) : error ? (
          <div className="p-4 bg-red/10 border border-red/30 rounded text-red font-mono text-xs text-center">
            {error}
          </div>
        ) : chit ? (
          <div>
            {/* Printable Slip Paper Preview */}
            <div className="bg-white text-black p-5 rounded border border-gray-300 font-sans shadow-inner print:p-0 print:border-none">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b-2 border-black mb-3">
                <div className="font-bold text-xs uppercase tracking-widest text-gray-900">
                  INDIAN ARMY // TRANSPORTATION & GATE CONTROL
                </div>
                <div className="font-mono font-extrabold text-base tracking-wider mt-0.5 text-black">
                  OFFICIAL SORTIE GATE-PASS CHIT
                </div>
                <div className="font-mono text-[10px] text-gray-600">
                  {chit.unit_name.toUpperCase()} // AIR-GAPPED VERIFICATION PROOF
                </div>
              </div>

              {/* Chit Body Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="col-span-2 space-y-1 text-[11px]">
                  <div>
                    <span className="font-semibold text-gray-600">CHIT NUMBER: </span>
                    <span className="font-mono font-bold text-black">{chit.chit_number}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">DESTINATION: </span>
                    <span className="font-bold text-black">{chit.destination}</span>
                    <span className="text-gray-600 ml-1">({chit.planned_distance_km} KM)</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">PURPOSE: </span>
                    <span className="text-black">{chit.purpose}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">VEHICLE: </span>
                    <span className="font-mono font-bold text-black">{chit.vehicle_registration}</span>
                    <span className="text-gray-600 ml-1">({chit.vehicle_type})</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">DRIVER: </span>
                    <span className="font-bold text-black">{chit.driver_name}</span>
                    <span className="font-mono text-[10px] text-gray-600 ml-1">[{chit.driver_service_number}]</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">DEPARTURE: </span>
                    <span className="font-mono text-[10px] text-black">{new Date(chit.authorized_departure).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">ISSUED BY: </span>
                    <span className="text-black">{chit.issued_by_name}</span>
                  </div>
                </div>

                {/* Offline Vector QR Code */}
                <div className="flex flex-col items-center justify-center">
                  <QrCodeRenderer value={chit.qr_payload} size={110} label="HMAC SEAL" />
                </div>
              </div>

              {/* Cryptographic Signature Stamp */}
              <div className="bg-gray-100 p-2 rounded border border-gray-300 font-mono text-[9px] text-gray-700 break-all mb-3">
                <span className="font-bold">HMAC-SHA256 STAMP: </span>
                {chit.token_signature}
              </div>

              {/* Sentry Signature Lines */}
              <div className="border-t border-gray-400 pt-3 mt-1 grid grid-cols-2 gap-4 text-[9px] text-gray-700 font-mono">
                <div>
                  <div className="h-6 border-b border-dashed border-gray-400"></div>
                  <div className="mt-1">MTO ISSUING OFFICER</div>
                </div>
                <div>
                  <div className="h-6 border-b border-dashed border-gray-400"></div>
                  <div className="mt-1">GATE SENTRY CLEARANCE</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-line">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-panel-2 border border-line text-text-dim hover:text-text font-mono text-xs uppercase"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Pass Chit</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
