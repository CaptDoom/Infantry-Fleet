import React from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  Ticket,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// ── KPI Data ──────────────────────────────────────────────────────
const kpiData = [
  {
    title: 'Total Revenue',
    value: '$128,450.00',
    change: '+12.4%',
    trend: 'up' as const,
    sparkData: [30, 40, 35, 50, 49, 60, 70, 91, 86, 95, 100],
  },
  {
    title: 'Active Users',
    value: '2,847',
    change: '+8.2%',
    trend: 'up' as const,
    sparkData: [120, 132, 101, 134, 150, 140, 160, 170, 155, 180, 190],
  },
  {
    title: 'Conversion Rate',
    value: '3.24%',
    change: '-0.4%',
    trend: 'down' as const,
    sparkData: [4.2, 3.8, 4.0, 3.5, 3.2, 3.4, 3.1, 3.3, 3.2, 3.1, 3.24],
  },
  {
    title: 'Open Tickets',
    value: '142',
    change: '-18.3%',
    trend: 'up' as const,
    sparkData: [200, 185, 170, 165, 155, 150, 148, 145, 143, 142, 142],
  },
];

// ── Area Chart Data ───────────────────────────────────────────────
const areaChartData = [
  { month: 'Jan', inflow: 4000, outflow: 2400 },
  { month: 'Feb', inflow: 3000, outflow: 1398 },
  { month: 'Mar', inflow: 5000, outflow: 3800 },
  { month: 'Apr', inflow: 4780, outflow: 3908 },
  { month: 'May', inflow: 5890, outflow: 4800 },
  { month: 'Jun', inflow: 6390, outflow: 3800 },
  { month: 'Jul', inflow: 7490, outflow: 4300 },
  { month: 'Aug', inflow: 8000, outflow: 5100 },
  { month: 'Sep', inflow: 7500, outflow: 4600 },
  { month: 'Oct', inflow: 8200, outflow: 5300 },
  { month: 'Nov', inflow: 9100, outflow: 5800 },
  { month: 'Dec', inflow: 9800, outflow: 6200 },
];

// ── Pie Chart Data ────────────────────────────────────────────────
const pieData = [
  { name: 'Direct', value: 4000, color: '#3b82f6' },
  { name: 'Organic', value: 3000, color: '#10b981' },
  { name: 'Referral', value: 2000, color: '#f59e0b' },
  { name: 'Social', value: 1500, color: '#8b5cf6' },
];

// ── Stacked Bar Data ──────────────────────────────────────────────
const barData = [
  { category: 'Electronics', desktop: 4000, mobile: 2400, tablet: 1000 },
  { category: 'Clothing', desktop: 3000, mobile: 1398, tablet: 800 },
  { category: 'Home', desktop: 2000, mobile: 980, tablet: 600 },
  { category: 'Sports', desktop: 2780, mobile: 1908, tablet: 500 },
  { category: 'Books', desktop: 1890, mobile: 1200, tablet: 400 },
];

// ── Activity Feed Data ────────────────────────────────────────────
const activityFeed = [
  {
    id: '1',
    user: 'Sarah Chen',
    avatar: 'SC',
    action: 'deployed',
    target: 'v2.4.1 to production',
    status: 'success',
    time: '10m ago',
  },
  {
    id: '2',
    user: 'Marcus Johnson',
    avatar: 'MJ',
    action: 'created',
    target: 'invoice #INV-2024-089',
    status: 'info',
    time: '25m ago',
  },
  {
    id: '3',
    user: 'Emily Rodriguez',
    avatar: 'ER',
    action: 'updated',
    target: 'payment settings',
    status: 'warning',
    time: '1h ago',
  },
  {
    id: '4',
    user: 'David Kim',
    avatar: 'DK',
    action: 'resolved',
    target: 'ticket #TK-4521',
    status: 'success',
    time: '2h ago',
  },
  {
    id: '5',
    user: 'Alex Thompson',
    avatar: 'AT',
    action: 'submitted',
    target: 'expense report Q4',
    status: 'info',
    time: '3h ago',
  },
  {
    id: '6',
    user: 'Lisa Wang',
    avatar: 'LW',
    action: 'archived',
    target: 'project "Atlas"',
    status: 'default',
    time: '5h ago',
  },
];

// ── Mini Sparkline Component ──────────────────────────────────────
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const color = positive ? '#10b981' : '#ef4444';
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ x: i, y: v }))}>
          <defs>
            <linearGradient id={`spark-${positive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            fill={`url(#spark-${positive})`}
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Status Badge Component ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    default: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge variant="outline" className={variants[status] || variants.default}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────
export function DashboardScreen() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Overview</h1>
        <p className="text-muted-foreground">
          Welcome back, Maj. Vikramaditya. Here's what's happening today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider">
                  {kpi.title}
                </CardDescription>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.trend === 'up' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <MiniSparkline data={kpi.sparkData} positive={kpi.trend === 'up'} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Inflow vs Outflow over time</CardDescription>
              </div>
              <div className="flex gap-1">
                {['Hourly', 'Daily', 'Weekly'].map((label) => (
                  <Button
                    key={label}
                    variant={label === 'Daily' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    stroke="#3b82f6"
                    fill="url(#inflowGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    stroke="#8b5cf6"
                    fill="url(#outflowGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Device & channel breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Stacked Bar + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stacked Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Breakdown by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="category"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="desktop" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="mobile" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="tablet" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across your workspace</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityFeed.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.user}</span>{' '}
                      <span className="text-muted-foreground">{item.action}</span>{' '}
                      <span className="font-medium">{item.target}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={item.status} />
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
