import { useCallback } from 'react';
import { DollarSign, TrendingUp, Building2, MapPin, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import type { PlatformAnalyticsSummary } from '@/hooks/useOrganizationAnalytics';

interface RevenueIntelligenceProps {
  analytics: PlatformAnalyticsSummary;
}

export function RevenueIntelligence({ analytics }: RevenueIntelligenceProps) {
  const { resolvedTheme } = usePlatformTheme();
  const { currency } = useFormatCurrency();
  const isDark = resolvedTheme === 'dark';

  const formatCompact = useCallback((value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value),
  [currency]);

  // Revenue by tier
  const tierRevenueData = analytics.tierDistribution.map(tier => ({
    name: tier.tier,
    mrr: tier.mrr,
    accounts: tier.count,
    avgMRR: tier.count > 0 ? tier.mrr / tier.count : 0,
  }));

  // Revenue distribution bands
  const revenueBands = [
    { band: '$0', min: 0, max: 0, count: 0 },
    { band: '<$10K', min: 1, max: 10000, count: 0 },
    { band: '$10K-$50K', min: 10000, max: 50000, count: 0 },
    { band: '$50K-$100K', min: 50000, max: 100000, count: 0 },
    { band: '$100K-$250K', min: 100000, max: 250000, count: 0 },
    { band: '$250K+', min: 250000, max: Infinity, count: 0 },
  ];

  analytics.organizationMetrics.forEach(org => {
    const revenue = org.revenueThisMonth;
    const band = revenueBands.find(b => revenue >= b.min && revenue < b.max);
    if (band) band.count++;
  });

  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

  // Calculate service vs retail split
  const totalServiceRevenue = analytics.organizationMetrics.reduce((sum, m) => sum + m.serviceRevenue, 0);
  const totalRetailRevenue = analytics.organizationMetrics.reduce((sum, m) => sum + m.retailRevenue, 0);
  const revenueTypeData = [
    { name: 'Service Revenue', value: totalServiceRevenue, color: '#8b5cf6' },
    { name: 'Retail Revenue', value: totalRetailRevenue, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn(
          'rounded-xl border p-4',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-violet-500/20' : 'bg-violet-100')}>
              <DollarSign className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Platform MRR</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {formatCompact(analytics.platformMRR)}
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
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Platform ARR</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {formatCompact(analytics.platformARR)}
              </p>
            </div>
          </div>
        </div>

        <div className={cn(
          'rounded-xl border p-4',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-blue-500/20' : 'bg-blue-100')}>
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Combined Salon Revenue</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {formatCompact(analytics.combinedMonthlyRevenue)}
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
              <MapPin className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Avg Revenue/Location</p>
              <p className={cn('text-xl font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                {formatCompact(analytics.avgRevenuePerLocation)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* MRR by Tier */}
        <div className={cn(
          'rounded-xl border p-6',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
            MRR by Subscription Tier
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => formatCompact(v)}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCompact(value), 'MRR']}
                />
                <Bar dataKey="mrr" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Type Split */}
        <div className={cn(
          'rounded-xl border p-6',
          isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        )}>
          <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
            Service vs Retail Revenue
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  stroke="hsl(var(--border) / 0.4)"
                  strokeWidth={1}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {revenueTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCompact(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Distribution */}
      <div className={cn(
        'rounded-xl border p-6',
        isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      )}>
        <h3 className={cn('font-medium mb-4', isDark ? 'text-white' : 'text-slate-900')}>
          Organization Revenue Distribution (Monthly)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueBands}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="band" stroke={isDark ? '#94a3b8' : '#64748b'} />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} organizations`, 'Count']}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
