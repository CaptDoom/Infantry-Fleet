import React from 'react';
import { Printer, X, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { QrCodeRenderer } from './QrCodeRenderer';
import { ScanResult } from '../types';

interface PrintChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResult;
  direction: 'OUTBOUND' | 'INBOUND';
  odometer: number;
  fuelPct: number;
  sentryId: string;
}

export const PrintChitModal: React.FC<PrintChitModalProps> = ({
  isOpen,
  onClose,
  scanResult,
  direction,
  odometer,
  fuelPct,
  sentryId
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const chitNumber = `CHIT-${scanResult.token_id.substring(0, 8).toUpperCase()}`;

  const qrData = JSON.stringify({
    t_id: scanResult.token_id,
    v_reg: scanResult.registration_number,
    d_nm: scanResult.driver_name,
    dir: direction,
    odo: odometer,
    sentry: sentryId,
    ts: now.toISOString()
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-lg max-w-lg w-full p-6 shadow-2xl animate-fade-in text-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-olive" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider">
              Military Gate-Pass Physical Chit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-panel-2 text-text-dim hover:text-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
              STATION CANTONMENT // AIR-GAPPED VERIFICATION PROOF
            </div>
          </div>

          {/* Chit Body Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="col-span-2 space-y-1.5 text-[11px]">
              <div>
                <span className="font-semibold text-gray-600">CHIT NUMBER: </span>
                <span className="font-mono font-bold text-black">{chitNumber}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">VEHICLE REG: </span>
                <span className="font-mono font-bold text-black">{scanResult.registration_number}</span>
                <span className="text-gray-600 ml-1">({scanResult.vehicle_type})</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">DRIVER: </span>
                <span className="font-bold text-black">{scanResult.driver_name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">MOVEMENT: </span>
                <span className="font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-gray-200 text-black">
                  {direction} PASSAGE
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">ODOMETER: </span>
                <span className="font-mono font-bold text-black">{odometer.toLocaleString()} KM</span>
                <span className="text-gray-600 ml-2">FUEL: {fuelPct}%</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">TIME: </span>
                <span className="font-mono text-[10px] text-black">{now.toLocaleString()}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">SENTRY POST: </span>
                <span className="font-mono font-bold text-black">{sentryId}</span>
              </div>
            </div>

            {/* Offline Vector QR Code */}
            <div className="flex flex-col items-center justify-center">
              <QrCodeRenderer value={qrData} size={110} label="HMAC SEAL" />
            </div>
          </div>

          {/* Sentry Signature Lines */}
          <div className="border-t border-gray-400 pt-3 mt-2 grid grid-cols-2 gap-4 text-[9px] text-gray-700 font-mono">
            <div>
              <div className="h-6 border-b border-dashed border-gray-400"></div>
              <div className="mt-1">SENTRY DUTY SIGNATURE</div>
            </div>
            <div>
              <div className="h-6 border-b border-dashed border-gray-400"></div>
              <div className="mt-1">DRIVER ACKNOWLEDGEMENT</div>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-panel-2 border border-line text-text-dim hover:text-text font-mono text-xs uppercase"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sentry Chit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
