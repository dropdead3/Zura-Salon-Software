import { useState } from 'react';
import { BarChart3, Trophy, DollarSign, Activity, TrendingUp, Crown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformPageContainer, PlatformPageHeader, PlatformBadge } from '@/components/platform/ui';
import { useOrganizationAnalytics } from '@/hooks/useOrganizationAnalytics';
import { AnalyticsOverview } from '@/components/platform/analytics/AnalyticsOverview';
import { OrganizationLeaderboards } from '@/components/platform/analytics/OrganizationLeaderboards';
import { RevenueIntelligence } from '@/components/platform/analytics/RevenueIntelligence';
import { OperationalMetrics } from '@/components/platform/analytics/OperationalMetrics';
import { GrowthAnalytics } from '@/components/platform/analytics/GrowthAnalytics';

export default function PlatformAnalytics() {
  const { resolvedTheme } = usePlatformTheme();
  const isDark = resolvedTheme === 'dark';
  const [activeTab, setActiveTab] = useState('overview');

  const {
    analytics,
    isLoading,
    topByRevenue,
    topBySize,
    topByGrowth,
    topByPerformance,
    topByClients,
    topByRetail,
  } = useOrganizationAnalytics();

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" />
            <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Aggregating organization data...
            </p>
          </div>
        </div>
      </PlatformPageContainer>
    );
  }

  if (!analytics) {
    return (
      <PlatformPageContainer>
        <div className="flex items-center justify-center h-96">
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Unable to load analytics data
          </p>
        </div>
      </PlatformPageContainer>
    );
  }

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Organization Analytics"
        description="Deep intelligence across all accounts"
        actions={
          <PlatformBadge variant="warning" size="sm" className="gap-1">
            <Crown className="w-3 h-3" />
            Owner Only
          </PlatformBadge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 space-y-6">
        <TabsList className={cn(
          'grid w-full grid-cols-5 h-auto p-1',
          isDark ? 'bg-slate-800/50' : 'bg-slate-100'
        )}>
          <TabsTrigger
            value="overview"
            className={cn(
              'flex items-center gap-2 py-2.5',
              'data-[state=active]:bg-violet-500 data-[state=active]:text-white'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="leaderboards"
            className={cn(
              'flex items-center gap-2 py-2.5',
              'data-[state=active]:bg-violet-500 data-[state=active]:text-white'
            )}
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboards</span>
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className={cn(
              'flex items-center gap-2 py-2.5',
              'data-[state=active]:bg-violet-500 data-[state=active]:text-white'
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue Intel</span>
          </TabsTrigger>
          <TabsTrigger
            value="operational"
            className={cn(
              'flex items-center gap-2 py-2.5',
              'data-[state=active]:bg-violet-500 data-[state=active]:text-white'
            )}
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Operational</span>
          </TabsTrigger>
          <TabsTrigger
            value="growth"
            className={cn(
              'flex items-center gap-2 py-2.5',
              'data-[state=active]:bg-violet-500 data-[state=active]:text-white'
            )}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Growth</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview analytics={analytics} />
        </TabsContent>

        <TabsContent value="leaderboards" className="mt-6">
          <OrganizationLeaderboards
            topByRevenue={topByRevenue}
            topBySize={topBySize}
            topByGrowth={topByGrowth}
            topByPerformance={topByPerformance}
            topByClients={topByClients}
            topByRetail={topByRetail}
          />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueIntelligence analytics={analytics} />
        </TabsContent>

        <TabsContent value="operational" className="mt-6">
          <OperationalMetrics analytics={analytics} />
        </TabsContent>

        <TabsContent value="growth" className="mt-6">
          <GrowthAnalytics analytics={analytics} />
        </TabsContent>
      </Tabs>
    </PlatformPageContainer>
  );
}
