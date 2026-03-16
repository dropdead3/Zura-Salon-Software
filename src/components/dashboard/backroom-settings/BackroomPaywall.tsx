import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Package, Beaker, BarChart3, Shield, Zap, ArrowRight, Loader2,
  Minus, Plus, Scale, ShieldCheck, MapPin, TrendingDown, DollarSign, Activity,
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
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  BACKROOM_BASE_PRICE, BACKROOM_PER_SERVICE_FEE,
  SCALE_LICENSE_MONTHLY, SCALE_HARDWARE_PRICE,
} from '@/hooks/backroom/useLocationStylistCounts';
import { toast } from 'sonner';

const features = [
  {
    icon: Package,
    title: 'Product Catalog',
    description: 'Track every product with real-time inventory projections and par-level alerts.',
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
  const [scaleCount, setScaleCount] = useState(1);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [manualStylistCount, setManualStylistCount] = useState(2);

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations(effectiveOrganization?.id);
  const { isLocationEntitled } = useBackroomLocationEntitlements(effectiveOrganization?.id);
  const { formatCurrency } = useFormatCurrency();

  const { data: estimate, isLoading: estimateLoading } = useBackroomPricingEstimate(manualStylistCount);

  const activeLocations = locations.filter((l) => l.is_active);
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

  // Cost calculations
  const baseCost = locationCount * BACKROOM_BASE_PRICE;
  const scaleCost = scaleCount * SCALE_LICENSE_MONTHLY;
  const usageFee = estimate ? Math.round(estimate.monthlyColorServices * BACKROOM_PER_SERVICE_FEE) : 0;
  const monthlyTotal = baseCost + scaleCost + usageFee;
  const hardwareTotal = scaleCount * SCALE_HARDWARE_PRICE;

  // Savings calculations
  const wasteSavings = estimate?.estimatedWasteSavings ?? 0;
  const supplyRecovery = estimate?.estimatedSupplyRecovery ?? 0;
  const totalSavings = wasteSavings + supplyRecovery;
  const netBenefit = totalSavings - monthlyTotal;
  const roiMultiplier = monthlyTotal > 0 ? Math.round(totalSavings / monthlyTotal) : 0;

  // Yearly projections
  const yearlySavings = totalSavings * 12;
  const yearlyWasteSavings = wasteSavings * 12;
  const yearlySupplyRecovery = supplyRecovery * 12;
  const yearlyCost = monthlyTotal * 12;
  const yearlyNetBenefit = netBenefit * 12;

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

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className={cn(tokens.heading.page, 'text-2xl')}>
            Unlock Zura Backroom
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto font-sans">
            Take control of your backroom operations with inventory intelligence, chemical tracking, and cost optimization.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
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

        {/* ── YOUR SALON'S NUMBERS ── */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-card/60 border-border/40 overflow-hidden">
            <CardContent className="p-0">
              {/* Net benefit hero banner */}
              <div className="bg-primary/5 border-b border-primary/10 p-5 text-center space-y-1">
                {estimateLoading ? (
                  <Skeleton className="h-10 w-48 mx-auto" />
                ) : netBenefit > 0 && locationCount > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground font-sans tracking-wide">
                      ESTIMATED MONTHLY NET BENEFIT
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-display text-3xl tracking-wide text-primary">
                        +<AnimatedNumber value={netBenefit} prefix="$" duration={1000} />
                      </span>
                      <span className="font-display text-sm tracking-wide text-primary/70">/mo</span>
                    </div>
                    {yearlyNetBenefit > 0 && (
                      <p className="text-xs text-muted-foreground font-sans mt-0.5">
                        That's <span className="text-emerald-400 font-medium">{formatCurrency(yearlyNetBenefit)}/year</span> in additional revenue & savings
                      </p>
                    )}
                    {roiMultiplier >= 2 && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-sans font-medium">
                        <TrendingDown className="w-3 h-3" />
                        {roiMultiplier}× return on investment
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground font-sans">
                    Select locations below to see your projected savings
                  </p>
                )}
              </div>

              <div className="p-5 space-y-5">
                {/* Activity metrics */}
                <div>
                  <p className={cn(tokens.label.default, 'text-foreground text-xs mb-3 flex items-center gap-2')}>
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
                            <AnimatedNumber
                              value={estimate.monthlyProductSpend}
                              prefix="$"
                              duration={800}
                            />
                          </p>
                          <p className="text-xs text-muted-foreground font-sans mt-0.5">
                            product spend / mo
                          </p>
                        </div>
                      </div>

                      {!estimate.hasRealData && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground font-sans italic">
                            Based on industry averages — adjust your stylist count for a better estimate:
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
                        <p className="text-xs text-muted-foreground font-sans mt-2 italic">
                          Based on {estimate.totalColorAppointments.toLocaleString()} color appointments over the last {estimate.dataWindowDays} days
                        </p>
                      )}
                    </>
                  ) : null}
                </div>

                {/* Cost breakdown */}
                {locationCount > 0 && estimate && (
                  <div className="space-y-2">
                    <p className={cn(tokens.label.default, 'text-foreground text-xs flex items-center gap-2')}>
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      Estimated Monthly Cost
                    </p>
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
                      <div className="border-t border-border/40 pt-1.5 flex justify-between">
                        <span className="text-foreground font-medium">Total</span>
                        <span className="text-foreground font-medium">{formatCurrency(monthlyTotal)}/mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Savings projection */}
                {locationCount > 0 && estimate && (
                  <div className="space-y-2">
                    <p className={cn(tokens.label.default, 'text-foreground text-xs flex items-center gap-2')}>
                      <TrendingDown className="w-3.5 h-3.5 text-primary" />
                      Projected Monthly Savings
                    </p>
                    <div className="space-y-1.5 font-sans text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Waste reduction (12%)</span>
                        <span className="text-emerald-400">−{formatCurrency(wasteSavings)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Supply fee recovery*</span>
                        <span className="text-emerald-400">−{formatCurrency(supplyRecovery)}</span>
                      </div>
                      <div className="border-t border-border/40 pt-1.5 flex justify-between">
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
                      * Supply fee recovery assumes you add an avg product cost fee to color services. This is optional and varies by salon.
                    </p>
                  </div>
                )}

                {/* Annual Impact */}
                {locationCount > 0 && estimate && yearlyNetBenefit > 0 && (
                  <div className="space-y-3">
                    <p className={cn(tokens.label.default, 'text-foreground text-xs flex items-center gap-2')}>
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      Estimated Annual Impact
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                        <p className="font-display text-2xl tracking-wide text-emerald-400">
                          <AnimatedNumber value={yearlySupplyRecovery} prefix="$" duration={1000} />
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          additional revenue / yr
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                        <p className="font-display text-2xl tracking-wide text-emerald-400">
                          <AnimatedNumber value={yearlyWasteSavings} prefix="$" duration={1000} />
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          waste savings / yr
                        </p>
                      </div>
                    </div>

                    {/* Annual cost vs savings bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-sans text-muted-foreground">
                        <span>Annual cost: {formatCurrency(yearlyCost)}</span>
                        <span className="text-emerald-400">Annual benefit: {formatCurrency(yearlySavings)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60 transition-all duration-700"
                          style={{
                            width: `${Math.min(100, yearlySavings > 0 ? (yearlyCost / yearlySavings) * 100 : 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans text-center">
                        Your cost represents only {yearlySavings > 0 ? Math.round((yearlyCost / yearlySavings) * 100) : 0}% of your projected annual benefit
                      </p>
                    </div>

                    <div className="border-t border-border/40 pt-2 text-center">
                      <p className="text-xs text-muted-foreground font-sans">Total annual net benefit</p>
                      <p className="font-display text-3xl tracking-wide text-emerald-400 mt-0.5">
                        +<AnimatedNumber value={yearlyNetBenefit} prefix="$" duration={1200} />
                        <span className="text-sm text-emerald-400/70 ml-1">/yr</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Overview */}
        <div className="max-w-2xl mx-auto">
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
              {estimate && estimate.hasRealData && (
                <p className="text-xs text-muted-foreground font-sans">
                  Based on your ~{estimate.monthlyColorServices} monthly color services, your estimated usage fee is ~{formatCurrency(usageFee)}/mo.
                </p>
              )}
              {(!estimate || !estimate.hasRealData) && (
                <p className="text-xs text-muted-foreground font-sans">
                  Color service usage is tracked automatically and billed based on actual appointments that use the scale.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Location Selector */}
        {activeLocations.length > 0 && (
          <Card className="bg-card/60 border-border/40 max-w-2xl mx-auto">
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
                        'flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                        isChecked
                          ? 'bg-primary/5 border border-primary/30'
                          : 'border border-transparent hover:bg-accent/30',
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleLocation(loc.id)}
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

        {/* Scale Configurator */}
        <Card className="bg-card/60 border-border/40 max-w-2xl mx-auto">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-foreground')}>Acaia Pearl Scale</p>
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
                  onClick={() => setScaleCount(Math.max(0, scaleCount - 1))}
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
                  onClick={() => setScaleCount(Math.min(10, scaleCount + 1))}
                  disabled={scaleCount >= 10}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Money-Back Guarantee */}
        <Card className="bg-emerald-500/5 border-emerald-500/20 max-w-2xl mx-auto">
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

        {/* CTA */}
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-center space-y-3">
            <Button
              size="lg"
              className="font-sans font-medium gap-2"
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
                  Unlock {formatCurrency(yearlyNetBenefit)}/year in savings
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
              <p className="text-xs text-destructive font-sans">
                Select at least one location to continue
              </p>
            )}
            <p className="text-xs text-muted-foreground font-sans">
              30-day money-back guarantee. Cancel anytime.
            </p>
          </div>
        </div>

        {/* ROI callout */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 text-center">
              {estimate && locationCount > 0 && netBenefit > 0 ? (
                <>
                  <p className={cn(tokens.label.default, 'text-primary text-sm')}>
                    Backroom pays for itself {roiMultiplier}× over
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    {formatCurrency(monthlyTotal)}/mo cost → {formatCurrency(totalSavings)}/mo in savings & recovery.
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
        </div>
      </div>
    </div>
  );
}
