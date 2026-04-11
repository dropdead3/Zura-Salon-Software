import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Award,
  Megaphone,
  Settings2,
  Target,
  CircleDollarSign
} from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useMarketingAnalytics } from '@/hooks/useMarketingAnalytics';
import { tokens } from '@/lib/design-tokens';
import { useActiveLocations } from '@/hooks/useLocations';
import { CampaignPerformanceTable } from '@/components/dashboard/marketing/CampaignPerformanceTable';
import { SourceBreakdownChart } from '@/components/dashboard/marketing/SourceBreakdownChart';
import { MediumDistributionChart } from '@/components/dashboard/marketing/MediumDistributionChart';
import { CampaignBudgetManager } from '@/components/dashboard/marketing/CampaignBudgetManager';
import { CommandCenterVisibilityToggle } from '@/components/dashboard/CommandCenterVisibilityToggle';
import { BentoGrid } from '@/components/ui/bento-grid';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { SEOContentTasksCard } from '@/components/dashboard/seo-workshop/SEOContentTasksCard';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

type DateRange = 'week' | 'month' | '3months';

export default function MarketingAnalytics() {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { data: locations = [] } = useActiveLocations();
  const locationFilter = selectedLocation === 'all' ? undefined : selectedLocation;
  
  const { data: analytics, isLoading } = useMarketingAnalytics(dateRange, locationFilter);

  // Check if there's any spend data to show ROI metrics
  const hasSpendData = analytics?.summary.totalSpend ? analytics.summary.totalSpend > 0 : false;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header with filters */}
        <DashboardPageHeader
          title="Marketing Analytics"
          description="Track UTM campaign performance, conversion rates, and ROI."
          className="mb-8"
          actions={
            <div className="flex items-center gap-2">
              <CommandCenterVisibilityToggle 
                elementKey="website_analytics" 
                elementName="Website Traffic" 
              />
        <PageExplainer pageId="marketing-analytics" />
              {/* Manage Campaigns Button */}
              <Button variant="outline" onClick={() => setShowBudgetManager(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Campaigns
              </Button>
              {/* Location filter */}
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Date range tabs */}
              <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="3months">3 Months</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          }
        />

        {/* Summary KPI Cards - Row 1: Main Metrics */}
        <BentoGrid maxPerRow={5} gap="gap-4" className="mb-4">
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
                  {formatCurrencyWhole(analytics?.summary.totalRevenue ?? 0)}
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

          <Card className={tokens.card.wrapper}>
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
        </BentoGrid>

        {/* Summary KPI Cards - Row 2: ROI Metrics (only show if spend data exists) */}
        {hasSpendData && (
          <BentoGrid maxPerRow={4} gap="gap-4" className="mb-6">
            <Card className={tokens.card.wrapper}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <DollarSign className="h-5 w-5 text-muted-foreground mb-2" />
                  <span className="text-2xl font-medium tabular-nums">
                    {formatCurrencyWhole(analytics?.summary.totalBudget ?? 0)}
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
                    {formatCurrencyWhole(analytics?.summary.totalSpend ?? 0)}
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
          </BentoGrid>
        )}

        {/* Campaign Performance Table */}
        <div className="mb-6">
          <CampaignPerformanceTable 
            campaigns={analytics?.campaigns ?? []} 
            isLoading={isLoading} 
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SourceBreakdownChart 
            sources={analytics?.sources ?? []} 
            isLoading={isLoading} 
          />
          <MediumDistributionChart 
            mediums={analytics?.mediums ?? []} 
            isLoading={isLoading} 
          />
        </div>

        {/* M2: SEO Content Tasks integration */}
        <VisibilityGate
          elementKey="seo_content_tasks_marketing"
          elementName="SEO Content Tasks"
          elementCategory="Marketing Analytics"
        >
          <div className="mt-6">
            <SEOContentTasksCard organizationId={effectiveOrganization?.id} />
          </div>
        </VisibilityGate>
      </div>

      {/* Campaign Budget Manager Sheet */}
      <CampaignBudgetManager 
        open={showBudgetManager} 
        onOpenChange={setShowBudgetManager} 
      />
    </DashboardLayout>
  );
}
