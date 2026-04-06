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
} from 'lucide-react';
import type { StylistLevel } from '@/hooks/useStylistLevels';
import {
  useEconomicsAssumptions,
  useSaveEconomicsAssumptions,
  useRevenueByLevel,
  computeEconomics,
  computeMarginAtRevenue,
  type EconomicsAssumptions,
} from '@/hooks/useCommissionEconomics';

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

function formatCurrency(val: number): string {
  if (!isFinite(val)) return '—';
  return `$${Math.round(val).toLocaleString()}`;
}

function formatPct(val: number): string {
  if (!isFinite(val)) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

export function CommissionEconomicsTab({ levels }: CommissionEconomicsTabProps) {
  const { assumptions, isLoading: loadingAssumptions } = useEconomicsAssumptions();
  const { save: saveAssumptions, isPending: isSaving } = useSaveEconomicsAssumptions();
  const { data: revenueData, isLoading: loadingRevenue } = useRevenueByLevel();

  // Local editable assumptions
  const [localAssumptions, setLocalAssumptions] = useState<EconomicsAssumptions | null>(null);
  const effectiveAssumptions = localAssumptions ?? assumptions;

  // What-if overrides
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfRates, setWhatIfRates] = useState<Record<string, number>>({});

  const revenueMap = useMemo(() => {
    const map = new Map<string, { avg: number; count: number }>();
    revenueData?.forEach(r => map.set(r.level_id, { avg: r.avg_monthly_revenue, count: r.stylist_count }));
    return map;
  }, [revenueData]);

  const handleAssumptionChange = useCallback((field: keyof EconomicsAssumptions, value: number) => {
    setLocalAssumptions(prev => ({
      ...(prev ?? assumptions),
      [field]: value,
    }));
  }, [assumptions]);

  const handleSaveAssumptions = () => {
    saveAssumptions(effectiveAssumptions);
    setLocalAssumptions(null);
  };

  const hasUnsavedChanges = localAssumptions !== null;

  if (loadingAssumptions || loadingRevenue) {
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

  return (
    <div className="space-y-6 pt-4">
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
          <div className="grid grid-cols-3 gap-6">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Economics table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>MARGIN BY LEVEL</CardTitle>
              <CardDescription>Revenue required to sustain each commission level</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Level</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Service %</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Breakeven Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Target Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Actual Avg Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Margin</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level, idx) => {
                  const commissionRate = whatIfRates[level.id] ?? (level.service_commission_rate ?? 0);
                  const { breakevenRevenue, targetRevenue } = computeEconomics(commissionRate, effectiveAssumptions);
                  const revData = revenueMap.get(level.id);
                  const actualRevenue = revData?.avg ?? 0;
                  const actualMargin = actualRevenue > 0
                    ? computeMarginAtRevenue(actualRevenue, commissionRate, effectiveAssumptions)
                    : null;
                  const status = actualMargin !== null
                    ? getMarginStatus(actualMargin, effectiveAssumptions.target_margin_pct)
                    : null;
                  const levelColor = getLevelColor(idx, levels.length);
                  const dotColor = levelColor.bg.includes('amber-500') ? '#f59e0b' : levelColor.bg.includes('amber-300') ? '#fcd34d' : levelColor.bg.includes('amber-200') ? '#fde68a' : levelColor.bg.includes('amber-100') ? '#fef3c7' : '#a1a1aa';

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
                        {whatIfRates[level.id] !== undefined ? (
                          <span className="text-primary">{(commissionRate * 100).toFixed(0)}%</span>
                        ) : (
                          <span>{(commissionRate * 100).toFixed(0)}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <BlurredAmount>{formatCurrency(breakevenRevenue)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <BlurredAmount>{formatCurrency(targetRevenue)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {actualRevenue > 0 ? (
                          <BlurredAmount>{formatCurrency(actualRevenue)}</BlurredAmount>
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
            Revenue is the trailing 90-day average per stylist, annualized to monthly. Stylist count in parentheses.
          </div>
        </CardContent>
      </Card>

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
                const baseRate = level.service_commission_rate ?? 0;
                const currentRate = whatIfRates[level.id] ?? baseRate;
                const { targetRevenue } = computeEconomics(currentRate, effectiveAssumptions);
                const levelColor = getLevelColor(idx, levels.length);
                const dotColor = levelColor.bg.includes('amber-500') ? '#f59e0b' : levelColor.bg.includes('amber-300') ? '#fcd34d' : levelColor.bg.includes('amber-200') ? '#fde68a' : levelColor.bg.includes('amber-100') ? '#fef3c7' : '#a1a1aa';
                const isModified = whatIfRates[level.id] !== undefined;

                return (
                  <div key={level.id} className="flex items-center gap-4 py-2">
                    <div className="w-32 flex items-center gap-2 shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                      <span className="text-sm truncate">{level.label}</span>
                    </div>
                    <div className="flex-1">
                      <Slider
                        variant="filled"
                        value={[currentRate * 100]}
                        min={20}
                        max={65}
                        step={1}
                        onValueChange={([v]) => {
                          const newRate = v / 100;
                          if (Math.abs(newRate - baseRate) < 0.005) {
                            setWhatIfRates(prev => {
                              const next = { ...prev };
                              delete next[level.id];
                              return next;
                            });
                          } else {
                            setWhatIfRates(prev => ({ ...prev, [level.id]: newRate }));
                          }
                        }}
                      />
                    </div>
                    <span className={cn('w-12 text-sm text-right tabular-nums', isModified && 'text-primary')}>
                      {(currentRate * 100).toFixed(0)}%
                    </span>
                    <div className="w-24 text-right text-sm">
                      <BlurredAmount>{formatCurrency(targetRevenue)}</BlurredAmount>
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
