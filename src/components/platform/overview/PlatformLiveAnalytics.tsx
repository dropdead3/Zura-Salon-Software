import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Activity,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, endOfMonth } from 'date-fns';

interface MonthlyData {
  month: string;
  accounts: number;
  locations: number;
}

function usePlatformGrowthData() {
  return useQuery({
    queryKey: ['platform-growth-analytics'],
    queryFn: async () => {
      const months: MonthlyData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthEnd = endOfMonth(date);
        
        const { count: accountCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', monthEnd.toISOString());
        
        const { count: locationCount } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', monthEnd.toISOString());
        
        months.push({
          month: format(date, 'MMM'),
          accounts: accountCount || 0,
          locations: locationCount || 0,
        });
      }
      
      const currentMonth = months[months.length - 1];
      const previousMonth = months[months.length - 2];
      
      const accountGrowth = previousMonth.accounts > 0 
        ? ((currentMonth.accounts - previousMonth.accounts) / previousMonth.accounts) * 100 
        : 0;
      
      const locationGrowth = previousMonth.locations > 0
        ? ((currentMonth.locations - previousMonth.locations) / previousMonth.locations) * 100
        : 0;
      
      return {
        months,
        currentAccounts: currentMonth.accounts,
        currentLocations: currentMonth.locations,
        accountGrowth,
        locationGrowth,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

interface PlatformLiveAnalyticsProps {
  className?: string;
}

export function PlatformLiveAnalytics({ className }: PlatformLiveAnalyticsProps) {
  const { data, isLoading } = usePlatformGrowthData();

  if (isLoading) {
    return (
      <div className={cn(
        "relative rounded-[16px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5 overflow-hidden",
        className
      )}>
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 rounded-xl bg-[hsl(var(--platform-primary)/0.2)]">
            <Activity className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
          </div>
          <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))]">Platform Growth</h2>
        </div>
        <Skeleton className="h-[220px] w-full rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-20 rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
          <Skeleton className="h-20 rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative rounded-[16px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5 overflow-hidden",
      className
    )}>
      {/* Top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--platform-foreground)/0.04)] to-transparent" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[hsl(var(--platform-primary)/0.2)] ring-1 ring-[hsl(var(--platform-primary)/0.1)]">
            <Activity className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
          </div>
          <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))] tracking-tight">Platform Growth</h2>
        </div>
        <span className="text-xs text-[hsl(var(--platform-foreground-subtle))] font-medium tracking-wide">Last 6 months</span>
      </div>

      {/* Chart */}
      <div className="relative h-[220px] -mx-2">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.06)_0%,_transparent_70%)] pointer-events-none" />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data?.months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAccounts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLocations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--platform-border))" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--platform-foreground-subtle))', fontSize: 11 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--platform-foreground-subtle))', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--platform-bg-elevated))', 
                backdropFilter: 'blur(16px)',
                border: '1px solid hsl(var(--platform-border))',
                borderRadius: '12px',
                boxShadow: '0 20px 50px -12px rgba(0,0,0,0.4)',
                padding: '10px 14px',
              }}
              labelStyle={{ color: 'hsl(var(--platform-foreground))', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
            />
            <Area
              type="monotone"
              dataKey="accounts"
              name="Accounts"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAccounts)"
              activeDot={{ r: 5, fill: '#8b5cf6', stroke: 'hsl(var(--platform-bg))', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="locations"
              name="Locations"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLocations)"
              activeDot={{ r: 5, fill: '#10b981', stroke: 'hsl(var(--platform-bg))', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <MetricCard
          label="Total Accounts"
          value={data?.currentAccounts || 0}
          change={data?.accountGrowth || 0}
          icon={Building2}
          color="violet"
        />
        <MetricCard
          label="Total Locations"
          value={data?.currentLocations || 0}
          change={data?.locationGrowth || 0}
          icon={Users}
          color="emerald"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'violet' | 'emerald' | 'amber';
}

function MetricCard({ label, value, change, icon: Icon, color }: MetricCardProps) {
  const isPositive = change >= 0;
  
  const colorStyles = {
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <div className="group/metric rounded-xl bg-[hsl(var(--platform-bg-hover)/0.3)] border border-[hsl(var(--platform-border)/0.2)] p-3 shadow-[inset_0_1px_1px_hsl(var(--platform-foreground)/0.03)] hover:bg-[hsl(var(--platform-bg-hover)/0.4)] transition-colors duration-150">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("p-1.5 rounded-lg transition-transform duration-150 group-hover/metric:scale-105", colorStyles[color])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {change !== 0 && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-medium text-[hsl(var(--platform-foreground))] tabular-nums tracking-tight">
        <AnimatedNumber value={value} duration={1200} />
      </div>
      <div className="text-xs text-[hsl(var(--platform-foreground-subtle))]">{label}</div>
    </div>
  );
}
