/**
 * PricingAnalyticsContent — Analytics Hub > Sales > Pricing subtab.
 * Surfaces margin health KPIs, distribution chart, at-risk services, and CTA.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, TrendingUp, DollarSign, Target, ArrowRight, Beaker } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, LineChart, Line, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge } from '@/components/dashboard/AnalyticsFilterBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useComputedPriceRecommendations, useDefaultTargetMargin } from '@/hooks/color-bar/useServicePriceRecommendations';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { useServiceProfitabilitySnapshots } from '@/hooks/color-bar/useServiceProfitability';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import type { FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';

interface PricingAnalyticsContentProps {
  locationId?: string;
  filterContext: FilterContext;
  dateFrom?: string;
  dateTo?: string;
  locationName?: string;
}

export function PricingAnalyticsContent({
  locationId,
  filterContext,
  dateFrom,
  dateTo,
  locationName = 'All Locations',
}: PricingAnalyticsContentProps) {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { isEntitled: isColorBarEntitled, isLoading: entitlementLoading } = useColorBarEntitlement();
  const { data: recommendations, isLoading } = useComputedPriceRecommendations();
  const { margin: defaultMargin } = useDefaultTargetMargin();

  // Historical profitability snapshots for trend
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  }, []);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: snapshots } = useServiceProfitabilitySnapshots(
    dateFrom || thirtyDaysAgo,
    dateTo || today,
    locationId,
  );

  // Compute KPIs
  const kpis = useMemo(() => {
    if (!recommendations?.length) return { belowTarget: 0, avgGap: 0, weightedImpact: 0, avgProductCost: 0 };
    const below = recommendations.filter(r => r.is_below_target);
    const avgGap = below.length
      ? below.reduce((sum, r) => sum + (r.target_margin_pct - r.current_margin_pct), 0) / below.length
      : 0;
    const weightedImpact = below.reduce((sum, r) => sum + (r.weighted_impact ?? r.price_delta), 0);
    const avgProductCost = recommendations.reduce((sum, r) => sum + r.product_cost, 0) / recommendations.length;
    return {
      belowTarget: below.length,
      avgGap: Math.round(avgGap * 10) / 10,
      weightedImpact: Math.round(weightedImpact * 100) / 100,
      avgProductCost: Math.round(avgProductCost * 100) / 100,
    };
  }, [recommendations]);

  // Margin distribution chart data
  const marginChartData = useMemo(() => {
    if (!recommendations?.length) return [];
    return recommendations
      .slice()
      .sort((a, b) => a.current_margin_pct - b.current_margin_pct)
      .map(r => ({
        name: r.service_name.length > 18 ? r.service_name.slice(0, 16) + '…' : r.service_name,
        margin: Math.round(r.current_margin_pct * 10) / 10,
        target: r.target_margin_pct,
        isBelowTarget: r.is_below_target,
      }));
  }, [recommendations]);

  // Top at-risk services
  const atRiskServices = useMemo(() => {
    if (!recommendations?.length) return [];
    return recommendations
      .filter(r => r.is_below_target)
      .sort((a, b) => (b.target_margin_pct - b.current_margin_pct) - (a.target_margin_pct - a.current_margin_pct))
      .slice(0, 5);
  }, [recommendations]);

  // Margin trend data from profitability snapshots
  const marginTrendData = useMemo(() => {
    if (!snapshots?.length) return [];
    // Group by week
    const weekMap = new Map<string, { revenues: number; costs: number }>();
    for (const s of snapshots) {
      const d = new Date(s.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const existing = weekMap.get(key) || { revenues: 0, costs: 0 };
      existing.revenues += s.service_revenue;
      existing.costs += s.product_cost;
      weekMap.set(key, existing);
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        margin: data.revenues > 0 ? Math.round(((data.revenues - data.costs) / data.revenues) * 1000) / 10 : 0,
      }));
  }, [snapshots]);

  if (isLoading || entitlementLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading?.spinner || 'h-8 w-8 animate-spin text-primary'} />
      </div>
    );
  }

  // Color Bar not activated — show empty state
  if (!entitlementLoading && !isColorBarEntitled) {
    return (
      <EmptyState
        icon={Beaker}
        title="Pricing intelligence requires Zura Color Bar"
        description="Activate Zura Color Bar to unlock service pricing analytics, margin tracking, and AI-driven price recommendations."
        action={
          <Button
            variant="outline"
            onClick={() => navigate(dashPath('/admin/color-bar-settings'))}
            className="font-sans gap-1"
          >
            Explore Color Bar <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PinnableCard elementKey="pricing_below_target" elementName="Services Below Target" category="Analytics Hub - Pricing">
          <Card className="relative">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                    Below Target
                  </p>
                  <MetricInfoTooltip description="Number of tracked chemical services whose current margin is below the configured target margin percentage." className="w-3 h-3" />
                </div>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>{kpis.belowTarget}</p>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>

        <PinnableCard elementKey="pricing_avg_gap" elementName="Avg Margin Gap" category="Analytics Hub - Pricing">
          <Card className="relative">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                    Avg Margin Gap
                  </p>
                  <MetricInfoTooltip description="Average difference between the target margin and actual margin for services below target. A smaller gap means services are closer to their pricing goals." className="w-3 h-3" />
                </div>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>{kpis.avgGap}%</p>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>

        <PinnableCard elementKey="pricing_revenue_impact" elementName="Revenue Impact" category="Analytics Hub - Pricing">
          <Card className="relative">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                    Revenue Impact
                  </p>
                  <MetricInfoTooltip description="Estimated monthly revenue increase if all below-target services are repriced. Weighted by each service's 30-day appointment volume." className="w-3 h-3" />
                </div>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>
                  <BlurredAmount>{kpis.weightedImpact >= 0 ? '+' : '-'}${Math.abs(kpis.weightedImpact).toFixed(2)}</BlurredAmount>
                </p>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>

        <PinnableCard elementKey="pricing_avg_cost" elementName="Avg Product Cost" category="Analytics Hub - Pricing">
          <Card className="relative">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                    Avg Product Cost
                  </p>
                  <MetricInfoTooltip description="Average product cost per service calculated from recipe baselines. Used as the cost basis for margin recommendations." className="w-3 h-3" />
                </div>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>
                  <BlurredAmount>${kpis.avgProductCost.toFixed(2)}</BlurredAmount>
                </p>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      </div>

      {/* Margin Distribution Chart */}
      {marginChartData.length > 0 && (
        <PinnableCard elementKey="pricing_margin_distribution" elementName="Margin Distribution" category="Analytics Hub - Pricing">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card?.iconBox || 'w-10 h-10 bg-muted rounded-lg flex items-center justify-center'}>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle className={tokens.card?.title || 'font-display text-base tracking-wide'}>
                      Margin Distribution
                    </CardTitle>
                    <MetricInfoTooltip description="Current margin percentage for each tracked chemical service. The dashed line represents the default target margin. Services below the line need repricing." />
                  </div>
                </div>
                <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marginChartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Current Margin']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <ReferenceLine
                      y={defaultMargin}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="6 4"
                      label={{ value: `Target ${defaultMargin}%`, position: 'right', fontSize: 11, fill: 'hsl(var(--primary))' }}
                    />
                    <Bar
                      dataKey="margin"
                      radius={[4, 4, 0, 0]}
                      fill="hsl(var(--primary))"
                    >
                      {marginChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.isBelowTarget ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                          fillOpacity={entry.isBelowTarget ? 0.8 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* Two-column layout: At-Risk Services + Margin Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top At-Risk Services */}
        <PinnableCard elementKey="pricing_at_risk" elementName="At-Risk Services" category="Analytics Hub - Pricing">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={tokens.card?.iconBox || 'w-10 h-10 bg-muted rounded-lg flex items-center justify-center'}>
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card?.title || 'font-display text-base tracking-wide'}>
                    Top At-Risk Services
                  </CardTitle>
                  <MetricInfoTooltip description="The 5 tracked services with the largest gap between current and target margin. These represent the highest priority for repricing." />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {atRiskServices.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground font-sans">
                  All services are meeting their target margins
                </div>
              ) : (
                <div className="space-y-3">
                  {atRiskServices.map((r) => (
                    <div key={r.service_id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div>
                        <p className="font-sans text-sm text-foreground">{r.service_name}</p>
                        <p className="font-sans text-xs text-muted-foreground">
                          {r.current_margin_pct.toFixed(1)}% → {r.target_margin_pct}% target
                        </p>
                      </div>
                      <Badge variant="outline" className="font-sans text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                        -{(r.target_margin_pct - r.current_margin_pct).toFixed(1)}% gap
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </PinnableCard>

        {/* Margin Trend Over Time */}
        <PinnableCard elementKey="pricing_margin_trend" elementName="Margin Trend" category="Analytics Hub - Pricing">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={tokens.card?.iconBox || 'w-10 h-10 bg-muted rounded-lg flex items-center justify-center'}>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card?.title || 'font-display text-base tracking-wide'}>
                    Margin Health Over Time
                  </CardTitle>
                  <MetricInfoTooltip description="Weekly average contribution margin across all tracked chemical services. Shows the impact of accepted price changes over time." />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {marginTrendData.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground font-sans">
                  Not enough historical data yet — trend will appear after profitability snapshots accumulate.
                </div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={marginTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Avg Margin']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <ReferenceLine
                        y={defaultMargin}
                        stroke="hsl(var(--primary))"
                        strokeDasharray="6 4"
                      />
                      <Line
                        type="monotone"
                        dataKey="margin"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </PinnableCard>
      </div>

      {/* CTA Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="font-display text-sm tracking-wide uppercase text-foreground">
              Full Price Intelligence
            </p>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              View detailed recommendations, accept price changes, and manage per-service targets.
            </p>
          </div>
          <Button
            className="font-sans gap-1"
            onClick={() => navigate(dashPath('/admin/color-bar-settings?section=price-intelligence'))}
          >
            Open Price Intelligence <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
