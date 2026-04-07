/**
 * CommissionEconomicsTab — Interactive margin calculator for commission levels.
 * Answers: "Can I afford this commission rate at each level?"
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { getLevelColor } from '@/lib/level-colors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency as formatCurrencyUnified } from '@/lib/format';
import { 
  Calculator, 
  ChevronDown, 
  Save, 
  SlidersHorizontal, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { StylistLevel } from '@/hooks/useStylistLevels';
import {
  useEconomicsAssumptions,
  useSaveEconomicsAssumptions,
  useRevenueByLevel,
  computeEconomics,
  computeMarginAtRevenue,
  type EconomicsAssumptions,
  type AICommissionOptimizerResult,
  type AICommissionRecommendation,
} from '@/hooks/useCommissionEconomics';
import { useAutoDetectEconomics } from '@/hooks/useAutoDetectEconomics';
import { BENCHMARKS } from '@/hooks/useAutoDetectEconomics';
import { EconomicsSmartDefaults, EconomicsDataBanner } from './EconomicsSmartDefaults';

interface CommissionEconomicsTabProps {
  levels: StylistLevel[];
}

type MarginStatus = 'healthy' | 'tight' | 'negative';

function getMarginStatus(marginPct: number, targetPct: number): MarginStatus {
  if (marginPct >= targetPct) return 'healthy';
  if (marginPct >= 0) return 'tight';
  return 'negative';
}

const STATUS_CONFIG: Record<MarginStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'On Target', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  tight: { label: 'Tight Margin', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: AlertTriangle },
  negative: { label: 'Negative', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: AlertTriangle },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: 'High Confidence', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  medium: { label: 'Medium Confidence', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low: { label: 'Low Confidence', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function formatCurrencyLocal(val: number): string {
  return formatCurrencyUnified(val, { noCents: true }) ?? '—';
}

function formatPct(val: number): string {
  if (!isFinite(val)) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

function getLevelDotColor(idx: number, total: number): string {
  const levelColor = getLevelColor(idx, total);
  if (levelColor.bg.includes('amber-500')) return '#f59e0b';
  if (levelColor.bg.includes('amber-300')) return '#fcd34d';
  if (levelColor.bg.includes('amber-200')) return '#fde68a';
  if (levelColor.bg.includes('amber-100')) return '#fef3c7';
  return '#a1a1aa';
}

export function CommissionEconomicsTab({ levels }: CommissionEconomicsTabProps) {
  const { assumptions, hasCustomAssumptions, isLoading: loadingAssumptions } = useEconomicsAssumptions();
  const { save: saveAssumptions, isPending: isSaving } = useSaveEconomicsAssumptions();
  const { data: revenueData, isLoading: loadingRevenue } = useRevenueByLevel();
  const { data: detection, isLoading: loadingDetection } = useAutoDetectEconomics();
  const [showReconfigure, setShowReconfigure] = useState(false);

  // Local editable assumptions
  const [localAssumptions, setLocalAssumptions] = useState<EconomicsAssumptions | null>(null);
  const effectiveAssumptions = localAssumptions ?? assumptions;

  // What-if overrides (keyed by level.id → { service, retail })
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfRates, setWhatIfRates] = useState<Record<string, { service?: number; retail?: number }>>({});

  // AI optimizer state
  const [aiResult, setAiResult] = useState<AICommissionOptimizerResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const revenueMap = useMemo(() => {
    const map = new Map<string, { avg: number; count: number }>();
    revenueData?.forEach(r => map.set(r.level_id, { avg: r.avg_monthly_revenue, count: r.stylist_count }));
    return map;
  }, [revenueData]);

  const handleAssumptionChange = useCallback((field: keyof EconomicsAssumptions, value: number) => {
    let clamped = value;
    if (field === 'overhead_per_stylist') {
      clamped = Math.max(0, value);
    } else if (field === 'hours_per_month') {
      clamped = Math.max(0, Math.min(300, value));
    } else {
      // Percentage fields: clamp 0–1
      clamped = Math.min(1, Math.max(0, value));
    }
    setLocalAssumptions(prev => ({
      ...(prev ?? assumptions),
      [field]: clamped,
    }));
  }, [assumptions]);

  const handleSaveAssumptions = () => {
    saveAssumptions(effectiveAssumptions);
    setLocalAssumptions(null);
    toast.success('Assumptions saved');
  };

  const hasUnsavedChanges = localAssumptions !== null;

  // AI optimizer
  const handleOptimize = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-commission-optimizer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            levels: levels.map(l => ({
              id: l.id,
              slug: l.slug,
              label: l.label,
              service_commission_rate: l.service_commission_rate,
              retail_commission_rate: l.retail_commission_rate,
              hourly_wage_enabled: l.hourly_wage_enabled,
              hourly_wage: l.hourly_wage,
            })),
            assumptions: effectiveAssumptions,
            revenueByLevel: revenueData || [],
          }),
        }
      );

      if (response.status === 429) throw new Error('Rate limit exceeded — please wait before retrying');
      if (response.status === 402) throw new Error('AI credits exhausted');
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate recommendations');
      }

      const data = await response.json();
      setAiResult(data as AICommissionOptimizerResult);
    } catch (err: any) {
      console.error('AI optimizer error:', err);
      toast.error(err.message || 'Failed to generate recommendations');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI recommendations to What-If
  const handleApplyToWhatIf = () => {
    if (!aiResult) return;
    const newRates: Record<string, { service?: number; retail?: number }> = {};
    for (const rec of aiResult.recommendations) {
      const level = levels.find(l => l.slug === rec.level_slug);
      if (!level) continue;
      newRates[level.id] = {
        service: rec.recommended_service_rate,
        retail: rec.recommended_retail_rate,
      };
    }
    setWhatIfRates(newRates);
    setWhatIfOpen(true);
    toast.success('AI recommendations applied to What-If simulator');
  };

  if (loadingAssumptions || loadingRevenue || loadingDetection) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Calculator className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No levels configured</h3>
        <p className={tokens.empty.description}>Add levels first to model commission economics</p>
      </div>
    );
  }

  // First-time or reconfigure mode: show smart defaults
  if ((!hasCustomAssumptions || showReconfigure) && detection) {
    return (
      <div className="space-y-6 pt-4">
        <EconomicsSmartDefaults
          detection={detection}
          onAccept={(vals) => {
            saveAssumptions(vals);
            setShowReconfigure(false);
          }}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Data comparison banner for returning users */}
      {detection && hasCustomAssumptions && (
        <EconomicsDataBanner
          detection={detection}
          savedAssumptions={assumptions}
          onUpdate={(key, value) => {
            const updated = { ...assumptions, [key]: value };
            saveAssumptions(updated);
          }}
          onReconfigure={() => setShowReconfigure(true)}
        />
      )}

      {/* Assumptions panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>BUSINESS ASSUMPTIONS</CardTitle>
                <CardDescription>Configure your cost structure to model margin impact</CardDescription>
              </div>
            </div>
            {hasUnsavedChanges && (
              <Button size={tokens.button.card} onClick={handleSaveAssumptions} disabled={isSaving} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                Save
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Monthly Overhead / Stylist</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={effectiveAssumptions.overhead_per_stylist}
                  onChange={e => handleAssumptionChange('overhead_per_stylist', Number(e.target.value))}
                  className="pl-7"
                  min={0}
                  step={100}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Rent, utilities, insurance per stylist</p>
              <p className="text-[10px] text-muted-foreground/40">{BENCHMARKS.overhead_per_stylist.label}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Product Cost %</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={Math.round(effectiveAssumptions.product_cost_pct * 100)}
                  onChange={e => handleAssumptionChange('product_cost_pct', Number(e.target.value) / 100)}
                  className="pr-7"
                  min={0}
                  max={100}
                  step={1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Chemical + backbar cost as % of revenue</p>
              <p className="text-[10px] text-muted-foreground/40">{BENCHMARKS.product_cost_pct.label}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Target Margin %</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={Math.round(effectiveAssumptions.target_margin_pct * 100)}
                  onChange={e => handleAssumptionChange('target_margin_pct', Number(e.target.value) / 100)}
                  className="pr-7"
                  min={0}
                  max={100}
                  step={1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Desired profit margin after all costs</p>
              <p className="text-[10px] text-muted-foreground/40">{BENCHMARKS.target_margin_pct.label}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hours / Month</Label>
              <Input
                type="number"
                value={effectiveAssumptions.hours_per_month}
                onChange={e => handleAssumptionChange('hours_per_month', Number(e.target.value))}
                min={0}
                max={300}
                step={8}
              />
              <p className="text-[10px] text-muted-foreground">Avg hours per stylist for hourly wage modeling</p>
              <p className="text-[10px] text-muted-foreground/40">{BENCHMARKS.hours_per_month.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Economics table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>MARGIN BY LEVEL</CardTitle>
                <CardDescription>Revenue required to sustain each commission level</CardDescription>
              </div>
            </div>
            <Button
              onClick={handleOptimize}
              disabled={aiLoading}
              className="h-9 px-4 rounded-full gap-1.5"
              variant="outline"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {aiLoading ? 'Analyzing...' : 'Optimize with Zura'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Level</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Service %</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Retail %</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Hourly Wage</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Breakeven Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Target Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Actual Avg Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Margin</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level, idx) => {
                  const serviceRate = whatIfRates[level.id]?.service ?? (level.service_commission_rate ?? 0);
                  const retailRate = whatIfRates[level.id]?.retail ?? (level.retail_commission_rate ?? 0);
                  // Compute hourly wage cost using configurable hours_per_month
                  const hourlyWageCost = level.hourly_wage_enabled && level.hourly_wage
                    ? level.hourly_wage * effectiveAssumptions.hours_per_month
                    : 0;
                  const { breakevenRevenue, targetRevenue } = computeEconomics(serviceRate, effectiveAssumptions, retailRate, hourlyWageCost);
                  const revData = revenueMap.get(level.id);
                  const actualRevenue = revData?.avg ?? 0;
                  const actualMargin = actualRevenue > 0
                    ? computeMarginAtRevenue(actualRevenue, serviceRate, effectiveAssumptions, retailRate, hourlyWageCost)
                    : null;
                  const status = actualMargin !== null
                    ? getMarginStatus(actualMargin, effectiveAssumptions.target_margin_pct)
                    : null;
                  const dotColor = getLevelDotColor(idx, levels.length);
                  const hasWhatIf = whatIfRates[level.id] !== undefined;

                  return (
                    <TableRow key={level.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span className="text-sm text-foreground">{level.label}</span>
                          {revData && (
                            <span className="text-[10px] text-muted-foreground">({revData.count})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <span className={hasWhatIf ? 'text-primary' : ''}>
                          {(serviceRate * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <span className={hasWhatIf ? 'text-primary' : ''}>
                          {(retailRate * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {level.hourly_wage_enabled && level.hourly_wage ? (
                          <BlurredAmount>${level.hourly_wage}/hr</BlurredAmount>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <BlurredAmount>{formatCurrencyLocal(breakevenRevenue)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <BlurredAmount>{formatCurrencyLocal(targetRevenue)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {actualRevenue > 0 ? (
                          <BlurredAmount>{formatCurrencyLocal(actualRevenue)}</BlurredAmount>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {actualMargin !== null ? (
                          <BlurredAmount>
                            <span className={cn(
                              actualMargin >= effectiveAssumptions.target_margin_pct
                                ? 'text-emerald-600'
                                : actualMargin >= 0
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            )}>
                              {formatPct(actualMargin)}
                            </span>
                          </BlurredAmount>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {status ? (
                          <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[status].className)}>
                            {STATUS_CONFIG[status].label}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No data</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground/60">
            <Info className="w-3 h-3" />
            Monthly average revenue per stylist from trailing 90 days. Stylist count in parentheses.
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {aiResult && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(tokens.card.iconBox, 'bg-primary/10')}>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className={tokens.card.title}>ZURA RECOMMENDATIONS</CardTitle>
                  <CardDescription>{aiResult.summary}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-xs', CONFIDENCE_CONFIG[aiResult.confidence]?.className)}>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {CONFIDENCE_CONFIG[aiResult.confidence]?.label}
                </Badge>
                <Button
                  onClick={handleApplyToWhatIf}
                  className="h-9 px-4 rounded-full gap-1.5"
                  variant="outline"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Apply to What-If
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiResult.recommendations.map((rec) => {
                const level = levels.find(l => l.slug === rec.level_slug);
                if (!level) return null;
                const idx = levels.indexOf(level);
                const dotColor = getLevelDotColor(idx, levels.length);
                const serviceChanged = Math.abs(rec.recommended_service_rate - rec.current_service_rate) > 0.005;
                const retailChanged = Math.abs(rec.recommended_retail_rate - rec.current_retail_rate) > 0.005;
                const hasChange = serviceChanged || retailChanged;

                return (
                  <div
                    key={rec.level_slug}
                    className={cn(
                      'flex items-start gap-4 p-3 rounded-lg border',
                      hasChange ? 'bg-primary/[0.02] border-primary/10' : 'bg-muted/30 border-border/40'
                    )}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-foreground">{level.label}</span>
                        {hasChange && (
                          <div className="flex items-center gap-2 text-xs">
                            {serviceChanged && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                Svc {formatPct(rec.current_service_rate)}
                                <ArrowRight className="w-3 h-3 text-primary" />
                                <span className="text-primary">{formatPct(rec.recommended_service_rate)}</span>
                              </span>
                            )}
                            {retailChanged && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                Ret {formatPct(rec.current_retail_rate)}
                                <ArrowRight className="w-3 h-3 text-primary" />
                                <span className="text-primary">{formatPct(rec.recommended_retail_rate)}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {!hasChange && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> No change needed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
                      {rec.projected_margin_at_current_revenue !== 0 && (
                        <span className="text-[10px] text-muted-foreground/60 mt-1 inline-block">
                          Projected margin: {formatPct(rec.projected_margin_at_current_revenue)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What-If Simulator */}
      <Collapsible open={whatIfOpen} onOpenChange={setWhatIfOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>WHAT-IF SIMULATOR</CardTitle>
                    <CardDescription>Drag commission rates to see real-time margin impact</CardDescription>
                  </div>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', whatIfOpen && 'rotate-180')} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {levels.map((level, idx) => {
                const baseServiceRate = level.service_commission_rate ?? 0;
                const baseRetailRate = level.retail_commission_rate ?? 0;
                const currentServiceRate = whatIfRates[level.id]?.service ?? baseServiceRate;
                const currentRetailRate = whatIfRates[level.id]?.retail ?? baseRetailRate;
                const { targetRevenue } = computeEconomics(currentServiceRate, effectiveAssumptions, currentRetailRate);
                const dotColor = getLevelDotColor(idx, levels.length);
                const isModified = whatIfRates[level.id] !== undefined;

                return (
                  <div key={level.id} className="space-y-2 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                      <span className="text-sm">{level.label}</span>
                      <div className="ml-auto text-sm">
                        <BlurredAmount>{formatCurrencyLocal(targetRevenue)}</BlurredAmount>
                        <span className="text-[10px] text-muted-foreground ml-1">target</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-muted-foreground w-6 shrink-0">Svc</span>
                      <div className="flex-1">
                        <Slider
                          variant="filled"
                          value={[currentServiceRate * 100]}
                          min={20}
                          max={65}
                          step={1}
                          onValueChange={([v]) => {
                            const newRate = v / 100;
                            const sameAsBase = Math.abs(newRate - baseServiceRate) < 0.005;
                            const retailSame = whatIfRates[level.id]?.retail === undefined;
                            if (sameAsBase && retailSame) {
                              setWhatIfRates(prev => {
                                const next = { ...prev };
                                delete next[level.id];
                                return next;
                              });
                            } else {
                              setWhatIfRates(prev => ({
                                ...prev,
                                [level.id]: { ...prev[level.id], service: sameAsBase ? undefined : newRate },
                              }));
                            }
                          }}
                        />
                      </div>
                      <span className={cn('w-12 text-sm text-right tabular-nums', isModified && 'text-primary')}>
                        {(currentServiceRate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-muted-foreground w-6 shrink-0">Ret</span>
                      <div className="flex-1">
                        <Slider
                          variant="filled"
                          value={[currentRetailRate * 100]}
                          min={0}
                          max={30}
                          step={1}
                          onValueChange={([v]) => {
                            const newRate = v / 100;
                            const sameAsBase = Math.abs(newRate - baseRetailRate) < 0.005;
                            const serviceSame = whatIfRates[level.id]?.service === undefined;
                            if (sameAsBase && serviceSame) {
                              setWhatIfRates(prev => {
                                const next = { ...prev };
                                delete next[level.id];
                                return next;
                              });
                            } else {
                              setWhatIfRates(prev => ({
                                ...prev,
                                [level.id]: { ...prev[level.id], retail: sameAsBase ? undefined : newRate },
                              }));
                            }
                          }}
                        />
                      </div>
                      <span className={cn('w-12 text-sm text-right tabular-nums', isModified && 'text-primary')}>
                        {(currentRetailRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(whatIfRates).length > 0 && (
                <Button
                  variant="ghost"
                  size={tokens.button.card}
                  onClick={() => setWhatIfRates({})}
                  className="text-muted-foreground"
                >
                  Reset all to current rates
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
