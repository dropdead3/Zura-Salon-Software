import { useMemo } from 'react';
import { Building2, MapPin, Users, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import type { PlatformAnalyticsSummary } from '@/hooks/useOrganizationAnalytics';
import { parseISO, startOfMonth, subMonths } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';

interface GrowthAnalyticsProps {
  analytics: PlatformAnalyticsSummary;
}

export function GrowthAnalytics({ analytics }: GrowthAnalyticsProps) {
  const { formatDate } = useFormatDate();
  const { resolvedTheme } = usePlatformTheme();
  const isDark = resolvedTheme === 'dark';

  // Calculate cumulative growth over time
  const cumulativeGrowth = useMemo(() => {
    const sorted = [...analytics.monthlyGrowth].sort((a, b) => a.month.localeCompare(b.month));
    let cumOrgs = 0, cumLocs = 0, cumUsers = 0;
    
    return sorted.map(item => {
      cumOrgs += item.organizations;
      cumLocs += item.locations;
      cumUsers += item.users;
      return {
        month: item.month,
        displayMonth: formatDate(parseISO(item.month + '-01'), 'MMM yy'),
        newOrganizations: item.organizations,
        totalOrganizations: cumOrgs,
        totalLocations: cumLocs,
        totalUsers: cumUsers,
      };
    });
  }, [analytics.monthlyGrowth]);

  // Recent months for highlighting
  const last12Months = cumulativeGrowth.slice(-12);

  // Calculate month-over-month changes
  const currentMonth = last12Months[last12Months.length - 1];
  const lastMonth = last12Months[last12Months.length - 2];
  
  const orgChange = currentMonth && lastMonth 
    ? currentMonth.newOrganizations - (lastMonth?.newOrganizations || 0)
    : 0;

  // Account status breakdown
  const activeCount = analytics.organizationMetrics.filter(m => m.status === 'active').length;
  const trialCount = analytics.organizationMetrics.filter(m => m.status === 'trial').length;
  const inactiveCount = analytics.organizationMetrics.filter(m => m.status === 'inactive').length;

  // Recent signups
  const recentSignups = useMemo(() => {
    const thirtyDaysAgo = subMonths(new Date(), 1);
    return analytics.organizationMetrics
      .filter(m => m.createdAt && new Date(m.createdAt) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [analytics.organizationMetrics]);

  return (
    <div className="space-y-6">
      {/* Growth Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn(
          'rounded-xl border p-4',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-violet-500/20' : 'bg-violet-100')}>
              <Building2 className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Total Accounts</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {analytics.totalOrganizations}
              </p>
            </div>
          </div>
        </div>

        <div className={cn(
          'rounded-xl border p-4',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-emerald-500/20' : 'bg-emerald-100')}>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Active Accounts</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {activeCount}
              </p>
            </div>
          </div>
        </div>

        <div className={cn(
          'rounded-xl border p-4',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>In Trial</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {trialCount}
              </p>
            </div>
          </div>
        </div>

        <div className={cn(
          'rounded-xl border p-4',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-red-500/20' : 'bg-red-100')}>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Inactive</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {inactiveCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Growth Over Time */}
        <div className={cn(
          'rounded-xl border p-6',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
            Account Growth Timeline
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last12Months}>
                <defs>
                  <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="displayMonth" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalOrganizations" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorOrgs)" 
                  name="Total Accounts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Accounts Per Month */}
        <div className={cn(
          'rounded-xl border p-6',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
            New Accounts Per Month
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last12Months}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="displayMonth" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="newOrganizations" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorNew)" 
                  name="New Accounts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Platform Expansion */}
      <div className={cn(
        'rounded-xl border p-6',
        isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      )}>
        <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
          Platform Expansion (Locations & Users)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last12Months}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="displayMonth" stroke={isDark ? '#94a3b8' : '#64748b'} />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalLocations" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Total Locations"
              />
              <Line 
                type="monotone" 
                dataKey="totalUsers" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={false}
                name="Total Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Signups */}
      <div className={cn(
        'rounded-xl border p-6',
        isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      )}>
        <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
          Recent Signups (Last 30 Days)
        </h3>
        {recentSignups.length === 0 ? (
          <p className={cn('text-center py-8', isDark ? 'text-slate-400' : 'text-slate-500')}>
            No new signups in the last 30 days
          </p>
        ) : (
          <div className="space-y-3">
            {recentSignups.map((org) => (
              <div
                key={org.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  isDark ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div>
                  <p className={cn('font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                    {org.name}
                  </p>
                  <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    #{org.accountNumber} • {org.country || 'Unknown Location'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-medium', isDark ? 'text-violet-400' : 'text-violet-600')}>
                    {org.subscriptionTier || 'No Plan'}
                  </p>
                  <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {formatDate(new Date(org.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
