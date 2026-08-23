import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Check, AlertTriangle, Info, X } from 'lucide-react';

const logs = [
  { id: '1', action: 'User Login', user: 'Sarah Chen', time: '2 min ago', type: 'info' as const, details: 'Successfully authenticated via 2FA' },
  { id: '2', action: 'Record Updated', user: 'Marcus Johnson', time: '15 min ago', type: 'success' as const, details: 'Updated transaction TXN-045' },
  { id: '3', action: 'Permission Changed', user: 'Emily Rodriguez', time: '1h ago', type: 'warning' as const, details: 'Elevated David Kim to Admin role' },
  { id: '4', action: 'Export Generated', user: 'Admin', time: '2h ago', type: 'info' as const, details: 'Exported 1,247 records as CSV' },
  { id: '5', action: 'API Key Generated', user: 'Alex Thompson', time: '3h ago', type: 'success' as const, details: 'New production key created' },
  { id: '6', action: 'Failed Login Attempt', user: 'Unknown', time: '5h ago', type: 'error' as const, details: '3 failed attempts from IP 192.168.1.45' },
  { id: '7', action: 'Settings Updated', user: 'Sarah Chen', time: '6h ago', type: 'info' as const, details: 'Email notifications enabled' },
  { id: '8', action: 'Bulk Import', user: 'Marcus Johnson', time: '1d ago', type: 'success' as const, details: 'Imported 500 records from CSV' },
];

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <Check className="h-4 w-4 text-emerald-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <X className="h-4 w-4 text-red-500" />,
};

const typeBadges: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function ActivityLogsScreen() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">Track all actions and events across your workspace.</p>
        </div>
        <Button variant="outline">Export Logs</Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-0">
            {logs.map((log, index) => (
              <div key={log.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  {typeIcons[log.type]}
                  {index < logs.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{log.action}</span>
                    <Badge variant="outline" className={`text-[10px] ${typeBadges[log.type]}`}>
                      {log.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{log.time}</span>
                    <span>·</span>
                    <span>{log.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
