import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Scan,
  Truck,
  ShieldCheck,
  Users,
  AlertTriangle,
  CheckSquare,
  Plus,
  Settings,
  HelpCircle,
  WifiOff,
  LogOut,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';
import { UserRole } from '../services/api';

export type DashboardView =
  | 'dashboard'
  | 'requisitions'
  | 'mto-queue'
  | 'reconciliation'
  | 'flagged'
  | 'fleet'
  | 'drivers'
  | 'kiosk'
  | 'alerts'
  | 'audit';

interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  currentRole: UserRole;
  pendingCount: number;
  flaggedCount: number;
  alertsCount: number;
  onNewMission: () => void;
  onOpenUsers: () => void;
  isOfflineMode?: boolean;
  onToggleOffline?: () => void;
  onEmergencyLockout: () => void;
}


export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  currentRole,
  pendingCount,
  flaggedCount,
  alertsCount,
  onNewMission,
  onOpenUsers,
  isOfflineMode,
  onToggleOffline,
  onEmergencyLockout,
}) => {
  const [selectedUnit, setSelectedUnit] = useState('1st Logistics (ALPHA-01)');
  const [showUnitSwitcher, setShowUnitSwitcher] = useState(false);
  const isMTO = currentRole === 'MTO' || currentRole === 'ADMIN';

  return (
    <aside className="w-60 bg-panel border-r border-line flex flex-col justify-between flex-shrink-0 z-30 select-none">
      <div className="p-3.5 space-y-4">
        {/* Workspace / Unit Switcher (Stitch Header) */}
        <div className="relative">
          <div
            onClick={() => setShowUnitSwitcher(!showUnitSwitcher)}
            className="flex items-center gap-3 p-2 rounded-lg bg-panel-2 border border-line hover:border-gold/50 cursor-pointer transition-all"
          >
            <div className="w-8 h-8 rounded bg-gold/10 border border-gold/30 flex items-center justify-center font-mono font-bold text-gold text-xs flex-shrink-0">
              HQ
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-bold text-text truncate">
                {selectedUnit.split(' ')[0]} {selectedUnit.split(' ')[1]}
              </div>
              <div className="font-mono text-[9px] text-olive tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse"></span>
                <span>STATUS: READY</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-dim" />
          </div>

          {/* Unit Switcher Dropdown */}
          {showUnitSwitcher && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-panel-2 border border-line rounded-lg shadow-xl z-50 p-1.5 space-y-1 font-mono text-xs animate-fade-in">
              {['1st Logistics (ALPHA-01)', '4 Rajput (BRAVO-02)', 'Command Center (HQ-CORPS)'].map((unit) => (
                <button
                  key={unit}
                  onClick={() => {
                    setSelectedUnit(unit);
                    setShowUnitSwitcher(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-colors ${
                    selectedUnit === unit ? 'bg-gold/20 text-gold font-bold' : 'text-text-dim hover:bg-panel-3 hover:text-text'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button: + New Mission */}
        <button
          onClick={onNewMission}
          className="w-full py-2.5 px-3 rounded-lg bg-panel-2 hover:bg-gold hover:text-bg border border-line hover:border-gold text-text font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md group"
        >
          <Plus className="w-4 h-4 text-gold group-hover:text-bg transition-colors" />
          <span>+ New Mission</span>
        </button>

        {/* Navigation Items matching Stitch Designs */}
        <nav className="space-y-1">
          <NavItem
            icon={<Truck className="w-4 h-4" />}
            label="Fleet Management"
            active={currentView === 'dashboard' || currentView === 'fleet'}
            onClick={() => onViewChange('dashboard')}
          />

          <NavItem
            icon={<FileText className="w-4 h-4" />}
            label="Sortie Operations"
            active={currentView === 'requisitions'}
            onClick={() => onViewChange('requisitions')}
            badge={isMTO ? pendingCount : undefined}
            badgeColor="amber"
          />

          {isMTO && (
            <NavItem
              icon={<CheckSquare className="w-4 h-4" />}
              label="Pending Approvals"
              active={currentView === 'mto-queue'}
              onClick={() => onViewChange('mto-queue')}
              badge={pendingCount}
              badgeColor="amber"
            />
          )}

          {isMTO && (
            <NavItem
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Sortie Reconciliation"
              active={currentView === 'flagged'}
              onClick={() => onViewChange('flagged')}
              badge={flaggedCount}
              badgeColor="red"
            />
          )}

          <NavItem
            icon={<Scan className="w-4 h-4" />}
            label="Gate Access Kiosk"
            active={currentView === 'kiosk'}
            onClick={() => onViewChange('kiosk')}
          />

          <NavItem
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Alerts & Critical"
            active={currentView === 'alerts'}
            onClick={() => onViewChange('dashboard')}
            badge={alertsCount > 0 ? alertsCount : 3}
            badgeColor="red"
          />

          <NavItem
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Audit Logs"
            active={currentView === 'audit'}
            onClick={() => onViewChange('audit')}
          />

          <NavItem
            icon={<Users className="w-4 h-4" />}
            label="Personnel & RBAC"
            active={false}
            onClick={onOpenUsers}
          />
        </nav>
      </div>

      {/* Footer Controls & Emergency Lockout */}
      <div className="p-3.5 space-y-3 border-t border-line bg-panel-2">
        {/* Emergency Lockout Button */}
        <button
          onClick={onEmergencyLockout}
          className="w-full py-2 px-3 rounded border border-red/40 bg-red/10 hover:bg-red hover:text-white text-red font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Emergency Lockout</span>
        </button>

        {/* Offline Mode Toggle */}
        <button
          onClick={onToggleOffline}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded font-mono text-[10px] uppercase transition-all ${
            isOfflineMode
              ? 'bg-amber/20 border border-amber/40 text-amber font-bold'
              : 'text-text-dim hover:text-text hover:bg-panel'
          }`}
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline Mode</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber animate-pulse' : 'bg-line'}`} />
        </button>

        {/* Support & Settings Links */}
        <div className="flex items-center justify-between text-text-faint text-[11px] font-mono px-1">
          <button
            onClick={() => onViewChange('dashboard')}
            className="flex items-center gap-1.5 hover:text-text transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => onViewChange('dashboard')}
            className="flex items-center gap-1.5 hover:text-text transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support</span>
          </button>
        </div>

        {/* Pinned User Profile Preview */}
        <div className="pt-2 border-t border-line/60 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-panel-3 border border-line flex items-center justify-center text-[10px] font-mono font-bold text-gold">
              {currentRole.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-text truncate">Col. R. Sharma</div>
              <div className="text-[9px] font-mono text-gold truncate uppercase">{currentRole} ROLE</div>
            </div>
          </div>
          <button
            title="Log Out"
            className="p-1 rounded hover:bg-panel-3 text-text-dim hover:text-red transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

// ── Nav Item ──────────────────────────────────────────────────────
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  badgeColor?: 'amber' | 'red' | 'olive';
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active,
  onClick,
  badge,
  badgeColor = 'olive',
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-sans transition-all ${
      active
        ? 'bg-gold text-bg font-bold shadow-md'
        : 'text-text-dim hover:bg-panel-2 hover:text-text'
    }`}
  >
    <div className="flex items-center gap-2.5">
      <span className={active ? 'text-bg' : 'text-text-dim'}>{icon}</span>
      <span>{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span
        className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
          active
            ? 'bg-bg text-gold'
            : badgeColor === 'amber'
            ? 'bg-amber text-bg'
            : badgeColor === 'red'
            ? 'bg-red text-white'
            : 'bg-olive text-bg'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);

