import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Package, Beaker, BarChart3, Shield, Zap, ArrowRight, Loader2,
  Minus, Plus, Scale, ShieldCheck, MapPin, TrendingDown, DollarSign, Activity,
  ChevronUp, Info, Clock, Eye, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { useBackroomPricingEstimate } from '@/hooks/backroom/useBackroomPricingEstimate';
import { usePerLocationColorServices } from '@/hooks/backroom/usePerLocationColorServices';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  BACKROOM_BASE_PRICE, BACKROOM_PER_SERVICE_FEE,
  SCALE_LICENSE_MONTHLY, SCALE_HARDWARE_PRICE,
} from '@/hooks/backroom/useLocationStylistCounts';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const features = [
  {
    icon: Eye,
    title: 'Predictive Stock Intelligence',
    description: 'Knows if you have enough product for tomorrow\'s appointments. No more counting.',
  },
  {
    icon: Beaker,
    title: 'Recipe & Mixing',
    description: 'Define formulas, track dispensed vs leftover, and eliminate chemical waste.',
  },
  {
    icon: BarChart3,
    title: 'Cost Intelligence',
    description: 'Wholesale price sync, markup calculations, and cost-per-service analytics.',
  },
  {
    icon: Shield,
    title: 'Waste & Compliance',
    description: 'Ghost loss detection, reweigh compliance, and variance tracking.',
  },
];

export function BackroomPaywall() {
  const [loading, setLoading] = useState(false);
  const [scaleCount, setScaleCount] = useState(0);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [manualStylistCount, setManualStylistCount] = useState(2);
  const [manualScaleOverride, setManualScaleOverride] = useState(false);
  const [auditMinutesPerDay, setAuditMinutesPerDay] = useState(30);
  const [mobileCalcOpen, setMobileCalcOpen] = useState(false);

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations(effectiveOrganization?.id);
  const { isLocationEntitled } = useBackroomLocationEntitlements(effectiveOrganization?.id);
  const { formatCurrency } = useFormatCurrency();
  const isMobile = useIsMobile();

  const { data: estimate, isLoading: estimateLoading } = useBackroomPricingEstimate(manualStylistCount);
  const { data: perLocationData } = usePerLocationColorServices();

  const activeLocations = locations.filter((l) => l.is_active);

  useEffect(() => {
    if (activeLocations.length > 0 && selectedLocationIds.size === 0) {
      setSelectedLocationIds(new Set(activeLocations.map(l => l.id)));
    }
  }, [activeLocations]);

  const locationCount = selectedLocationIds.size;

  const toggleLocation = (locId: string) => {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) next.delete(locId);
      else next.add(locId);
      return next;
    });
  };

  const selectAllLocations = () => {
    if (selectedLocationIds.size === activeLocations.length) {
      setSelectedLocationIds(new Set());
    } else {
      setSelectedLocationIds(new Set(activeLocations.map((l) => l.id)));
    }
  };

  // Location fraction for proportional scaling
  const totalLocations = activeLocations.length || 1;
  const locationFraction = locationCount / totalLocations;

  // Per-location scale recommendations
  const perLocationScaleData = activeLocations
    .filter((loc) => selectedLocationIds.has(loc.id))
    .map((loc) => {
      const metrics = perLocationData?.get(loc.id);
      const avgDaily = metrics?.avgDailyColorServices ?? 0;
      const scales = metrics ? metrics.recommendedScales : 1;
      return { id: loc.id, name: loc.name, avgDaily, scales };
    });

  const recommendedScales = perLocationScaleData.reduce((sum, loc) => sum + loc.scales, 0) || 1;

  useEffect(() => {
    if (!manualScaleOverride && estimate) {
      setScaleCount(recommendedScales);
    }
  }, [recommendedScales, manualScaleOverride, estimate]);

  // Cost calculations
  const baseCost = locationCount * BACKROOM_BASE_PRICE;
  const scaleCost = scaleCount * SCALE_LICENSE_MONTHLY;
  const usageFee = estimate ? Math.round(estimate.monthlyColorServices * locationFraction * BACKROOM_PER_SERVICE_FEE) : 0;
  const monthlyTotal = baseCost + scaleCost + usageFee;
  const hardwareTotal = scaleCount * SCALE_HARDWARE_PRICE;

  // Staff hours saved calculations
  const staffHourlyCost = 18;
  const monthlyAuditHours = (auditMinutesPerDay * 30) / 60;
  const monthlyAuditCost = Math.round(monthlyAuditHours * staffHourlyCost * locationFraction);

  // Savings calculations — scale by selected locations
  const wasteSavings = Math.round((estimate?.estimatedWasteSavings ?? 0) * locationFraction);
  const supplyRecovery = Math.round((estimate?.estimatedSupplyRecovery ?? 0) * locationFraction);
  const totalSavings = wasteSavings + supplyRecovery + monthlyAuditCost;
  const netBenefit = totalSavings - monthlyTotal;
  const roiMultiplier = monthlyTotal > 0 ? Math.round(totalSavings / monthlyTotal) : 0;

  // Yearly projections
  const yearlySavings = totalSavings * 12;
  const yearlyWasteSavings = wasteSavings * 12;
  const yearlySupplyRecovery = supplyRecovery * 12;
  const yearlyAuditCost = monthlyAuditCost * 12;
  const yearlyCost = monthlyTotal * 12;
  const yearlyNetBenefit = netBenefit * 12;

  const hasPositiveBenefit = netBenefit > 0 && locationCount > 0;

  const handleCheckout = async () => {
    if (!effectiveOrganization?.id) {
      toast.error('No organization found');
      return;
    }
    if (selectedLocationIds.size === 0) {
      toast.error('Please select at least one location');
      return;
    }

    setLoading(true);
    try {
      const location_ids = Array.from(selectedLocationIds);
      const { data, error } = await supabase.functions.invoke('create-backroom-checkout', {
        body: {
          organization_id: effectiveOrganization.id,
          location_ids,
          scale_count: scaleCount,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────────────────────
   * Sticky Calculator (shared between desktop sidebar & mobile sheet)
   * ────────────────────────────────────────────────────────────── */
  const calculatorContent = (
    <div className="space-y-4">
      {/* ─ YOUR INVESTMENT ─ */}
      <div className="space-y-2">
        <p className={cn(tokens.label.default, 'text-foreground text-xs flex items-center gap-2')}>
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          Your Investment
        </p>
        {locationCount > 0 && estimate ? (
          <div className="space-y-1.5 font-sans text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Location base × {locationCount}</span>
              <span className="text-foreground">{formatCurrency(baseCost)}/mo</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Usage fee (~{estimate.monthlyColorServices} appts)</span>
              <span className="text-foreground">{formatCurrency(usageFee)}/mo</span>
            </div>
            {scaleCount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Scale license × {scaleCount}</span>
                <span className="text-foreground">{formatCurrency(scaleCost)}/mo</span>
              </div>
            )}
            <div className="border-t border-border/20 pt-1.5 flex justify-between">
              <span className="text-foreground font-medium">Total</span>
              <span className="text-foreground font-medium">{formatCurrency(monthlyTotal)}/mo</span>
            </div>
          </div>
        ) : (
          /* ─ ENHANCED EMPTY STATE: show estimated losses ─ */
          <div className="space-y-2">
            {totalSavings > 0 ? (
              <>
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                  <p className="font-display text-lg tracking-wide text-destructive">
                    ~<AnimatedNumber value={totalSavings} prefix="$" duration={1000} />/mo
                  </p>
                  <p className="text-[10px] text-destructive/70 font-sans mt-0.5">
                    estimated monthly losses
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-sans text-center">
                  Select locations below to see how Backroom pays for itself
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground font-sans">
                Select locations to see your cost
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─ YOUR SAVINGS ─ */}
      {locationCount > 0 && estimate && (
        <div className="space-y-2">
          <div className="border-t border-border/20 pt-3" />
          <p className={cn(tokens.label.default, 'text-foreground text-xs flex items-center gap-2')}>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            Projected Savings
          </p>
          <div className="space-y-1.5 font-sans text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Waste reduction (12%)</span>
              <span className="text-emerald-400">−{formatCurrency(wasteSavings)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Staff hours recovered</span>
              <span className="text-emerald-400">−{formatCurrency(monthlyAuditCost)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Supply fee recovery*</span>
              <span className="text-emerald-400">−{formatCurrency(supplyRecovery)}</span>
            </div>
            <div className="border-t border-border/20 pt-1.5 flex justify-between">
              <span className="text-foreground font-medium">Net benefit</span>
              <span className={cn(
                'font-medium',
                netBenefit > 0 ? 'text-emerald-400' : 'text-foreground',
              )}>
                {netBenefit > 0 ? '+' : ''}{formatCurrency(netBenefit)}/mo
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-sans leading-tight">
            * Supply fee recovery assumes you add an avg product cost fee to color services.
          </p>
          <div className="flex gap-1.5 items-start mt-1 p-2 rounded-md bg-muted/20 border border-border/30">
            <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground font-sans leading-tight">
              All savings and revenue projections are estimates and not guaranteed.
            </p>
          </div>
        </div>
      )}

      {/* ─ ANNUAL IMPACT ─ */}
      {hasPositiveBenefit && estimate && (
        <div className="space-y-3">
          <div className="border-t border-border/20 pt-3" />
          <div className="rounded-lg bg-gradient-to-br from-emerald-500/5 to-primary/5 border border-emerald-500/20 p-4 space-y-3">
            <p className={cn(tokens.label.default, 'text-emerald-400 text-xs flex items-center gap-2')}>
              <BarChart3 className="w-3.5 h-3.5" />
              Yearly Impact
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="font-display text-base tracking-wide text-emerald-400">
                  <AnimatedNumber value={yearlySupplyRecovery} prefix="$" duration={1000} />
                </p>
                <p className="text-[10px] text-muted-foreground font-sans">revenue / yr</p>
              </div>
              <div className="text-center">
                <p className="font-display text-base tracking-wide text-emerald-400">
                  <AnimatedNumber value={yearlyWasteSavings} prefix="$" duration={1000} />
                </p>
                <p className="text-[10px] text-muted-foreground font-sans">waste saved / yr</p>
              </div>
              <div className="text-center">
                <p className="font-display text-base tracking-wide text-emerald-400">
                  <AnimatedNumber value={yearlyAuditCost} prefix="$" duration={1000} />
                </p>
                <p className="text-[10px] text-muted-foreground font-sans">hours recovered / yr</p>
              </div>
            </div>

            {/* Cost vs savings bar */}
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/60 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, yearlySavings > 0 ? (yearlyCost / yearlySavings) * 100 : 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-sans text-center">
                Cost is only {yearlySavings > 0 ? Math.round((yearlyCost / yearlySavings) * 100) : 0}% of annual benefit
              </p>
            </div>

            {/* Hero annual number */}
            <div className="text-center pt-1">
              <p className="font-display text-3xl tracking-wide text-emerald-400">
                +<AnimatedNumber value={yearlyNetBenefit} prefix="$" duration={1200} />
                <span className="text-sm text-emerald-400/70 ml-1">/yr</span>
              </p>
              {roiMultiplier >= 2 && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-sans font-medium">
                  <TrendingDown className="w-3 h-3" />
                  {roiMultiplier}× ROI
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        size="lg"
        className="w-full font-sans font-medium gap-2"
        onClick={handleCheckout}
        disabled={loading || selectedLocationIds.size === 0}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting…
          </>
        ) : yearlyNetBenefit > 1000 && locationCount > 0 ? (
          <>
            Unlock {formatCurrency(yearlyNetBenefit)}/yr in savings
            <ArrowRight className="w-4 h-4" />
          </>
        ) : netBenefit > 0 && locationCount > 0 ? (
          <>
            Start saving {formatCurrency(netBenefit)}/mo
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          <>
            Subscribe &amp; Activate
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
      {selectedLocationIds.size === 0 && activeLocations.length > 0 && (
        <p className="text-xs text-destructive font-sans text-center">
          Select at least one location to continue
        </p>
      )}
      <p className="text-[10px] text-muted-foreground font-sans text-center">
        30-day money-back guarantee · Cancel anytime
      </p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8">
      {/* ── HERO (full width) ── */}
      <div className="max-w-5xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className={cn(tokens.heading.page, 'text-2xl')}>
            Stop Losing Money in Your Backroom
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto font-sans">
            The average salon loses $375/mo to product waste, ghost losses, and manual audits. Here's what it's costing yours.
          </p>
        </div>

        {/* ═══ MONEY YOU MAY BE LOSING — Loss Aversion Banner ═══ */}
        {(estimate || estimateLoading) && (
          <Card className="bg-destructive/[0.03] border-destructive/20 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-destructive text-sm')}>
                    Money You May Be Losing Every Month
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    Without Zura Backroom, these costs go undetected and unrecovered.
                  </p>
                </div>
              </div>

              {estimateLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-20 rounded-lg" />
                  <Skeleton className="h-20 rounded-lg" />
                  <Skeleton className="h-20 rounded-lg" />
                </div>
              ) : estimate ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/15 text-center">
                      <p className="font-display text-2xl tracking-wide text-destructive">
                        <AnimatedNumber value={wasteSavings} prefix="$" duration={1000} />
                      </p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">
                        product waste / mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/15 text-center">
                      <p className="font-display text-2xl tracking-wide text-destructive">
                        <AnimatedNumber value={monthlyAuditCost} prefix="$" duration={1000} />
                      </p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">
                        staff time wasted / mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/15 text-center">
                      <p className="font-display text-2xl tracking-wide text-destructive">
                        <AnimatedNumber value={supplyRecovery} prefix="$" duration={1000} />
                      </p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">
                        unrecovered supply costs / mo
                      </p>
                    </div>
                  </div>

                  {/* Total monthly loss */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-destructive/20" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground font-sans">Estimated total monthly loss</p>
                      <p className="font-display text-3xl tracking-wide text-destructive mt-1">
                        <AnimatedNumber value={totalSavings} prefix="$" duration={1200} />
                        <span className="text-base text-destructive/60 ml-1">/mo</span>
                      </p>
                    </div>
                    <div className="h-px flex-1 bg-destructive/20" />
                  </div>

                  {!estimate.hasRealData && (
                    <p className="text-[10px] text-muted-foreground font-sans text-center italic">
                      Based on industry averages for {manualStylistCount} stylist{manualStylistCount !== 1 ? 's' : ''}.
                      Adjust below for a personalized estimate.
                    </p>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

          {/* ════ LEFT COLUMN (scrollable) — Reordered for conversion ════ */}
          <div className="space-y-6">

            {/* 1. Your Salon's Numbers (personalized proof — moved up) */}
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-5 space-y-3">
                <p className={cn(tokens.label.default, 'text-foreground text-xs flex items-center gap-2')}>
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  Your Salon's Numbers
                </p>
                {estimateLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                  </div>
                ) : estimate ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                        <p className="font-display text-2xl tracking-wide text-foreground">
                          ~<AnimatedNumber value={estimate.monthlyColorServices} duration={800} />
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          color services / mo
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                        <p className="font-display text-2xl tracking-wide text-foreground">
                          <AnimatedNumber value={estimate.monthlyProductSpend} prefix="$" duration={800} />
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          product spend / mo
                        </p>
                      </div>
                    </div>

                    {!estimate.hasRealData && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-sans italic">
                          Based on industry averages — adjust your stylist count:
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="font-sans text-xs text-muted-foreground w-16 shrink-0">
                            {manualStylistCount} stylist{manualStylistCount !== 1 ? 's' : ''}
                          </span>
                          <Slider
                            variant="filled"
                            min={1}
                            max={20}
                            step={1}
                            value={[manualStylistCount]}
                            onValueChange={([v]) => setManualStylistCount(v)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}

                    {estimate.hasRealData && (
                      <p className="text-xs text-muted-foreground font-sans italic">
                        Based on {estimate.totalColorAppointments.toLocaleString()} color appointments over {estimate.dataWindowDays} days
                      </p>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* 2. Time Your Team Loses (pain reinforcement) */}
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className={cn(tokens.label.default, 'text-foreground')}>Time Your Team Loses Every Day</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      Nightly counts, guessing stock levels, manual audits — replaced by predictive intelligence.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs text-muted-foreground">
                      Minutes spent daily on stock checks
                    </span>
                    <span className="font-display text-sm tracking-wide text-foreground">
                      {auditMinutesPerDay} min
                    </span>
                  </div>
                  <Slider
                    variant="filled"
                    min={10}
                    max={90}
                    step={5}
                    value={[auditMinutesPerDay]}
                    onValueChange={([v]) => setAuditMinutesPerDay(v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
                    <p className="font-display text-2xl tracking-wide text-foreground">
                      <AnimatedNumber value={monthlyAuditHours} duration={600} decimals={1} />
                    </p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      hours recovered / mo
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <p className="font-display text-2xl tracking-wide text-emerald-400">
                      <AnimatedNumber value={monthlyAuditCost} prefix="$" duration={600} />
                    </p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      cost recovered / mo
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground font-sans">
                  Based on average staff cost of ${staffHourlyCost}/hr. This time is returned to revenue-generating work.
                </p>
              </CardContent>
            </Card>

            {/* 3. Feature Grid (the solution — moved down) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {features.map((f) => (
                <Card key={f.title} className="bg-card/60 border-border/40">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className={cn(tokens.label.default, 'text-sm text-foreground')}>{f.title}</p>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">{f.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Estimates Disclaimer */}
            <div className="flex gap-2 items-start p-3 rounded-lg bg-muted/20 border border-border/30">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                These figures are estimates based on your current scheduled appointments and estimated booking capacity. Actual results may vary based on scheduling changes, client retention, and service mix.
              </p>
            </div>

            {/* 4. Pricing Overview */}
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className={cn(tokens.label.default, 'text-foreground')}>Simple, Usage-Based Pricing</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      Pay for what you use — no tiers, no commitments
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <p className="font-display text-xl tracking-wide text-foreground">${BACKROOM_BASE_PRICE}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">per location / month</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <p className="font-display text-xl tracking-wide text-foreground">${BACKROOM_PER_SERVICE_FEE.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">per color service appointment</p>
                  </div>
                </div>
                {estimate?.hasRealData ? (
                  <p className="text-xs text-muted-foreground font-sans">
                    Based on your ~{estimate.monthlyColorServices} monthly color services, estimated usage fee is ~{formatCurrency(usageFee)}/mo.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-sans">
                    Color service usage is tracked automatically and billed based on actual appointments.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 5. Location Selector */}
            {activeLocations.length > 0 && (
              <Card className="bg-card/60 border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className={cn(tokens.label.default, 'text-foreground')}>Select Locations</p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          ${BACKROOM_BASE_PRICE}/mo per location
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-sans text-xs"
                      onClick={selectAllLocations}
                    >
                      {selectedLocationIds.size === activeLocations.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {activeLocations.map((loc) => {
                      const isChecked = selectedLocationIds.has(loc.id);
                      const cityLabel = loc.city ? loc.city.split(',')[0]?.trim() : '';

                      return (
                        <div
                          key={loc.id}
                          className={cn(
                            'flex items-center gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer',
                            isChecked
                              ? 'bg-primary/5 border border-primary/30'
                              : 'border border-transparent hover:bg-accent/30',
                          )}
                          onClick={() => toggleLocation(loc.id)}
                        >
                          <Checkbox
                            checked={isChecked}
                            className="pointer-events-none"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="font-sans text-sm text-foreground truncate">{loc.name}</span>
                              {cityLabel && (
                                <span className="font-sans text-xs text-muted-foreground">{cityLabel}</span>
                              )}
                            </div>
                          </div>
                          {isChecked && (
                            <span className="font-sans text-xs text-primary shrink-0">
                              +${BACKROOM_BASE_PRICE}/mo
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedLocationIds.size > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40 flex justify-between items-center">
                      <span className="font-sans text-xs text-muted-foreground">
                        {selectedLocationIds.size} location{selectedLocationIds.size > 1 ? 's' : ''} selected
                      </span>
                      <span className="font-sans text-sm text-foreground font-medium">
                        ${baseCost}/mo
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 6. Scale Configurator */}
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className={cn(tokens.label.default, 'text-foreground')}><p className={cn(tokens.label.default, 'text-foreground')}>Precision Scale</p></p>
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">
                        ${SCALE_HARDWARE_PRICE} one-time + ${SCALE_LICENSE_MONTHLY}/mo per scale
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => { setManualScaleOverride(true); setScaleCount(Math.max(0, scaleCount - 1)); }}
                      disabled={scaleCount <= 0}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className={cn(tokens.stat.large, 'w-8 text-center text-foreground')}>
                      {scaleCount}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => { setManualScaleOverride(true); setScaleCount(Math.min(10, scaleCount + 1)); }}
                      disabled={scaleCount >= 10}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {estimate && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-sans">
                      Recommended: {recommendedScales} scale{recommendedScales !== 1 ? 's' : ''} (~{dailyColorServices} daily color services)
                    </p>
                    {manualScaleOverride && scaleCount !== recommendedScales && (
                      <button
                        type="button"
                        className="text-xs text-primary font-sans hover:underline"
                        onClick={() => { setManualScaleOverride(false); setScaleCount(recommendedScales); }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 7. Money-Back Guarantee */}
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-emerald-300 text-sm')}>30-Day Money-Back Guarantee</p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    If Backroom doesn't work for your salon, get a full refund within 30 days. No questions asked.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 8. ROI callout */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5 text-center">
                {estimate && locationCount > 0 && netBenefit > 0 ? (
                  <>
                    <p className={cn(tokens.label.default, 'text-primary text-sm')}>
                      Backroom pays for itself {roiMultiplier}× over
                    </p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">
                      {formatCurrency(yearlyCost)}/yr cost → {formatCurrency(yearlySavings)}/yr in savings & revenue.
                      {!estimate.hasRealData && ' Estimates based on industry averages.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={cn(tokens.label.default, 'text-primary text-sm')}>
                      Average salon saves $375/mo in reduced product waste
                    </p>
                    <p className="text-xs text-muted-foreground font-sans mt-1">
                      Based on 12% waste reduction on typical color spend. Backroom pays for itself many times over.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bottom spacer on mobile so content isn't hidden behind sticky bar */}
            <div className="h-24 lg:hidden" />
          </div>

          {/* ════ RIGHT COLUMN — Sticky Calculator (desktop only) ════ */}
          <div className="hidden lg:block">
            <div
              className={cn(
                'sticky top-24 rounded-xl border bg-card/80 backdrop-blur-xl shadow-2xl p-5 transition-colors duration-500',
                'max-h-[calc(100vh-8rem)] overflow-y-auto',
                hasPositiveBenefit
                  ? 'border-emerald-500/30 shadow-emerald-500/5'
                  : 'border-border/40',
              )}
            >
              <p className={cn(tokens.label.default, 'text-foreground text-sm mb-4 text-center')}>
                ROI Calculator
              </p>
              {calculatorContent}
            </div>
          </div>
        </div>
      </div>

      {/* ════ MOBILE STICKY BOTTOM BAR ════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {/* Expanded calculator sheet */}
        {mobileCalcOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
            onClick={() => setMobileCalcOpen(false)}
          />
        )}
        {mobileCalcOpen && (
          <div className="fixed bottom-0 left-0 right-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-border bg-card/95 backdrop-blur-xl shadow-2xl p-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
            <button
              onClick={() => setMobileCalcOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full bg-muted/60 hover:bg-muted"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
            {calculatorContent}
          </div>
        )}

        {/* Compact bar */}
        {!mobileCalcOpen && (
          <div
            className={cn(
              'border-t bg-card/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between gap-3',
              hasPositiveBenefit ? 'border-emerald-500/30' : 'border-border',
            )}
          >
            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => setMobileCalcOpen(true)}
            >
              {hasPositiveBenefit ? (
                <div>
                  <p className="font-display text-lg tracking-wide text-emerald-400">
                    +{formatCurrency(netBenefit)}/mo
                  </p>
                  <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" /> Tap for breakdown
                  </p>
                </div>
              ) : locationCount > 0 ? (
                <div>
                  <p className="font-sans text-sm text-foreground">{formatCurrency(monthlyTotal)}/mo</p>
                  <p className="text-[10px] text-muted-foreground font-sans flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" /> Tap for breakdown
                  </p>
                </div>
              ) : (
                <p className="font-sans text-sm text-muted-foreground">Select locations above</p>
              )}
            </button>
            <Button
              size="sm"
              className="font-sans font-medium gap-1.5 shrink-0"
              onClick={handleCheckout}
              disabled={loading || selectedLocationIds.size === 0}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Activate
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
