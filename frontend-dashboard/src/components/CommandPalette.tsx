import React, { useState, useEffect } from 'react';
import { Search, Truck, FileText, User, Shield, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { DashboardView } from './Sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: DashboardView) => void;
  onNewMission: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onNewMission,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    {
      id: 'dash',
      title: 'Fleet Readiness Overview',
      category: 'Navigation',
      icon: <Truck className="w-4 h-4 text-cyan" />,
      action: () => { onNavigate('dashboard'); onClose(); },
    },
    {
      id: 'reqs',
      title: 'Sortie Requisitions & Approvals',
      category: 'Operations',
      icon: <FileText className="w-4 h-4 text-amber" />,
      action: () => { onNavigate('requisitions'); onClose(); },
    },
    {
      id: 'new-mission',
      title: 'Create New Mission Requisition',
      category: 'Action',
      icon: <ArrowRight className="w-4 h-4 text-gold" />,
      action: () => { onNewMission(); onClose(); },
    },
    {
      id: 'mto',
      title: 'Pending Approvals & Mission Binding',
      category: 'MTO Control',
      icon: <FileText className="w-4 h-4 text-steel" />,
      action: () => { onNavigate('mto-queue'); onClose(); },
    },
    {
      id: 'reconciliation',
      title: 'Reconciliation & Deviations (>10%)',
      category: 'MTO Control',
      icon: <AlertTriangle className="w-4 h-4 text-red" />,
      action: () => { onNavigate('flagged'); onClose(); },
    },
    {
      id: 'gate',
      title: 'Sentry Gate Access Kiosk',
      category: 'Security',
      icon: <Shield className="w-4 h-4 text-olive" />,
      action: () => { onNavigate('kiosk'); onClose(); },
    },
    {
      id: 'audit',
      title: 'Immutable Audit Log & Hash-Chain',
      category: 'Records',
      icon: <Shield className="w-4 h-4 text-emerald" />,
      action: () => { onNavigate('audit'); onClose(); },
    },
    {
      id: 'v1024',
      title: 'Vehicle V-1024 (Logistics Heavy, EN ROUTE)',
      category: 'Fleet Asset',
      icon: <Truck className="w-4 h-4 text-cyan" />,
      action: () => { onNavigate('dashboard'); onClose(); },
    },
    {
      id: 'd1',
      title: 'Driver Nb Sub Rakesh Yadav (Alpha Coy)',
      category: 'Personnel',
      icon: <User className="w-4 h-4 text-text-dim" />,
      action: () => { onNavigate('requisitions'); onClose(); },
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4">
      <div className="bg-panel border border-line rounded-lg max-w-xl w-full shadow-2xl overflow-hidden animate-fade-in text-text">
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line bg-panel-2">
          <Search className="w-5 h-5 text-text-dim" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, assets, missions, drivers (Cmd+K)..."
            className="flex-1 bg-transparent text-sm font-sans text-text placeholder:text-text-faint outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-panel-3 text-text-dim hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-text-faint">
              No matching commands or assets found.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center justify-between p-2.5 rounded hover:bg-panel-2 text-left group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-bg border border-line text-text-dim group-hover:text-text group-hover:border-olive-dim">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-text group-hover:text-gold transition-colors">
                      {item.title}
                    </div>
                    <div className="font-mono text-[10px] text-text-faint uppercase">
                      {item.category}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-text-faint group-hover:text-gold opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-panel-3 border-t border-line flex items-center justify-between font-mono text-[10px] text-text-faint">
          <div className="flex items-center gap-3">
            <span>[ESC] to close</span>
            <span>[↑↓] to navigate</span>
            <span>[ENTER] to select</span>
          </div>
          <span className="text-olive">M-FTAMS SECURE COMMAND PALETTE</span>
        </div>
      </div>
    </div>
  );
};
