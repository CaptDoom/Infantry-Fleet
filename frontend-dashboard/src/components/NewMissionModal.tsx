import React, { useState } from 'react';
import { X, Send, MapPin, Calendar, Clock, AlertTriangle, Upload, FileCheck, CheckCircle2 } from 'lucide-react';

interface NewMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    unit: string;
    dest: string;
    purpose: string;
    dist: number;
    eta: string;
    vehicleId: string;
    driverId: string;
  }) => void;
  vehicles: Array<{ id: string; reg: string; type: string; status: string }>;
  drivers: Array<{ id: string; name: string; unit: string }>;
}

export const NewMissionModal: React.FC<NewMissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vehicles,
  drivers,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [unit, setUnit] = useState('Alpha Company, 4 RAJPUT');
  const [dest, setDest] = useState('LZ-ECHO 44.9N 12.3E (FOB Delta)');
  const [purpose, setPurpose] = useState('Troop Transport & Supply');
  const [dist, setDist] = useState(145);
  const [eta, setEta] = useState('');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [notes, setNotes] = useState('Route ALPHA primary. Recommend canyon pass backup.');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>('manifest_grid_delta.kml');
  const [uploadProgress, setUploadProgress] = useState(100);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !dest || !purpose || !dist || !vehicleId || !driverId) return;
    onSubmit({
      unit,
      dest,
      purpose,
      dist,
      eta: eta || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      vehicleId,
      driverId,
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setUploadProgress(30);
      setTimeout(() => setUploadProgress(75), 200);
      setTimeout(() => setUploadProgress(100), 400);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in text-text">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-panel-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-mono font-bold text-xs">
              M-1
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-text">
                SORTIE REQUISITION // STAGE 1 DISPATCH
              </h2>
              <div className="text-[10px] font-mono text-text-faint">
                REQUISITION ID: REQ-{Math.floor(1000 + Math.random() * 9000)}-ALX
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-panel-3 text-text-dim hover:text-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 border-b border-line bg-panel-3 font-mono text-[11px]">
          <button
            onClick={() => setStep(1)}
            className={`py-2 px-4 text-center border-r border-line font-bold flex items-center justify-center gap-2 ${
              step === 1 ? 'text-gold bg-panel border-b-2 border-b-gold' : 'text-text-faint'
            }`}
          >
            <span>1. MISSION PARAMETERS</span>
          </button>
          <button
            onClick={() => setStep(2)}
            className={`py-2 px-4 text-center font-bold flex items-center justify-center gap-2 ${
              step === 2 ? 'text-gold bg-panel border-b-2 border-b-gold' : 'text-text-faint'
            }`}
          >
            <span>2. ASSET BINDING & MANIFEST</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {step === 1 ? (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                    Requesting Unit
                  </label>
                  <input
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. 4 Rajput, Alpha Coy"
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                    Destination Coordinates / Facility
                  </label>
                  <input
                    required
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder="e.g. LZ-ECHO 44.9N 12.3E"
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                    Primary Purpose / Task
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
                  >
                    <option value="Troop Transport & Supply">Troop Transport</option>
                    <option value="Ammunition Resupply">Ammunition Resupply</option>
                    <option value="Medevac Standby">Medevac Standby</option>
                    <option value="Reconnaissance Patrol">Reconnaissance Patrol</option>
                    <option value="Convoy Escort">Convoy Escort</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                    Planned Distance (KM)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={dist}
                    onChange={(e) => setDist(Number(e.target.value))}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Tactical Notes & Route Hazards
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter specific route warnings, threat conditions, or staging protocols..."
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-sans text-text outline-none focus:border-gold"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 rounded bg-gold hover:bg-gold-bright text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Proceed to Asset Binding →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                    Assigned Fleet Asset
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg} — {v.type} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                    Assigned Driver / Service Number
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-xs font-mono text-text outline-none focus:border-gold"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Waypoint / Manifest Dropzone */}
              <div>
                <label className="block font-mono text-[10px] text-text-faint uppercase tracking-wider mb-1.5">
                  Attach Waypoints / Cargo Manifest (Optional KML / CSV)
                </label>
                <label className="border-2 border-dashed border-line hover:border-gold/50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-bg transition-colors">
                  <Upload className="w-5 h-5 text-text-dim" />
                  <span className="text-xs text-text-dim">
                    Drop tactical route overlay or cargo manifest here, or{' '}
                    <span className="text-gold font-bold">browse</span>
                  </span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".kml,.csv,.json"
                  />
                </label>

                {uploadedFileName && (
                  <div className="mt-2 p-2.5 rounded bg-panel-2 border border-line flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-olive">
                      <FileCheck className="w-4 h-4" />
                      <span>{uploadedFileName}</span>
                    </div>
                    <span className="text-[10px] text-text-dim">{uploadProgress}% ATTACHED</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded bg-amber/10 border border-amber/30 text-amber text-[11px] font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Submitting will lock the asset binding and forward this requisition to MTO for cryptographic token generation.
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded bg-panel-2 border border-line text-text-dim hover:text-text font-mono text-xs uppercase"
                >
                  ← Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded bg-panel-2 border border-line text-text-dim hover:text-text font-mono text-xs uppercase"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 rounded bg-gold hover:bg-gold-bright text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Requisition</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
