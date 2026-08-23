import React, { useState } from 'react';
import { Users, UserPlus, Shield, CheckCircle2, X, Mail, Lock } from 'lucide-react';
import { UserRole } from '../services/api';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  unit: string;
  role: UserRole;
  status: 'ACTIVE' | 'INVITED';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentRole,
}) => {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'u1',
      name: 'Col. Rajesh Sharma',
      email: 'hq.commander@m-ftams.mil',
      unit: 'HQ 4 Corps',
      role: 'COMMANDER',
      status: 'ACTIVE',
    },
    {
      id: 'u2',
      name: 'Maj. Vikramaditya Singh',
      email: 'mto.station@m-ftams.mil',
      unit: '1st Logistics Bn',
      role: 'MTO',
      status: 'ACTIVE',
    },
    {
      id: 'u3',
      name: 'Subedar M. Joshi',
      email: 'sentry.gate4@m-ftams.mil',
      unit: 'Gate-04 Sentry Unit',
      role: 'SENTRY',
      status: 'ACTIVE',
    },
    {
      id: 'u4',
      name: 'Capt. Ananya Iyer',
      email: 'sysadmin@m-ftams.mil',
      unit: 'Signals Cyber Division',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  ]);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('4 Rajput, Alpha Coy');
  const [newRole, setNewRole] = useState<UserRole>('MTO');

  if (!isOpen) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    const newMember: TeamMember = {
      id: `u-${Date.now()}`,
      name: newName,
      email: newEmail,
      unit: newUnit,
      role: newRole,
      status: 'INVITED',
    };
    setMembers((prev) => [newMember, ...prev]);
    setNewEmail('');
    setNewName('');
    setShowInviteForm(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'COMMANDER':
        return 'bg-gold/15 text-gold border-gold/30';
      case 'MTO':
        return 'bg-steel/15 text-steel border-steel/30';
      case 'SENTRY':
        return 'bg-olive/15 text-olive border-olive/30';
      case 'ADMIN':
        return 'bg-red/15 text-red border-red/30';
      default:
        return 'bg-panel-3 text-text-dim border-line';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in text-text">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-panel-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-steel/10 border border-steel/30 flex items-center justify-center text-steel font-mono font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-text">
                RBAC Access Control &amp; Personnel Matrix (§3.3)
              </h2>
              <div className="text-[10px] font-mono text-text-faint">
                ORGANIZATION: NORTHERN COMMAND // AIR-GAPPED TRUST STORE
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

        <div className="p-6 space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-text-dim">
              ACTIVE STATION PERSONNEL ({members.length})
            </div>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-steel/15 border border-steel/30 hover:bg-steel/25 text-steel font-mono text-xs font-bold uppercase transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Member</span>
            </button>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <form
              onSubmit={handleInvite}
              className="p-4 rounded-lg bg-panel-2 border border-line space-y-3 animate-fade-in"
            >
              <div className="font-mono text-xs font-bold text-steel flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>INVITE OPERATIONAL PERSONNEL</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Officer / Personnel Name"
                  className="bg-bg border border-line rounded px-3 py-1.5 text-xs font-sans text-text outline-none focus:border-steel"
                />
                <input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Internal Service Email"
                  className="bg-bg border border-line rounded px-3 py-1.5 text-xs font-sans text-text outline-none focus:border-steel"
                />
                <input
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Battalion / Sentry Gate Post"
                  className="bg-bg border border-line rounded px-3 py-1.5 text-xs font-sans text-text outline-none focus:border-steel"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="bg-bg border border-line rounded px-3 py-1.5 text-xs font-mono text-text outline-none focus:border-steel"
                >
                  <option value="COMMANDER">Commander (Read-Only Global)</option>
                  <option value="MTO">MTO (Approval & Token Authority)</option>
                  <option value="SENTRY">Sentry (Gate Access Terminal)</option>
                  <option value="ADMIN">System Admin (Full System)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-3 py-1 rounded bg-panel-3 text-text-dim text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded bg-steel hover:bg-cyan text-bg font-mono font-bold text-xs uppercase transition-all"
                >
                  Send Station Invite
                </button>
              </div>
            </form>
          )}

          {/* Members Table */}
          <div className="overflow-x-auto border border-line rounded-lg bg-bg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-panel-2 font-mono text-[10px] text-text-faint uppercase">
                  <th className="py-2.5 px-3">Personnel</th>
                  <th className="py-2.5 px-3">Unit / Station</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft font-sans">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-panel-2 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-text">{m.name}</div>
                      <div className="font-mono text-[10px] text-text-dim">{m.email}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-dim text-[11px]">{m.unit}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${getRoleBadge(
                          m.role
                        )}`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px]">
                      {m.status === 'ACTIVE' ? (
                        <span className="text-olive flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-amber flex items-center gap-1">
                          ⏳ Invited
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-3 bg-panel-2 border-t border-line flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-panel-3 border border-line hover:border-steel text-text-dim hover:text-text font-mono text-xs uppercase"
          >
            Close Personnel Panel
          </button>
        </div>
      </div>
    </div>
  );
};
