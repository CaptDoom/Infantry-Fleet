export type ScreenId =
  | 'dashboard'
  | 'analytics'
  | 'transactions'
  | 'activity-logs'
  | 'team'
  | 'roles'
  | 'integrations'
  | 'billing'
  | 'settings'
  | 'help';

export const screenLabels: Record<ScreenId, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  transactions: 'Transactions',
  'activity-logs': 'Activity Logs',
  team: 'Team Members',
  roles: 'Roles & Permissions',
  integrations: 'Integrations',
  billing: 'Billing & Usage',
  settings: 'Settings',
  help: 'Help & Documentation',
};

export const screenParents: Partial<Record<ScreenId, string>> = {
  transactions: 'Data Management',
  'activity-logs': 'Data Management',
  team: 'Management',
  roles: 'Management',
  integrations: 'Management',
  billing: 'System',
  settings: 'System',
  help: 'System',
};
