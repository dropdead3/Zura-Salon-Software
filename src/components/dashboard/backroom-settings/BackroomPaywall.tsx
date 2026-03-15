import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Package, Beaker, BarChart3, Shield, Zap, ArrowRight, Loader2, Check, Minus, Plus, Scale, Gift, CalendarDays, ShieldCheck, MapPin, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { useLocationStylistCounts, getRecommendedTier, getTierProgressInfo, PLAN_PRICING } from '@/hooks/backroom/useLocationStylistCounts';
import { Progress } from '@/components/ui/progress';
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

const PLAN_KEYS = ['starter', 'professional', 'unlimited'] as const;
type PlanKey = typeof PLAN_KEYS[number];

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  starter: [
    'Product catalog & inventory',
    'Recipe management',
    'Cost tracking',
    'Waste monitoring',
  ],
  professional: [
    'Everything in Starter',
    'Supply AI insights',
    'Ghost loss detection',
    'Cost spike alerts',
    'Weekly intelligence digest',
  ],
  unlimited: [
    'Everything in Professional',
    'Predictive demand forecasting',
    'Multi-location benchmarking',
    'Priority support',
    'Advanced analytics',
  ],
};

const SCALE_LICENSE_MONTHLY = 10;
const SCALE_HARDWARE_PRICE = 199;

export function BackroomPaywall() {
  const [loading, setLoading] = useState(false);
  const [scaleCount, setScaleCount] = useState(1);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [tierOverrides, setTierOverrides] = useState<Record<string, PlanKey>>({});

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations(effectiveOrganization?.id);
  const { isLocationEntitled } = useBackroomLocationEntitlements(effectiveOrganization?.id);
  const { data: stylistCounts = [] } = useLocationStylistCounts(effectiveOrganization?.id);

  const activeLocations = locations.filter((l) => l.is_active);

  // Build a map of location_id -> stylist count
  const stylistCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const sc of stylistCounts) {
      map.set(sc.location_id, sc.count);
    }
    return map;
  }, [stylistCounts]);

  // Get the effective tier for a location (override or auto-recommended)
  const getLocationTier = (locId: string): PlanKey => {
    if (tierOverrides[locId]) return tierOverrides[locId];
    const count = stylistCountMap.get(locId) ?? 0;
    return getRecommendedTier(count);
  };

  // Get allowed tiers for override (can only upgrade, not downgrade)
  const getAllowedTiers = (locId: string): PlanKey[] => {
    const count = stylistCountMap.get(locId) ?? 0;
    const minTier = getRecommendedTier(count);
    const minIdx = PLAN_KEYS.indexOf(minTier);
    return PLAN_KEYS.filter((_, i) => i >= minIdx);
  };

  const handleTierOverride = (locId: string, tier: PlanKey) => {
    const recommended = getRecommendedTier(stylistCountMap.get(locId) ?? 0);
    if (tier === recommended) {
      // Remove override if setting back to recommended
      setTierOverrides((prev) => {
        const next = { ...prev };
        delete next[locId];
        return next;
      });
    } else {
      setTierOverrides((prev) => ({ ...prev, [locId]: tier }));
    }
  };

  // Calculate per-location prices and totals
  const locationPricing = useMemo(() => {
    const items: { locId: string; tier: PlanKey; price: number }[] = [];
    for (const locId of selectedLocationIds) {
      const tier = getLocationTier(locId);
      const pricing = PLAN_PRICING[tier];
      const price = isAnnual ? pricing.annualPrice : pricing.price;
      items.push({ locId, tier, price });
    }
    return items;
  }, [selectedLocationIds, tierOverrides, stylistCountMap, isAnnual]);

  const planTotal = locationPricing.reduce((sum, item) => sum + item.price, 0);
  const scaleTotal = scaleCount * SCALE_LICENSE_MONTHLY;
  const monthlyTotal = planTotal + scaleTotal;
  const hardwareQty = isAnnual ? Math.max(0, scaleCount - 1) : scaleCount;
  const hardwareTotal = hardwareQty * SCALE_HARDWARE_PRICE;
  const locationCount = selectedLocationIds.size || 0;

  const toggleLocation = (locId: string) => {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(locId)) {
        next.delete(locId);
      } else {
        next.add(locId);
      }
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
      // Build location_plans array for the checkout
      const location_plans = locationPricing.map((item) => ({
        location_id: item.locId,
        plan_tier: item.tier,
        stylist_count: stylistCountMap.get(item.locId) ?? 0,
      }));

      const { data, error } = await supabase.functions.invoke('create-backroom-checkout', {
        body: {
          organization_id: effectiveOrganization.id,
          location_plans,
          scale_count: scaleCount,
          billing_interval: isAnnual ? 'annual' : 'monthly',
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

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={cn('text-sm font-sans', !isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            Monthly
          </span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className={cn('text-sm font-sans', isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            Annual
          </span>
          {isAnnual && (
            <Badge className="bg-primary/10 text-primary border-primary/20 font-sans text-[10px] px-2 py-0.5">
              Save 15%
            </Badge>
          )}
        </div>

        {/* Annual Incentive Callout */}
        {isAnnual && (
          <Card className="bg-primary/5 border-primary/20 max-w-2xl mx-auto">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className={cn(tokens.label.default, 'text-sm text-primary')}>Annual plans include 1 free Acaia Pearl scale</p>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  A $199 value — your first scale hardware is on us when you commit annually.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Tier Legend */}
        <div className="space-y-2">
          <h2 className={cn(tokens.heading.section, 'text-center')}>Plan Tiers</h2>
          <p className="text-center text-xs text-muted-foreground font-sans">
            Your plan is auto-assigned per location based on active stylists. Upgrade anytime.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {PLAN_KEYS.map((key) => {
              const plan = PLAN_PRICING[key];
              const shownPrice = isAnnual ? plan.annualPrice : plan.price;
              return (
                <div
                  key={key}
                  className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className={cn(tokens.label.default, 'text-foreground')}>{plan.name}</h3>
                    {key === 'professional' && (
                      <Badge className="bg-primary text-primary-foreground font-sans text-[10px] px-2 py-0.5">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-sans">{plan.range}</p>
                  <div className="flex items-baseline gap-1">
                    {isAnnual && (
                      <span className="text-sm text-muted-foreground font-sans line-through mr-1">
                        ${PLAN_PRICING[key].price}
                      </span>
                    )}
                    <span className={cn(tokens.stat.large, 'text-foreground')}>
                      ${shownPrice}
                    </span>
                    <span className="text-sm text-muted-foreground font-sans">/mo</span>
                  </div>
                  <ul className="space-y-1 pt-2 border-t border-border/40">
                    {PLAN_FEATURES[key].map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground font-sans">
                        <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Selector with Per-Location Tier Assignment */}
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
                      Plan auto-assigned by active stylist count per location
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
                  const stylistCount = stylistCountMap.get(loc.id) ?? 0;
                  const tier = getLocationTier(loc.id);
                  const pricing = PLAN_PRICING[tier];
                  const price = isAnnual ? pricing.annualPrice : pricing.price;
                  const allowedTiers = getAllowedTiers(loc.id);
                  const isOverridden = !!tierOverrides[loc.id];

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
                        <div className="flex items-center gap-2 mt-1 ml-5.5">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="font-sans text-xs text-muted-foreground">
                              {stylistCount} stylist{stylistCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-muted-foreground/40">·</span>
                          {isChecked && allowedTiers.length > 1 ? (
                            <Select
                              value={tier}
                              onValueChange={(val) => handleTierOverride(loc.id, val as PlanKey)}
                            >
                              <SelectTrigger className="h-6 w-auto min-w-[140px] text-xs font-sans border-border/40 bg-transparent px-2 py-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedTiers.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs font-sans">
                                    {PLAN_PRICING[t].name} · ${isAnnual ? PLAN_PRICING[t].annualPrice : PLAN_PRICING[t].price}/mo
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-sans text-[10px] px-1.5 py-0 border-border/40 text-muted-foreground"
                            >
                              {pricing.name} · ${price}/mo
                            </Badge>
                          )}
                          {isOverridden && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-sans text-[10px] px-1.5 py-0">
                              Upgraded
                            </Badge>
                          )}
                        {/* Tier progression indicator */}
                        {(() => {
                          const progress = getTierProgressInfo(stylistCount);
                          if (!progress) return null;
                          return (
                            <div className="mt-1.5 ml-5.5 space-y-1">
                              <Progress
                                value={progress.progressPct}
                                className="h-1 bg-muted/60"
                                indicatorClassName={progress.isAtBoundary ? 'bg-amber-500' : 'bg-muted-foreground/30'}
                              />
                              <p className="font-sans text-[11px] text-muted-foreground">
                                {progress.isAtBoundary ? (
                                  <>Add 1 more stylist → {PLAN_PRICING[progress.nextTier].name} (${isAnnual ? PLAN_PRICING[progress.nextTier].annualPrice : PLAN_PRICING[progress.nextTier].price}/mo)</>
                                ) : (
                                  <>{progress.remaining} more stylist{progress.remaining !== 1 ? 's' : ''} to {PLAN_PRICING[progress.nextTier].name}</>
                                )}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      </div>
                      {isChecked && (
                        <span className="font-sans text-xs text-primary shrink-0">
                          +${price}/mo
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
                    ${planTotal}/mo
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
                    ${SCALE_HARDWARE_PRICE} one-time + ${SCALE_LICENSE_MONTHLY}/mo per scale • 1 per 5 stylists recommended
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

        {/* Price Summary & CTA */}
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-5 space-y-3">
              {/* Per-location line items */}
              {locationPricing.length > 0 ? (
                <>
                  {locationPricing.map((item) => {
                    const loc = activeLocations.find((l) => l.id === item.locId);
                    return (
                      <div key={item.locId} className="flex justify-between items-center font-sans text-sm">
                        <span className="text-muted-foreground truncate mr-2">
                          {loc?.name ?? 'Location'} ({PLAN_PRICING[item.tier].name})
                        </span>
                        <span className="text-foreground font-medium shrink-0">
                          ${item.price}/mo
                        </span>
                      </div>
                    );
                  })}
                  {isAnnual && (
                    <p className="text-[10px] text-primary font-sans flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      Billed annually at ${(planTotal * 12).toLocaleString()}/yr
                    </p>
                  )}
                </>
              ) : (
                <div className="flex justify-between items-center font-sans text-sm">
                  <span className="text-muted-foreground">No locations selected</span>
                  <span className="text-foreground font-medium">$0/mo</span>
                </div>
              )}
              {scaleCount > 0 && (
                <>
                  <div className="flex justify-between items-center font-sans text-sm">
                    <span className="text-muted-foreground">
                      Scale license × {scaleCount}
                    </span>
                    <span className="text-foreground font-medium">${scaleTotal}/mo</span>
                  </div>
                  <div className="flex justify-between items-center font-sans text-sm">
                    <span className="text-muted-foreground">
                      Acaia Pearl × {scaleCount} (one-time)
                      {isAnnual && scaleCount > 0 && (
                        <span className="text-primary ml-1">— 1 free</span>
                      )}
                    </span>
                    <span className="text-foreground font-medium">
                      ${hardwareTotal}
                      {isAnnual && scaleCount > 0 && hardwareQty < scaleCount && (
                        <span className="text-xs text-muted-foreground line-through ml-1">
                          ${scaleCount * SCALE_HARDWARE_PRICE}
                        </span>
                      )}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-border/40 pt-3 flex justify-between items-center">
                <span className={cn(tokens.label.default, 'text-foreground')}>
                  {isAnnual ? 'Monthly equivalent' : 'Monthly total'}
                </span>
                <span className={cn(tokens.stat.large, 'text-foreground')}>${monthlyTotal}/mo</span>
              </div>
              {hardwareTotal > 0 && (
                <p className="text-xs text-muted-foreground font-sans text-right">
                  + ${hardwareTotal} one-time hardware
                </p>
              )}
            </CardContent>
          </Card>

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
              30-day money-back guarantee. ${monthlyTotal}/mo
              {hardwareTotal > 0 ? ` + $${hardwareTotal} hardware` : ''}.{' '}
              {isAnnual
                ? 'Billed annually. Includes 1 free Acaia Pearl scale.'
                : 'Cancel anytime from your subscription settings.'}
            </p>
          </div>
        </div>

        {/* ROI callout */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 text-center">
              <p className={cn(tokens.label.default, 'text-primary text-sm')}>
                Average salon saves $375/mo in reduced product waste
              </p>
              <p className="text-xs text-muted-foreground font-sans mt-1">
                Based on 50% waste reduction on $3,000/mo color spend. Backroom pays for itself 3–4× over.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
