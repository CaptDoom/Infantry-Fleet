import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Calendar,
  Check,
  Clock,
  AlertTriangle,
  MessageSquare,
  LayoutDashboard,
  BarChart3,
  Database,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, type Theme } from '@/store/ui';
import type { ScreenId } from '@/types/screens';
import { screenLabels, screenParents } from '@/types/screens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TopHeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onCreateNew?: () => void;
}

const dateRangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Month to Date', value: 'mtd' },
  { label: 'Custom Range', value: 'custom' },
];

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Deployment Complete',
    message: 'v2.4.1 has been deployed to production successfully.',
    time: '5m ago',
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'High CPU Usage',
    message: 'Server node-3 is at 89% CPU utilization.',
    time: '12m ago',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'New Team Member',
    message: 'Sarah Chen has joined the Engineering team.',
    time: '1h ago',
    read: false,
  },
  {
    id: '4',
    type: 'error',
    title: 'Payment Failed',
    message: 'Invoice #INV-2024-089 payment processing failed.',
    time: '3h ago',
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Weekly Report',
    message: 'Your weekly analytics report is ready for review.',
    time: '1d ago',
    read: true,
  },
];

export function TopHeader({ currentScreen, onNavigate, onCreateNew }: TopHeaderProps) {
  const { theme, setTheme, commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [selectedDateRange, setSelectedDateRange] = useState('7d');
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-40">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">M-FTAMS</span>
          {screenParents[currentScreen] && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {screenParents[currentScreen]}
              </span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {screenLabels[currentScreen]}
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-muted-foreground gap-2 hidden md:flex"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Popover>
            <PopoverTrigger>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs hidden sm:inline">
                  {dateRangeOptions.find((d) => d.value === selectedDateRange)?.label}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    'flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors',
                    selectedDateRange === option.value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={() => setSelectedDateRange(option.value)}
                >
                  {option.label}
                  {selectedDateRange === option.value && (
                    <Check className="ml-auto h-3.5 w-3.5" />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger>
              <Button variant="outline" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h4 className="font-medium text-sm">Notifications</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={markAllRead}
                >
                  Mark all read
                </Button>
              </div>
              <ScrollArea className="h-80">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer',
                      !notification.read && 'bg-primary/5'
                    )}
                  >
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {notification.time}
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={cycleTheme}>
            {getThemeIcon()}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button size="sm" className="h-8 gap-1.5" onClick={onCreateNew}>
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">New Entry</span>
          </Button>
        </div>
      </header>

      {/* Command Palette Dialog */}
      <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <CommandInput placeholder="Search commands, entities, routes..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { onNavigate('dashboard'); setCommandPaletteOpen(false); }}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { onNavigate('analytics'); setCommandPaletteOpen(false); }}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </CommandItem>
            <CommandItem onSelect={() => { onNavigate('transactions'); setCommandPaletteOpen(false); }}>
              <Database className="mr-2 h-4 w-4" />
              Transactions
            </CommandItem>
            <CommandItem onSelect={() => { onNavigate('team'); setCommandPaletteOpen(false); }}>
              <Users className="mr-2 h-4 w-4" />
              Team Members
            </CommandItem>
            <CommandItem onSelect={() => { onNavigate('settings'); setCommandPaletteOpen(false); }}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { onCreateNew?.(); setCommandPaletteOpen(false); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Entry
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
