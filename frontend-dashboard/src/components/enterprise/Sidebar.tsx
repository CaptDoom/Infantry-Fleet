import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Database,
  Activity,
  Users,
  Shield,
  Plug,
  CreditCard,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  LogOut,
  UserCog,
  RefreshCw,
  FileText,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, type Theme } from '@/store/ui';
import type { ScreenId } from '@/types/screens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'transactions', label: 'Transactions', icon: Database, badge: 12 },
      { id: 'activity-logs', label: 'Activity Logs', icon: Activity },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'team', label: 'Team Members', icon: Users },
      { id: 'roles', label: 'Roles & Permissions', icon: Shield },
      { id: 'integrations', label: 'Integrations', icon: Plug },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & Docs', icon: HelpCircle },
    ],
  },
];

export function Sidebar({ currentScreen, onNavigate }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    new Set([0, 1, 2])
  );

  const toggleGroup = (index: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground leading-tight">
                M-FTAMS
              </span>
              <span className="text-[10px] text-muted-foreground">Enterprise</span>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <GitBranch className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-muted-foreground hover:text-sidebar-foreground',
            sidebarCollapsed && 'hidden'
          )}
          onClick={toggleSidebar}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-2">
            {group.label && !sidebarCollapsed && (
              <Collapsible
                open={expandedGroups.has(groupIndex)}
                onOpenChange={() => toggleGroup(groupIndex)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground transition-colors">
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform',
                      !expandedGroups.has(groupIndex) && '-rotate-90'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {group.items.map((item) => (
                    <NavItemComponent
                      key={item.id}
                      item={item}
                      isActive={currentScreen === item.id}
                      collapsed={sidebarCollapsed}
                      onClick={() => onNavigate(item.id)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            {group.label && sidebarCollapsed && (
              <div className="px-2 py-1.5 text-center">
                <div className="h-px bg-sidebar-border my-2" />
              </div>
            )}
            {(!group.label || sidebarCollapsed) &&
              group.items.map((item) => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  isActive={currentScreen === item.id}
                  collapsed={sidebarCollapsed}
                  onClick={() => onNavigate(item.id)}
                />
              ))}
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex items-center gap-2 w-full rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="/avatars/admin.jpg" alt="Admin" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                VK
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  Maj. Vikramaditya
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  admin@m-ftams.mil
                </p>
              </div>
            )}
            {!sidebarCollapsed && (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Maj. Vikramaditya</p>
              <p className="text-xs text-muted-foreground">admin@m-ftams.mil</p>
              <Badge variant="secondary" className="mt-1 text-[10px]">
                Enterprise Plan
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCog className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" />
              Switch Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-muted-foreground hover:text-sidebar-foreground"
            onClick={toggleSidebar}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}

function NavItemComponent({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const content = (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
        isActive
          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-sidebar-primary')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary"
            >
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
