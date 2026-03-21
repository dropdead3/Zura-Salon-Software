import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Award,
  Megaphone,
  Settings2,
  Target,
  CircleDollarSign
} from 'lucide-react';
import { useMarketingAnalytics } from '@/hooks/useMarketingAnalytics';
import { tokens } from '@/lib/design-tokens';
import { useLocations } from '@/hooks/useLocations';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { CampaignPerformanceTable } from '@/components/dashboard/marketing/CampaignPerformanceTable';
import { SourceBreakdownChart } from '@/components/dashboard/marketing/SourceBreakdownChart';
import { MediumDistributionChart } from '@/components/dashboard/marketing/MediumDistributionChart';
import { CampaignBudgetManager } from '@/components/dashboard/marketing/CampaignBudgetManager';
import { WebsiteAnalyticsWidget } from '@/components/dashboard/WebsiteAnalyticsWidget';
import type { AnalyticsFilters } from '@/pages/dashboard/admin/AnalyticsHub';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface MarketingTabContentProps {
  filters: AnalyticsFilters;
}

// Map analytics hub date ranges to marketing date ranges
function mapToMarketingDateRange(dateRange: string): 'week' | 'month' | '3months' {
  switch (dateRange) {
    case 'today':
    case 'yesterday':
    case '7d':
    case 'thisWeek':
      return 'week';
    case '30d':
    case 'thisMonth':
    case 'lastMonth':
      return 'month';
    case '90d':
      return '3months';
    default:
      return 'month';
  }
}

export function MarketingTabContent({ filters }: MarketingTabContentProps) {
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const { data: locations } = useLocations();
  const { formatCurrency } = useFormatCurrency();
  
  const locationFilter = filters.locationId !== 'all' ? filters.locationId : undefined;
  const marketingDateRange = mapToMarketingDateRange(filters.dateRange);
  
  const { data: analytics, isLoading } = useMarketingAnalytics(marketingDateRange, locationFilter);

  const selectedLocationName = locationFilter
    ? locations?.find(l => l.id === locationFilter)?.name || 'Unknown'
    : 'All Locations';

  // Check if there's any spend data to show ROI metrics
  const hasSpendData = analytics?.summary.totalSpend ? analytics.summary.totalSpend > 0 : false;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => setShowBudgetManager(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Manage Campaigns
        </Button>
      </div>

      {/* Website Analytics Widget */}
      <PinnableCard elementKey="website_analytics" elementName="Website Analytics" category="Analytics Hub - Marketing" dateRange={filters.dateRange} locationName={selectedLocationName}>
        <WebsiteAnalyticsWidget />
      </PinnableCard>

      {/* Summary KPI Cards - Row 1: Main Metrics */}
      <PinnableCard elementKey="marketing_kpis" elementName="Marketing KPIs" category="Analytics Hub - Marketing" dateRange={filters.dateRange} locationName={selectedLocationName}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className={tokens.card.wrapper}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Megaphone className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-medium tabular-nums">
                  {analytics?.summary.totalCampaigns ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">Active Campaigns</span>
              </div>
            </CardContent>
          </Card>

          <Card className={tokens.card.wrapper}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Users className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-medium tabular-nums">
                  {analytics?.summary.totalLeads ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">Marketing Leads</span>
              </div>
            </CardContent>
          </Card>

          <Card className={tokens.card.wrapper}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <DollarSign className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-medium tabular-nums">
                  {formatCurrency(analytics?.summary.totalRevenue ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground">Attributed Revenue</span>
              </div>
            </CardContent>
          </Card>

          <Card className={tokens.card.wrapper}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-medium tabular-nums">
                  {(analytics?.summary.overallConversionRate ?? 0).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">Conversion Rate</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`${tokens.card.wrapper} col-span-2 md:col-span-1`}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Award className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-lg font-medium truncate max-w-full px-2">
                  {analytics?.summary.topCampaign || '—'}
                </span>
                <span className="text-xs text-muted-foreground">Top Campaign</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </PinnableCard>

      {/* Summary KPI Cards - Row 2: ROI Metrics (only show if spend data exists) */}
      {hasSpendData && (
        <PinnableCard elementKey="marketing_roi_metrics" elementName="ROI Metrics" category="Analytics Hub - Marketing" dateRange={filters.dateRange} locationName={selectedLocationName}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={tokens.card.wrapper}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <DollarSign className="h-5 w-5 text-muted-foreground mb-2" />
                  <span className="text-2xl font-medium tabular-nums">
                    {formatCurrency(analytics?.summary.totalBudget ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">Total Budget</span>
                </div>
              </CardContent>
            </Card>

            <Card className={tokens.card.wrapper}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <CircleDollarSign className="h-5 w-5 text-muted-foreground mb-2" />
                  <span className="text-2xl font-medium tabular-nums">
                    {formatCurrency(analytics?.summary.totalSpend ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">Total Spend</span>
                </div>
              </CardContent>
            </Card>

            <Card className={tokens.card.wrapper}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Target className="h-5 w-5 text-muted-foreground mb-2" />
                  <span className="text-2xl font-medium tabular-nums">
                    {analytics?.summary.avgCPL !== null 
                      ? formatCurrency(analytics.summary.avgCPL) 
                      : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">Avg Cost Per Lead</span>
                </div>
              </CardContent>
            </Card>

            <Card className={tokens.card.wrapper}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
                  <span className={`text-2xl font-medium tabular-nums ${
                    analytics?.summary.overallROAS !== null 
                      ? analytics.summary.overallROAS >= 3 
                        ? 'text-green-600 dark:text-green-400'
                        : analytics.summary.overallROAS >= 1 
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      : ''
                  }`}>
                    {analytics?.summary.overallROAS !== null 
                      ? `${analytics.summary.overallROAS.toFixed(2)}x` 
                      : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">Overall ROAS</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </PinnableCard>
      )}

      {/* Campaign Performance Table */}
      <PinnableCard elementKey="campaign_performance_table" elementName="Campaign Performance" category="Analytics Hub - Marketing" dateRange={filters.dateRange} locationName={selectedLocationName}>
        <CampaignPerformanceTable 
          campaigns={analytics?.campaigns ?? []} 
          isLoading={isLoading} 
        />
      </PinnableCard>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PinnableCard elementKey="source_breakdown_chart" elementName="Traffic Sources" category="Analytics Hub - Marketing" dateRange={filters.dateRange} locationName={selectedLocationName}>
          <SourceBreakdownChart 
            sources={analytics?.sources ?? []} 
            isLoading={isLoading} 
          />
        </PinnableCard>
        <PinnableCard elementKey="medium_distribution_chart" elementName="Marketing Mediums" category="Analytics Hub - Marketing" dateRange={filters.dateRange} locationName={selectedLocationName}>
          <MediumDistributionChart 
            mediums={analytics?.mediums ?? []} 
            isLoading={isLoading} 
          />
        </PinnableCard>
      </div>

      {/* Campaign Budget Manager Sheet */}
      <CampaignBudgetManager 
        open={showBudgetManager} 
        onOpenChange={setShowBudgetManager} 
      />
    </div>
  );
}
