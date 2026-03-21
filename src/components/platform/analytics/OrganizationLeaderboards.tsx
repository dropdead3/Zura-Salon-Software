import { useCallback } from 'react';
import { DollarSign, Building2, TrendingUp, Target, UserPlus, ShoppingBag } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { LeaderboardCard } from './LeaderboardCard';
import type { OrganizationMetrics } from '@/hooks/useOrganizationAnalytics';

interface OrganizationLeaderboardsProps {
  topByRevenue: OrganizationMetrics[];
  topBySize: OrganizationMetrics[];
  topByGrowth: OrganizationMetrics[];
  topByPerformance: OrganizationMetrics[];
  topByClients: OrganizationMetrics[];
  topByRetail: OrganizationMetrics[];
}

export function OrganizationLeaderboards({
  topByRevenue,
  topBySize,
  topByGrowth,
  topByPerformance,
  topByClients,
  topByRetail,
}: OrganizationLeaderboardsProps) {
  const { currency } = useFormatCurrency();

  const formatCompact = useCallback((value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value),
  [currency]);

  const revenueEntries = topByRevenue.map((org, index) => ({
    rank: index + 1,
    organization: org,
    value: org.revenueThisMonth,
    previousValue: org.revenueLastMonth,
    formattedValue: formatCompact(org.revenueThisMonth),
  }));

  const sizeEntries = topBySize.map((org, index) => ({
    rank: index + 1,
    organization: org,
    value: org.locationCount + org.userCount,
    formattedValue: `${org.locationCount} loc / ${org.userCount} users`,
  }));

  const growthEntries = topByGrowth.map((org, index) => ({
    rank: index + 1,
    organization: org,
    value: org.revenueGrowth,
    formattedValue: `${org.revenueGrowth >= 0 ? '+' : ''}${org.revenueGrowth.toFixed(1)}%`,
  }));

  const performanceEntries = topByPerformance.map((org, index) => ({
    rank: index + 1,
    organization: org,
    value: (org.avgRebookingRate + org.avgRetentionRate) / 2,
    formattedValue: `${org.avgRebookingRate.toFixed(0)}% / ${org.avgRetentionRate.toFixed(0)}%`,
  }));

  const clientEntries = topByClients.map((org, index) => ({
    rank: index + 1,
    organization: org,
    value: org.newClientsThisMonth,
    formattedValue: org.newClientsThisMonth.toLocaleString(),
  }));

  const retailEntries = topByRetail.map((org, index) => ({
    rank: index + 1,
    organization: org,
    value: org.avgRetailAttachment,
    formattedValue: `${org.avgRetailAttachment.toFixed(1)}%`,
  }));

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <LeaderboardCard
        title="Revenue Champions"
        icon={<DollarSign className="h-5 w-5 text-violet-500" />}
        entries={revenueEntries}
        valueLabel="Monthly Salon Revenue"
        emptyMessage="No revenue data available"
      />

      <LeaderboardCard
        title="Size Leaders"
        icon={<Building2 className="h-5 w-5 text-violet-500" />}
        entries={sizeEntries}
        valueLabel="Locations & Users"
        emptyMessage="No organizations found"
      />

      <LeaderboardCard
        title="Growth Stars"
        icon={<TrendingUp className="h-5 w-5 text-violet-500" />}
        entries={growthEntries}
        valueLabel="Month-over-Month Revenue Growth"
        emptyMessage="Insufficient historical data"
      />

      <LeaderboardCard
        title="Performance Elite"
        icon={<Target className="h-5 w-5 text-violet-500" />}
        entries={performanceEntries}
        valueLabel="Rebooking / Retention Rate"
        emptyMessage="No performance data available"
      />

      <LeaderboardCard
        title="Client Magnets"
        icon={<UserPlus className="h-5 w-5 text-violet-500" />}
        entries={clientEntries}
        valueLabel="New Clients This Month"
        emptyMessage="No client acquisition data"
      />

      <LeaderboardCard
        title="Retail Warriors"
        icon={<ShoppingBag className="h-5 w-5 text-violet-500" />}
        entries={retailEntries}
        valueLabel="Retail Attachment Rate"
        emptyMessage="No retail data available"
      />
    </div>
  );
}
