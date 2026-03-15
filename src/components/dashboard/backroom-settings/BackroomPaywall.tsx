import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Package, Beaker, BarChart3, Shield, Zap, ArrowRight, Loader2, Check, Minus, Plus, Scale, Gift, CalendarDays, ShieldCheck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
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

interface PlanConfig {
  key: string;
  name: string;
  price: number;
  annualPrice: number;
  stylists: string;
  popular?: boolean;
  features: string[];
}

const plans: PlanConfig[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: 39,
    annualPrice: 33,
    stylists: '1–3 stylists',
    features: [
      'Product catalog & inventory',
      'Recipe management',
      'Cost tracking',
      'Waste monitoring',
    ],
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 79,
    annualPrice: 67,
    stylists: '4–10 stylists',
    popular: true,
    features: [
      'Everything in Starter',
      'Supply AI insights',
      'Ghost loss detection',
      'Cost spike alerts',
      'Weekly intelligence digest',
    ],
  },
  {
    key: 'unlimited',
    name: 'Unlimited',
    price: 129,
    annualPrice: 110,
    stylists: 'Unlimited stylists',
    features: [
      'Everything in Professional',
      'Predictive demand forecasting',
      'Multi-location benchmarking',
      'Priority support',
      'Advanced analytics',
    ],
  },
];

const SCALE_LICENSE_MONTHLY = 10;
const SCALE_HARDWARE_PRICE = 199;


export function BackroomPaywall() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [scaleCount, setScaleCount] = useState(1);
  const [isAnnual, setIsAnnual] = useState(false);
  
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations(effectiveOrganization?.id);
  const { isLocationEntitled } = useBackroomLocationEntitlements(effectiveOrganization?.id);

  const activeLocations = locations.filter((l) => l.is_active);
  const locationCount = selectedLocationIds.size || 1; // minimum 1

  const currentPlan = plans.find((p) => p.key === selectedPlan)!;
  const perLocationPrice = isAnnual ? currentPlan.annualPrice : currentPlan.price;
  const planTotal = perLocationPrice * locationCount;
  const scaleTotal = scaleCount * SCALE_LICENSE_MONTHLY;
  const monthlyTotal = planTotal + scaleTotal;

  // Annual: 1 free scale, so hardware charges are (scaleCount - 1) minimum 0
  const hardwareQty = isAnnual ? Math.max(0, scaleCount - 1) : scaleCount;
  const hardwareTotal = hardwareQty * SCALE_HARDWARE_PRICE;

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
      const { data, error } = await supabase.functions.invoke('create-backroom-checkout', {
        body: {
          organization_id: effectiveOrganization.id,
          plan: selectedPlan,
          scale_count: scaleCount,
          billing_interval: isAnnual ? 'annual' : 'monthly',
          trial_days: trialDays,
          location_ids: Array.from(selectedLocationIds),
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

        {/* Plan Selector */}
        <div className="space-y-2">
          <h2 className={cn(tokens.heading.section, 'text-center')}>Choose Your Plan</h2>
          <p className="text-center text-xs text-muted-foreground font-sans">
            Pricing is per location, per month
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.key;
              const shownPrice = isAnnual ? plan.annualPrice : plan.price;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setSelectedPlan(plan.key)}
                  className={cn(
                    'relative p-5 rounded-xl border-2 text-left transition-all duration-200',
                    'hover:border-primary/50 hover:bg-accent/30',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 bg-card/40',
                  )}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground font-sans text-[10px] px-2 py-0.5">
                      Most Popular
                    </Badge>
                  )}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <h3 className={cn(tokens.label.default, 'text-foreground')}>{plan.name}</h3>
                      <p className="text-xs text-muted-foreground font-sans">{plan.stylists}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      {isAnnual && (
                        <span className="text-sm text-muted-foreground font-sans line-through mr-1">
                          ${plan.price}
                        </span>
                      )}
                      <span className={cn(tokens.stat.large, 'text-foreground')}>
                        ${shownPrice}
                      </span>
                      <span className="text-sm text-muted-foreground font-sans">/mo/location</span>
                    </div>
                    {isAnnual && (
                      <p className="text-[10px] text-primary font-sans flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        ${(shownPrice * 12).toLocaleString()}/yr per location billed annually
                      </p>
                    )}
                    <ul className="space-y-1.5 pt-2 border-t border-border/40">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground font-sans">
                          <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>
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
                      Choose which locations need Backroom · ${perLocationPrice}/mo each
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
                    <label
                      key={loc.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                        isChecked
                          ? 'bg-primary/5 border border-primary/30'
                          : 'border border-transparent hover:bg-accent/30',
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleLocation(loc.id)}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-sans text-sm text-foreground truncate">{loc.name}</span>
                        {cityLabel && (
                          <span className="font-sans text-xs text-muted-foreground">{cityLabel}</span>
                        )}
                      </div>
                      {isChecked && (
                        <span className="font-sans text-xs text-primary shrink-0">
                          +${perLocationPrice}/mo
                        </span>
                      )}
                    </label>
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

        {/* Trial Duration Selector */}
        <Card className="bg-card/60 border-border/40 max-w-2xl mx-auto">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={cn(tokens.label.default, 'text-foreground')}>Start with a Free Trial</p>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  No charge until your trial ends. Cancel anytime.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {TRIAL_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setTrialDays(opt.days)}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-sans font-medium transition-all duration-200',
                    trialDays === opt.days
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Price Summary & CTA */}
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center font-sans text-sm">
                <span className="text-muted-foreground">
                  {currentPlan.name} plan × {locationCount} location{locationCount > 1 ? 's' : ''} {isAnnual ? '(annual)' : ''}
                </span>
                <span className="text-foreground font-medium">
                  ${planTotal}/mo
                  {isAnnual && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (${(planTotal * 12).toLocaleString()}/yr)
                    </span>
                  )}
                </span>
              </div>
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
                  <Clock className="w-4 h-4" />
                  Start {trialDays}-day free trial
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
              No charge for {trialDays} days. Then ${monthlyTotal}/mo
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
