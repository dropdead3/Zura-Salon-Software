/**
 * PriceRecommendations — Dedicated Price Intelligence page.
 * Shows all tracked chemical services with margin analysis and one-click price updates.
 */
import React, { useMemo, useState } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, DollarSign, AlertTriangle, TrendingUp, Settings2, Download } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { LocationSelect } from '@/components/ui/location-select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { PriceRecommendationsTable } from '@/components/dashboard/backroom-settings/PriceRecommendationsTable';
import { PriceRecommendationHistory } from '@/components/dashboard/backroom-settings/PriceRecommendationHistory';
import { BulkPriceAcceptConfirmDialog } from '@/components/dashboard/backroom-settings/PriceAcceptConfirmDialog';
import {
  useComputedPriceRecommendations,
  useAcceptPriceRecommendation,
  useDismissPriceRecommendation,
  useUpsertPriceTarget,
  useDefaultTargetMargin,
  useUpdateDefaultTargetMargin,
} from '@/hooks/backroom/useServicePriceRecommendations';
import { useServiceProfitabilitySnapshots } from '@/hooks/backroom/useServiceProfitability';
import { toast } from 'sonner';

export default function PriceRecommendationsPage() {
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
    <DashboardLayout>
      <div className="container max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <DashboardPageHeader
          title="Price Intelligence"
          backTo={dashPath('/admin/backroom-settings')}
          backLabel="Back to Backroom"
          actions={
            <div className="flex items-center gap-2">
              {recommendations?.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 font-sans"
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
                    disabled={isAccepting}
                    className={tokens.button?.page || 'h-10 px-6'}
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
          }
        />

        {/* Location Filter */}
        <div className="flex items-center gap-3">
          <LocationSelect
            value={locationId}
            onValueChange={setLocationId}
            includeAll
            allLabel="All Locations"
            triggerClassName="w-[220px]"
          />
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                    Below Target
                  </p>
                  <MetricInfoTooltip description="Number of tracked chemical services whose current margin falls below their configured target margin percentage." className="w-3 h-3" />
                </div>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>{kpis.belowTarget}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                    Avg Margin Gap
                  </p>
                  <MetricInfoTooltip description="Average percentage-point difference between target margin and actual margin for services currently below target." className="w-3 h-3" />
                </div>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>{kpis.avgGap}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                  {kpis.hasVolume ? 'Monthly Revenue Impact' : 'Revenue Impact'}
                </p>
                <p className={tokens.stat?.large || 'font-display text-2xl font-medium'}>
                  {kpis.weightedImpact >= 0 ? '+' : ''}${kpis.weightedImpact.toFixed(2)}
                </p>
                {kpis.hasVolume && (
                  <p className="text-[10px] text-muted-foreground font-sans">Weighted by 30-day volume</p>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Default Margin Setting */}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={cn(tokens.kpi?.label || 'font-display text-[10px] tracking-wider uppercase', 'text-muted-foreground')}>
                  Default Target
                </p>
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
                    className={cn(tokens.stat?.large || 'font-display text-2xl font-medium', 'hover:text-primary transition-colors cursor-pointer')}
                  >
                    {defaultMargin}%
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={tokens.card?.iconBox || 'w-10 h-10 bg-muted rounded-lg flex items-center justify-center'}>
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className={tokens.card?.title || tokens.heading?.card || 'font-display text-base tracking-wide'}>
                    Service Price Recommendations
                  </CardTitle>
                  <CardDescription className="font-sans text-sm text-muted-foreground">
                    Based on product costs from recipe baselines and your target margins
                  </CardDescription>
                </div>
                <MetricInfoTooltip description="Recommendations are computed from the product cost in each service's recipe baseline divided by your target margin. Accepting a recommendation updates the base price and proportionally scales all level and location pricing tiers." />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className={tokens.loading?.spinner || 'h-8 w-8 animate-spin text-primary'} />
              </div>
            ) : !recommendations?.length ? (
              <div className={tokens.empty?.container || 'flex flex-col items-center justify-center py-12 text-center'}>
                <DollarSign className={tokens.empty?.icon || 'w-12 h-12 text-muted-foreground/40 mb-3'} />
                <h3 className={tokens.empty?.heading || 'font-sans text-base font-medium text-muted-foreground'}>
                  No recommendations available
                </h3>
                <p className={tokens.empty?.description || 'font-sans text-sm text-muted-foreground/70 mt-1'}>
                  Set up recipe baselines on tracked services to generate price recommendations.
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

        {/* History Section */}
        <Card>
          <CardContent className="p-2">
            <PriceRecommendationHistory />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
