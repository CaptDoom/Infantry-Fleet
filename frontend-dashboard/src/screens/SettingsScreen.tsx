import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  CreditCard,
  Webhook,
  HelpCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ─────────────────────────────────────────────────────────
interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string;
  lastUsed: string;
  permissions: string[];
}

// ── Mock Data ─────────────────────────────────────────────────────
const mockAPIKeys: APIKey[] = [
  {
    id: '1',
    name: 'Production Node PKI Certificate',
    key: 'mftams_pki_node_prod_cert_auth_key_01',
    createdAt: '2024-01-01',
    expiresAt: '2025-01-01',
    lastUsed: '2 minutes ago',
    permissions: ['read', 'write'],
  },
  {
    id: '2',
    name: 'Development Node Key',
    key: 'mftams_pki_node_dev_cert_auth_key_02',
    createdAt: '2024-01-10',
    expiresAt: '2024-07-10',
    lastUsed: '1 hour ago',
    permissions: ['read'],
  },
];

// ── API Key Masking Component ─────────────────────────────────────
function MaskedKey({ key }: { key: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskedKey = key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
  const displayKey = revealed ? key : maskedKey;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{displayKey}</code>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setRevealed(!revealed)}
      >
        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ── Main Settings Screen ──────────────────────────────────────────
export function SettingsScreen() {
  const [apiKeys, setAPIKeys] = useState(mockAPIKeys);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiration, setNewKeyExpiration] = useState('90');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);

  const toggleNewKeyPermission = (perm: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Preferences</h1>
        <p className="text-muted-foreground">
          Manage your account settings, security, API keys, and billing.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="general" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your workspace general preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input defaultValue="M-FTAMS Enterprise" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input defaultValue="admin@m-ftams.mil" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue="ist">
                  <SelectTrigger className="w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ist">Asia/Kolkata (IST, UTC+5:30)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">America/New_York (EST, UTC-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive email alerts for important events
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-medium">
                  VK
                </div>
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue="Maj. Vikramaditya" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue="admin@m-ftams.mil" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+91 98765 43210" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input defaultValue="IT & Systems" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & 2FA</CardTitle>
              <CardDescription>Manage your security preferences and two-factor authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      Secure your account with 2FA using an authenticator app
                    </p>
                  </div>
                </div>
                <Switch />
              </div>
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Confirm new password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API keys for programmatic access.</CardDescription>
                </div>                <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
          <DialogTrigger>
            <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Generate New Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate New API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key with specific permissions and expiration.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Key Name</Label>
                        <Input
                          placeholder="e.g., Production Key"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiration</Label>
                        <Select value={newKeyExpiration} onValueChange={(v) => { if (v) setNewKeyExpiration(v); }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="180">6 months</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="flex gap-2">
                          {['read', 'write', 'delete'].map((perm) => (
                            <Badge
                              key={perm}
                              variant={newKeyPermissions.includes(perm) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => toggleNewKeyPermission(perm)}
                            >
                              {perm.charAt(0).toUpperCase() + perm.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewKeyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setNewKeyDialogOpen(false)}>
                        Generate Key
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{apiKey.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {apiKey.createdAt} · Expires {apiKey.expiresAt}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <MaskedKey key={apiKey.key} />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Permissions:</span>
                      {apiKey.permissions.map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-[10px]">
                          {perm}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground ml-auto">
                        Last used {apiKey.lastUsed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Usage</CardTitle>
              <CardDescription>Manage your subscription and view usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enterprise Plan</p>
                    <p className="text-xs text-muted-foreground">$299/month · Billed annually</p>
                  </div>
                  <Badge>Active</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">247</p>
                  <p className="text-xs text-muted-foreground">Team Members</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">1.2M</p>
                  <p className="text-xs text-muted-foreground">API Calls</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">500GB</p>
                  <p className="text-xs text-muted-foreground">Storage Used</p>
                </div>
              </div>
              <Button variant="outline">Manage Subscription</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>Configure webhook endpoints for event notifications.</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No webhooks configured yet.</p>
                <p className="text-xs mt-1">
                  Add a webhook to receive notifications for events.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
