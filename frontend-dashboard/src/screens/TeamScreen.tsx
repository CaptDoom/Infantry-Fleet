import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  MoreHorizontal,
  Mail,
  Check,
  X,
  Settings,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Types ─────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member' | 'Viewer';
  status: 'active' | 'pending' | 'inactive';
  avatar: string;
  lastActive: string;
}

type Permission = 'read' | 'write' | 'delete' | 'manage';
type ResourceModule = 'Dashboard' | 'Analytics' | 'Transactions' | 'Team' | 'Settings' | 'Billing';

// ── Mock Data ─────────────────────────────────────────────────────
const mockMembers: TeamMember[] = [
  { id: '1', name: 'Maj. Vikramaditya', email: 'admin@m-ftams.mil', role: 'Owner', status: 'active', avatar: 'VK', lastActive: 'Just now' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.c@m-ftams.mil', role: 'Admin', status: 'active', avatar: 'SC', lastActive: '5m ago' },
  { id: '3', name: 'Marcus Johnson', email: 'marcus.j@m-ftams.mil', role: 'Member', status: 'active', avatar: 'MJ', lastActive: '1h ago' },
  { id: '4', name: 'Emily Rodriguez', email: 'emily.r@m-ftams.mil', role: 'Member', status: 'active', avatar: 'ER', lastActive: '3h ago' },
  { id: '5', name: 'David Kim', email: 'david.k@m-ftams.mil', role: 'Viewer', status: 'active', avatar: 'DK', lastActive: '1d ago' },
  { id: '6', name: 'Alex Thompson', email: 'alex.t@m-ftams.mil', role: 'Member', status: 'pending', avatar: 'AT', lastActive: 'Pending invite' },
];

const permissionMatrix: Record<ResourceModule, Record<Permission, boolean>> = {
  Dashboard: { read: true, write: true, delete: false, manage: true },
  Analytics: { read: true, write: true, delete: false, manage: false },
  Transactions: { read: true, write: true, delete: true, manage: true },
  Team: { read: true, write: false, delete: false, manage: true },
  Settings: { read: true, write: false, delete: false, manage: false },
  Billing: { read: true, write: false, delete: false, manage: false },
};

// ── Role Badge ────────────────────────────────────────────────────
function RoleBadge({ role }: { role: TeamMember['role'] }) {
  const variants: Record<string, string> = {
    Owner: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    Admin: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    Member: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Viewer: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={variants[role]}>
      {role}
    </Badge>
  );
}

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: TeamMember['status'] }) {
  const variants: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    inactive: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ── Main Team Screen ──────────────────────────────────────────────
export function TeamScreen() {
  const [members, setMembers] = useState(mockMembers);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('Member');
  const handleInviteRoleChange = (value: string | null) => { if (value) setInviteRole(value); };
  const [matrixPermissions, setMatrixPermissions] = useState(permissionMatrix);

  const togglePermission = (module: ResourceModule, permission: Permission) => {
    setMatrixPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: !prev[module][permission],
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your team members and their role-based access permissions.
          </p>
        </div>            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Members</DialogTitle>
              <DialogDescription>
                Add new members by email. They'll receive an invitation to join your workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Addresses</Label>
                <Input
                  placeholder="Enter email addresses, separated by commas"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can enter multiple emails separated by commas
                </p>
              </div>
              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select value={inviteRole} onValueChange={handleInviteRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin — Full access</SelectItem>
                    <SelectItem value="Member">Member — Read & Write</SelectItem>
                    <SelectItem value="Viewer">Viewer — Read Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Handle invite logic
                  setInviteDialogOpen(false);
                  setInviteEmails('');
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invitations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{member.lastActive}</span>
                  </TableCell>
                  <TableCell>
                    {member.role !== 'Owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Role</DropdownMenuItem>
                          <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Matrix
          </CardTitle>
          <CardDescription>
            Configure permissions for each resource module across your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead className="text-center">Read</TableHead>
                <TableHead className="text-center">Write</TableHead>
                <TableHead className="text-center">Delete</TableHead>
                <TableHead className="text-center">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(matrixPermissions) as ResourceModule[]).map((module) => (
                <TableRow key={module}>
                  <TableCell className="font-medium">{module}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={matrixPermissions[module].read}
                      onCheckedChange={() => togglePermission(module, 'read')}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={matrixPermissions[module].write}
                      onCheckedChange={() => togglePermission(module, 'write')}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={matrixPermissions[module].delete}
                      onCheckedChange={() => togglePermission(module, 'delete')}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={matrixPermissions[module].manage}
                      onCheckedChange={() => togglePermission(module, 'manage')}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
