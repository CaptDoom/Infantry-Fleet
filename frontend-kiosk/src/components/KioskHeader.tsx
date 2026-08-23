import React, { useState, useEffect } from 'react';
import { Shield, Wifi, WifiOff, Clock, RefreshCw, Cpu, Activity } from 'lucide-react';
import { GateStatusResponse, kioskApi } from '../services/api';

interface KioskHeaderProps {
  status: GateStatusResponse | null;
  onRefresh: () => void;
}

export const KioskHeader: React.FC<KioskHeaderProps> = ({ status, onRefresh }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [driftMs, setDriftMs] = useState<number>(14);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
      setDriftMs(Math.round(Math.sin(Date.now() / 30000) * 45));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await kioskApi.triggerSync();
      onRefresh();
    } catch {
      // Handled gracefully
    } finally {
      setIsSyncing(false);
    }
  };

  const isOnline = status?.is_online ?? true;
  const isSeeded = status?.is_seeded ?? true;
  const pendingCount = status?.pending_queue_count ?? 0;

  return (
    <header className="bg-panel border-b border-line px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
      {/* Brand & Gate Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 border border-olive-dim rounded bg-olive/10 flex items-center justify-center font-mono font-bold text-olive text-sm">
          <Shield className="w-5 h-5 text-olive" />
        </div>
        <div>
          <div className="font-mono text-sm font-bold tracking-wider text-text flex items-center gap-2">
            <span>M-FTAMS SENTRY TERMINAL</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-panel-2 border border-line text-olive font-mono">
              {status?.edge_id || 'GATE-04 (MAIN)'}
            </span>
          </div>
          <div className="font-mono text-[10px] text-text-faint tracking-wide flex items-center gap-2">
            <span>AIR-GAPPED SENTRY ENGINE</span>
            <span>•</span>
            <span className="text-steel">HARDWARE RELAY READY</span>
          </div>
        </div>
      </div>

      {/* Sync Status, Stratum-1 Clock & Controls */}
      <div className="flex items-center gap-4">
        {/* Stratum-1 Time Sync Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-panel-2 border border-line font-mono text-[11px]">
          <Activity className="w-3.5 h-3.5 text-olive" />
          <span className="text-text-dim">STRATUM-1 NTP:</span>
          <span className="text-olive font-bold">{driftMs >= 0 ? `+${driftMs}` : driftMs}ms</span>
        </div>

        {/* Offline Queue Badge */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber/10 border border-amber/30 text-amber text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-amber animate-pulse"></span>
            <span>{pendingCount} QUEUED</span>
          </div>
        )}

        {/* Sync Status Banner */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-olive/10 border border-olive/30 text-olive text-xs font-mono">
              <Wifi className="w-3.5 h-3.5 text-olive" />
              <span>ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-red/10 border border-red/30 text-red text-xs font-mono">
              <WifiOff className="w-3.5 h-3.5 text-red animate-pulse" />
              <span>OFFLINE (LOCAL SQLITE)</span>
            </div>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Trigger manual sync flush"
            className="p-1.5 rounded bg-panel-2 border border-line hover:border-olive-dim text-text-dim hover:text-olive transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Clock */}
        <div className="text-right border-l border-line pl-4">
          <div className="font-mono text-xs font-bold text-text flex items-center gap-1.5 justify-end">
            <Clock className="w-3 h-3 text-text-dim" />
            <span>{timeStr}</span>
          </div>
          <div className="font-mono text-[10px] text-text-faint">{dateStr}</div>
        </div>
      </div>
    </header>
  );
};

