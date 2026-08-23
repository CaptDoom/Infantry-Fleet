import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, ShieldAlert, Lock, Unlock, RefreshCw, Cpu } from 'lucide-react';
import { kioskApi } from '../services/api';

interface BarrierAnimationProps {
  isRaised: boolean;
  direction: 'OUTBOUND' | 'INBOUND';
  vehicleReg: string;
  onDone: () => void;
}

export const BarrierAnimation: React.FC<BarrierAnimationProps> = ({
  isRaised,
  direction,
  vehicleReg,
  onDone
}) => {
  const [barrierState, setBarrierState] = useState<'RAISED' | 'LOWERED' | 'HOLD_OPEN' | 'EMERGENCY_STOP'>(
    isRaised ? 'RAISED' : 'LOWERED'
  );
  const [controlMessage, setControlMessage] = useState<string | null>(null);

  const handleCommand = async (action: 'RAISE' | 'LOWER' | 'HOLD_OPEN' | 'EMERGENCY_STOP' | 'RESET') => {
    try {
      const res = await kioskApi.controlBarrier(action);
      if (action === 'HOLD_OPEN') setBarrierState('HOLD_OPEN');
      else if (action === 'EMERGENCY_STOP') setBarrierState('EMERGENCY_STOP');
      else if (action === 'LOWER') setBarrierState('LOWERED');
      else if (action === 'RAISE') setBarrierState('RAISED');
      else setBarrierState('LOWERED');

      setControlMessage(res.message);
      setTimeout(() => setControlMessage(null), 3000);
    } catch (err: any) {
      setControlMessage(err.message);
    }
  };

  const isArmUp = barrierState === 'RAISED' || barrierState === 'HOLD_OPEN';

  return (
    <div className="bg-panel border border-olive/30 rounded-lg p-6 flex flex-col items-center justify-center text-center animate-fade-in my-4">
      {/* Light & Protocol Indicator */}
      <div className="flex items-center gap-3 mb-5 bg-panel-2 px-4 py-1.5 rounded-full border border-line">
        <div className={`w-3.5 h-3.5 rounded-full ${
          barrierState === 'EMERGENCY_STOP'
            ? 'bg-red animate-ping'
            : isArmUp
              ? 'bg-olive shadow-[0_0_12px_#8a9a5b]'
              : 'bg-red shadow-[0_0_12px_#c1440e]'
        }`} />
        <span className="font-mono text-xs tracking-wider uppercase text-text font-bold">
          {barrierState === 'EMERGENCY_STOP'
            ? 'EMERGENCY STOP ENGAGED'
            : barrierState === 'HOLD_OPEN'
              ? 'BARRIER LOCKED OPEN (CONVOY MODE)'
              : isArmUp
                ? 'CLEARANCE GRANTED // BARRIER RAISED'
                : 'BARRIER LOWERED // INTERLOCK LOCKED'}
        </span>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-bg text-steel border border-line">
          MODBUS-RTU / GPIO RELAY
        </span>
      </div>

      {/* Boom Barrier Graphic */}
      <div className="relative w-64 h-36 flex items-end justify-center mb-5">
        {/* Barrier Post */}
        <div className="w-8 h-24 bg-line-soft border border-line rounded-t flex flex-col items-center justify-start p-1 z-10">
          <div className="w-3 h-3 rounded-full bg-olive-dim mb-2" />
          <div className="w-full h-1 bg-amber mb-1" />
          <div className="w-full h-1 bg-bg mb-1" />
        </div>

        {/* Boom Arm */}
        <div
          className={`absolute left-32 bottom-20 w-48 h-3.5 bg-gradient-to-r from-red via-text to-red border border-bg rounded-r origin-left transition-transform duration-700 ease-out shadow-lg ${
            isArmUp ? '-rotate-75' : 'rotate-0'
          }`}
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #c1440e, #c1440e 10px, #e8e6de 10px, #e8e6de 20px)'
          }}
        />

        {/* Road surface */}
        <div className="absolute bottom-0 w-full h-2 bg-line border-t border-line-soft" />
      </div>

      {/* Confirmation text */}
      <div className="flex items-center gap-2 text-olive font-mono font-bold text-base mb-1">
        <CheckCircle2 className="w-5 h-5 text-olive" />
        <span>{direction} HANDSHAKE COMPLETED</span>
      </div>

      <p className="text-text-dim text-xs max-w-md font-sans mb-4">
        Vehicle <span className="font-mono font-bold text-text">{vehicleReg}</span> authorized for {direction.toLowerCase()} movement. Safety loop active.
      </p>

      {/* Sentry Hardware Manual Control Bar */}
      <div className="w-full max-w-md bg-panel-2 border border-line rounded p-2.5 mb-5">
        <div className="text-[10px] font-mono text-text-faint uppercase tracking-wider mb-2 text-left">
          Hardware Actuator Control (Sentry Overrides):
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleCommand('HOLD_OPEN')}
            className="flex-1 py-1.5 px-2 rounded bg-panel border border-line hover:border-amber hover:text-amber text-text-dim font-mono text-[11px] uppercase flex items-center justify-center gap-1 transition-all"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Hold Open</span>
          </button>
          <button
            onClick={() => handleCommand('LOWER')}
            className="flex-1 py-1.5 px-2 rounded bg-panel border border-line hover:border-text text-text-dim font-mono text-[11px] uppercase flex items-center justify-center gap-1 transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Force Lower</span>
          </button>
          <button
            onClick={() => handleCommand('EMERGENCY_STOP')}
            className="flex-1 py-1.5 px-2 rounded bg-red/20 border border-red hover:bg-red text-red hover:text-white font-mono text-[11px] uppercase flex items-center justify-center gap-1 transition-all font-bold"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>E-STOP</span>
          </button>
        </div>
        {controlMessage && (
          <div className="mt-2 font-mono text-[10px] text-amber text-left">
            &gt; {controlMessage}
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        className="px-6 py-2.5 rounded bg-olive hover:bg-[#9dae6c] text-bg font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
      >
        <span>Complete & Return to Ready</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

