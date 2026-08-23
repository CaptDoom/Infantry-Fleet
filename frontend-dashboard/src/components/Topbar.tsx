import React, { useState, useEffect } from 'react';
import { Clock, Bell, Shield, Activity, CheckCircle2, AlertTriangle, X, Search, RefreshCw, Moon, Sun, ChevronDown, User, Radio } from 'lucide-react';
import { UserRole, api, AlertItem } from '../services/api';
import { SecurityStatusModal } from './SecurityStatusModal';
import { DashboardView } from './Sidebar';

interface TopbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onOpenSearch: () => void;
  onRefresh?: () => void;
  isOfflineMode?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentRole,
  onRoleChange,
  currentView,
  onViewChange,
  onOpenSearch,
  onRefresh = () => {},
  isOfflineMode = false,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [driftMs, setDriftMs] = useState(18);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showAlertTray, setShowAlertTray] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Personnel' | 'Logistics' | 'Support'>('Dashboard');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTimeStr(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
          2,
          '0'
        )}:${String(d.getSeconds()).padStart(2, '0')}Z`
      );
      setDateStr(
        d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
      setDriftMs(Math.round(Math.sin(Date.now() / 40000) * 35));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchAlerts();
    const unsubscribe = api.connectAlertStream((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.alert_id !== newAlert.alert_id)]);
    });
    const interval = setInterval(fetchAlerts, 15000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.alert_id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a
        )
      );
    } catch {
      // Handled
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    fetchAlerts();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTabClick = (tab: 'Dashboard' | 'Personnel' | 'Logistics' | 'Support') => {
    setActiveTab(tab);
    if (tab === 'Dashboard') onViewChange('dashboard');
    else if (tab === 'Personnel') onViewChange('mto-queue');
    else if (tab === 'Logistics') onViewChange('requisitions');
    else if (tab === 'Support') onViewChange('audit');
  };

  const unackCount = alerts.filter((a) => !a.acknowledged_at).length;

  return (
    <>
      <header className="bg-gradient-to-b from-panel to-bg border-b border-line px-5 py-2.5 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left Brand & Top Navigation Tabs (Stitch Style) */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="font-mono text-base font-extrabold tracking-wider text-text flex items-center gap-1.5">
              <span className="text-gold">M-</span>
              <span>FTAMS</span>
            </div>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-panel-3 border border-line text-gold font-mono uppercase font-semibold">
              COMMAND
            </span>
          </div>

          {/* Top Tabs */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            {(['Dashboard', 'Personnel', 'Logistics', 'Support'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`px-3.5 py-1.5 rounded transition-all font-medium ${
                  activeTab === tab
                    ? 'text-text font-bold border-b-2 border-gold bg-panel-2'
                    : 'text-text-dim hover:text-text hover:bg-panel-2/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Global Quick Search Bar */}
        <button
          onClick={onOpenSearch}
          className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-panel-2 border border-line hover:border-gold/50 text-text-dim hover:text-text font-sans text-xs w-64 transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-text-faint" />
          <span className="flex-1 text-left text-text-faint">Global Search...</span>
          <kbd className="font-mono text-[10px] bg-bg px-1.5 py-0.5 rounded border border-line text-text-faint">
            ⌘K
          </kbd>
        </button>

        {/* Right Status Indicators & Action Center */}
        <div className="flex items-center gap-3.5">
          {/* Sync / Offline Status Badge (Stitch Style) */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-panel-2 border border-line font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-olive animate-pulse"></span>
            <span className="text-olive font-bold">
              {isOfflineMode ? 'OFFLINE CEILING' : 'SYNC: ACTIVE'}
            </span>
          </div>

          {/* 42H Remain Battery / Offline Ceiling Progress Bar (Stitch Style) */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-panel-2 border border-line font-mono text-[11px]">
            <div className="w-16 h-1.5 rounded-full bg-panel-3 overflow-hidden">
              <div className="w-[85%] h-full bg-emerald rounded-full"></div>
            </div>
            <span className="text-emerald font-bold text-[10px]">42H REMAIN</span>
          </div>

          {/* Stratum-1 Time Sync Badge */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-panel-2 border border-line font-mono text-[11px]">
            <Activity className="w-3.5 h-3.5 text-olive" />
            <span className="text-text-dim">NTP:</span>
            <span className="text-olive font-bold">{driftMs >= 0 ? `+${driftMs}` : driftMs}ms</span>
          </div>

          {/* Security Brief Modal Trigger */}
          <button
            onClick={() => setShowSecurityModal(true)}
            className="p-2 rounded bg-panel-2 border border-line hover:border-gold text-text-dim hover:text-gold transition-all"
            title="Air-Gapped PKI, mTLS & Key Trust Store"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 rounded bg-panel-2 border border-line hover:border-gold text-text-dim hover:text-gold transition-all"
            title="Refresh Fleet Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-gold' : ''}`} />
          </button>

          {/* Real-Time Alert Center Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlertTray(!showAlertTray)}
              className="relative p-2 rounded bg-panel-2 border border-line hover:border-amber text-text-dim hover:text-amber transition-all"
              title="System & Security Alerts"
            >
              <Bell className="w-4 h-4" />
              {unackCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unackCount}
                </span>
              )}
            </button>

            {/* Alert Drawer Dropdown */}
            {showAlertTray && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-panel border border-line rounded-lg shadow-2xl z-50 p-4 animate-fade-in font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-line mb-3">
                  <div className="flex items-center gap-2 text-amber font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>CRITICAL ALERTS ({unackCount} UNACKNOWLEDGED)</span>
                  </div>
                  <button
                    onClick={() => setShowAlertTray(false)}
                    className="p-1 rounded hover:bg-panel-2 text-text-dim"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5">
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-text-faint">No active critical alerts.</div>
                  ) : (
                    alerts.slice(0, 8).map((alert) => (
                      <div
                        key={alert.alert_id}
                        className={`p-2.5 rounded border ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red/10 border-red/30 text-red'
                            : alert.severity === 'WARNING'
                            ? 'bg-amber/10 border-amber/30 text-amber'
                            : 'bg-panel-2 border-line text-text'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[10px] mb-1">
                          <span>{alert.alert_type}</span>
                          <span>{new Date(alert.raised_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-[11px] text-text mb-2 font-sans">{alert.message}</div>
                        {!alert.acknowledged_at ? (
                          <button
                            onClick={() => handleAcknowledge(alert.alert_id)}
                            className="px-2.5 py-1 rounded bg-panel border border-line hover:border-gold text-gold font-mono text-[10px] uppercase font-bold"
                          >
                            Acknowledge Alert
                          </button>
                        ) : (
                          <span className="text-[10px] text-text-faint flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-olive" />
                            Acknowledged
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Commander Mode Dropdown (Stitch Style) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel-2 hover:bg-panel-3 border border-line hover:border-gold text-text font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              <span>{currentRole} MODE</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-dim" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 bg-panel-2 border border-line rounded-lg shadow-xl z-50 p-1 space-y-1 font-mono text-xs animate-fade-in">
                {(['COMMANDER', 'MTO', 'SENTRY', 'ADMIN'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onRoleChange(r);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-[11px] transition-colors ${
                      currentRole === r ? 'bg-gold/20 text-gold font-bold' : 'text-text-dim hover:bg-panel-3 hover:text-text'
                    }`}
                  >
                    {r === 'COMMANDER' ? 'Commander Mode' : r === 'MTO' ? 'MTO Officer Mode' : r === 'SENTRY' ? 'Gate Sentry Mode' : 'System Admin'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-panel-3 border border-line flex items-center justify-center text-text-dim font-mono text-xs font-bold">
            <User className="w-4 h-4 text-text-dim" />
          </div>

          {/* Clock */}
          <div className="hidden sm:block text-right font-mono border-l border-line pl-3">
            <div className="text-xs text-text tracking-wide font-bold">{timeStr}</div>
            <div className="text-[9px] text-text-faint">{dateStr}</div>
          </div>
        </div>
      </header>

      {/* Security Status Brief Modal */}
      <SecurityStatusModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />
    </>
  );
};


