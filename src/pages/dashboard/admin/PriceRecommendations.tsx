/**
 * PriceRecommendations — Dedicated Price Intelligence page.
 * Shows all tracked chemical services with margin analysis and one-click price updates.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, DollarSign, AlertTriangle, TrendingUp, Settings2, Download, History } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { LocationSelect } from '@/components/ui/location-select';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { PriceRecommendationsTable } from '@/components/dashboard/color-bar-settings/PriceRecommendationsTable';
import { PriceRecommendationHistory } from '@/components/dashboard/color-bar-settings/PriceRecommendationHistory';
import { BulkPriceAcceptConfirmDialog } from '@/components/dashboard/color-bar-settings/PriceAcceptConfirmDialog';
import {
  useComputedPriceRecommendations,
  useAcceptPriceRecommendation,
  useDismissPriceRecommendation,
  useUpsertPriceTarget,
  useDefaultTargetMargin,
  useUpdateDefaultTargetMargin,
} from '@/hooks/color-bar/useServicePriceRecommendations';
import { useServiceProfitabilitySnapshots } from '@/hooks/color-bar/useServiceProfitability';
import { toast } from 'sonner';

export function PriceRecommendationsContent() {
  const { dashPath } = useOrgDashboardPath();
  const { data: recommendations, isLoading } = useComputedPriceRecommendations();
  const acceptMutation = useAcceptPriceRecommendation();
  const dismissMutation = useDismissPriceRecommendation();
  const upsertTarget = useUpsertPriceTarget();
  const { margin: defaultMargin } = useDefaultTargetMargin();
  const updateDefaultMargin = useUpdateDefaultTargetMargin();
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);
  const [editingDefault, setEditingDefault] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [locationId, setLocationId] = useState('all');

  // Historical margin trend
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  }, []);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: snapshots } = useServiceProfitabilitySnapshots(
    ninetyDaysAgo, today,
    locationId !== 'all' ? locationId : undefined,
  );

  const marginTrendData = useMemo(() => {
    if (!snapshots?.length) return [];
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

  const kpis = useMemo(() => {
    if (!recommendations?.length) return { belowTarget: 0, avgGap: 0, totalImpact: 0, weightedImpact: 0, hasVolume: false };
    const below = recommendations.filter(r => r.is_below_target);
    const avgGap = below.length > 0
      ? below.reduce((sum, r) => sum + (r.target_margin_pct - r.current_margin_pct), 0) / below.length
      : 0;
    const totalImpact = below.reduce((sum, r) => sum + r.price_delta, 0);
    const weightedImpact = below.reduce((sum, r) => sum + (r.weighted_impact ?? r.price_delta), 0);
    const hasVolume = below.some(r => r.monthly_volume && r.monthly_volume > 0);
    return {
      belowTarget: below.length,
      avgGap: Math.round(avgGap * 10) / 10,
      totalImpact: Math.round(totalImpact * 100) / 100,
      weightedImpact: Math.round(weightedImpact * 100) / 100,
      hasVolume,
    };
  }, [recommendations]);

  const handleAcceptAll = async () => {
    const below = recommendations?.filter(r => r.is_below_target) || [];
    setIsBulkAccepting(true);
    try {
      const results = await Promise.allSettled(
        below.map(rec => acceptMutation.mutateAsync(rec))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed === 0) {
        toast.success(`All ${succeeded} prices updated successfully`);
      } else {
        toast.warning(`${succeeded} of ${below.length} updated. ${failed} failed — review and retry.`);
      }
    } finally {
      setIsBulkAccepting(false);
    }
  };

  const saveDefaultMargin = () => {
    const val = parseFloat(defaultValue);
    if (val > 0 && val < 100) {
      updateDefaultMargin.mutate(val);
    }
    setEditingDefault(false);
  };

  const isAccepting = acceptMutation.isPending || isBulkAccepting;

  const exportCSV = () => {
    if (!recommendations?.length) return;
    const headers = ['Service', 'Category', 'Product Cost', 'Current Price', 'Current Margin %', 'Target Margin %', 'Recommended Price', 'Delta', 'Delta %', 'Volume/mo'];
    const rows = recommendations.map(r => [
      r.service_name, r.category || '', r.product_cost.toFixed(2), r.current_price.toFixed(2),
      r.current_margin_pct.toFixed(1), r.target_margin_pct.toFixed(0), r.recommended_price.toFixed(2),
      r.price_delta.toFixed(2), r.price_delta_pct.toFixed(1), r.monthly_volume || 0,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-recommendations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {recommendations?.length ? (
            <Button
              variant="outline"
              size={tokens.button.card}
              className="gap-1"
              onClick={exportCSV}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          ) : null}
          {kpis.belowTarget > 0 ? (
            <BulkPriceAcceptConfirmDialog
              count={kpis.belowTarget}
              totalImpact={kpis.totalImpact}
              onConfirm={handleAcceptAll}
            >
              <Button
                size={tokens.button.page}
                disabled={isAccepting}
              >
                {isBulkAccepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Applying…
                  </>
                ) : (
                  `Accept All (${kpis.belowTarget})`
                )}
              </Button>
            </BulkPriceAcceptConfirmDialog>
          ) : null}
        </div>
      </div>

      {/* Location Filter */}
      <div className={tokens.layout.filterRow}>
        <LocationSelect
          value={locationId}
          onValueChange={setLocationId}
          includeAll
          allLabel="All Locations"
          triggerClassName="w-[220px]"
        />
      </div>

      {/* KPI Strip */}
      <PinnableCard
        elementKey="price-intel-kpi-strip"
        elementName="Pricing KPI Strip"
        category="Price Intelligence"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Below Target */}
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <MetricInfoTooltip
              description="Number of tracked chemical services whose current margin falls below their configured target margin percentage."
              className={cn('w-3 h-3', tokens.kpi.infoIcon)}
            />
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <AlertTriangle className={tokens.card.icon} />
              </div>
              <div>
                <p className={tokens.kpi.label}>Below Target</p>
                <p className={tokens.kpi.value}>{kpis.belowTarget}</p>
              </div>
            </div>
          </div>

          {/* Avg Margin Gap */}
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <MetricInfoTooltip
              description="Average percentage-point difference between target margin and actual margin for services currently below target."
              className={cn('w-3 h-3', tokens.kpi.infoIcon)}
            />
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <TrendingUp className={tokens.card.icon} />
              </div>
              <div>
                <p className={tokens.kpi.label}>Avg Margin Gap</p>
                <p className={tokens.kpi.value}>{kpis.avgGap}%</p>
              </div>
            </div>
          </div>

          {/* Revenue Impact */}
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <MetricInfoTooltip
              description="Estimated additional monthly revenue if all below-target services are repriced to their target margin. Weighted by 30-day appointment volume when available."
              className={cn('w-3 h-3', tokens.kpi.infoIcon)}
            />
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <DollarSign className={tokens.card.icon} />
              </div>
              <div>
                <p className={tokens.kpi.label}>
                  {kpis.hasVolume ? 'Monthly Revenue Impact' : 'Revenue Impact'}
                </p>
                <p className={tokens.kpi.value}>
                  {kpis.weightedImpact >= 0 ? '+' : ''}${kpis.weightedImpact.toFixed(2)}
                </p>
                {kpis.hasVolume && (
                  <p className="text-[10px] text-muted-foreground font-sans">Weighted by 30-day volume</p>
                )}
              </div>
            </div>
          </div>

          {/* Default Target */}
          <div className={cn(tokens.kpi.tile, 'relative')}>
            <MetricInfoTooltip
              description="Organization-wide default target margin. Used for services that don't have a per-service override. Click the value to edit."
              className={cn('w-3 h-3', tokens.kpi.infoIcon)}
            />
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Settings2 className={tokens.card.icon} />
              </div>
              <div>
                <p className={tokens.kpi.label}>Default Target</p>
                {editingDefault ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={defaultValue}
                      onChange={(e) => setDefaultValue(e.target.value)}
                      className="w-16 h-8 text-sm text-right"
                      min={1}
                      max={99}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveDefaultMargin();
                        if (e.key === 'Escape') setEditingDefault(false);
                      }}
                      onBlur={saveDefaultMargin}
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingDefault(true); setDefaultValue(String(defaultMargin)); }}
                    className={cn(tokens.kpi.value, 'hover:text-primary transition-colors cursor-pointer')}
                  >
                    {defaultMargin}%
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </PinnableCard>

      {/* Main Table */}
      <PinnableCard
        elementKey="price-intel-recommendations"
        elementName="Service Price Recommendations"
        category="Price Intelligence"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <DollarSign className={tokens.card.icon} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className={tokens.card.title}>
                      Service Price Recommendations
                    </CardTitle>
                    <MetricInfoTooltip description="Recommendations are computed from the product cost in each service's recipe baseline divided by your target margin. Accepting a recommendation updates the base price and proportionally scales all level and location pricing tiers." />
                  </div>
                  <CardDescription className={tokens.body.muted}>
                    Based on product costs from recipe baselines and your target margins
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : !recommendations?.length ? (
              <div className={tokens.empty.container}>
                <DollarSign className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>
                  No recommendations available
                </h3>
                 <p className={tokens.empty.description}>
                   <Link
                     to={dashPath('/admin/color-bar-settings?section=formulas')}
                     className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                   >
                     Set up recipe baselines
                   </Link>
                   {' '}on tracked services to generate price recommendations.
                 </p>
              </div>
            ) : (
              <PriceRecommendationsTable
                recommendations={recommendations}
                onAccept={(rec) => acceptMutation.mutate(rec)}
                onDismiss={(rec) => dismissMutation.mutate(rec)}
                onUpdateTarget={(serviceId, margin) => upsertTarget.mutate({ service_id: serviceId, target_margin_pct: margin })}
                isAccepting={isAccepting}
              />
            )}
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Margin Health Over Time */}
      {marginTrendData.length >= 2 && (
        <PinnableCard
          elementKey="price-intel-margin-trend"
          elementName="Margin Health Over Time"
          category="Price Intelligence"
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <TrendingUp className={tokens.card.icon} />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>
                    Margin Health Over Time
                  </CardTitle>
                  <MetricInfoTooltip description="Weekly average contribution margin across tracked chemical services from profitability snapshots. Shows the impact of accepted price changes over time." />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marginTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
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
                      label={{ value: `Target ${defaultMargin}%`, position: 'right', fontSize: 11, fill: 'hsl(var(--primary))' }}
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
            </CardContent>
          </Card>
        </PinnableCard>
      )}

      {/* History Section */}
      <PinnableCard
        elementKey="price-intel-history"
        elementName="Price Action History"
        category="Price Intelligence"
      >
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <History className={tokens.card.icon} />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>
                  Price Action History
                </CardTitle>
                <MetricInfoTooltip description="Audit log of accepted, dismissed, and reverted price recommendations. Shows the last 20 actions with revert capability within 24 hours." />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <PriceRecommendationHistory />
          </CardContent>
        </Card>
      </PinnableCard>
    </div>
  );
}

/** @deprecated Redirects to color bar hub. Kept for route compatibility. */
export default function PriceRecommendationsPage() {
  return null;
}
