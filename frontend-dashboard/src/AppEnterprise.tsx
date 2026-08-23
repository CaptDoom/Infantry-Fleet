import React, { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/enterprise/Sidebar';
import { TopHeader } from '@/components/enterprise/TopHeader';
import type { ScreenId } from '@/types/screens';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { TransactionsScreen } from '@/screens/TransactionsScreen';
import { AnalyticsScreen } from '@/screens/AnalyticsScreen';
import { ActivityLogsScreen } from '@/screens/ActivityLogsScreen';
import { TeamScreen } from '@/screens/TeamScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';

export function AppEnterprise() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');

  const handleCreateNew = () => {
    console.log('Create new entry');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'transactions':
        return <TransactionsScreen />;
      case 'activity-logs':
        return <ActivityLogsScreen />;
      case 'team':
        return <TeamScreen />;
      case 'roles':
        return (
          <PlaceholderScreen
            title="Roles & Permissions"
            description="Manage role-based access control for your workspace."
          />
        );
      case 'integrations':
        return (
          <PlaceholderScreen
            title="Integrations"
            description="Connect third-party services and APIs."
          />
        );
      case 'billing':
        return (
          <PlaceholderScreen
            title="Billing & Usage"
            description="Manage your subscription and view usage metrics."
          />
        );
      case 'settings':
        return <SettingsScreen />;
      case 'help':
        return (
          <PlaceholderScreen
            title="Help & Documentation"
            description="Access guides, tutorials, and support resources."
          />
        );
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar currentScreen={currentScreen} onNavigate={setCurrentScreen} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
            onCreateNew={handleCreateNew}
          />
          <main className="flex-1 overflow-y-auto p-6">
            {renderScreen()}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
