import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Package, Beaker, BarChart3, Shield, Zap, ArrowRight, Loader2, Check, Minus, Plus, Scale, ShieldCheck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { BACKROOM_BASE_PRICE, BACKROOM_PER_SERVICE_FEE, SCALE_LICENSE_MONTHLY, SCALE_HARDWARE_PRICE } from '@/hooks/backroom/useLocationStylistCounts';
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

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations(effectiveOrganization?.id);
  const { isLocationEntitled } = useBackroomLocationEntitlements(effectiveOrganization?.id);

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

  const baseCost = locationCount * BACKROOM_BASE_PRICE;
  const scaleCost = scaleCount * SCALE_LICENSE_MONTHLY;
  const monthlyTotal = baseCost + scaleCost;
  const hardwareTotal = scaleCount * SCALE_HARDWARE_PRICE;

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
              <p className="text-xs text-muted-foreground font-sans">
                Color service usage is tracked automatically and billed based on actual appointments that use the scale.
              </p>
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

        {/* Price Summary & CTA */}
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-5 space-y-3">
              {locationCount > 0 ? (
                <div className="flex justify-between items-center font-sans text-sm">
                  <span className="text-muted-foreground">
                    Location base × {locationCount}
                  </span>
                  <span className="text-foreground font-medium">${baseCost}/mo</span>
                </div>
              ) : (
                <div className="flex justify-between items-center font-sans text-sm">
                  <span className="text-muted-foreground">No locations selected</span>
                  <span className="text-foreground font-medium">$0/mo</span>
                </div>
              )}

              <div className="flex justify-between items-center font-sans text-sm">
                <span className="text-muted-foreground">
                  Color service usage
                </span>
                <span className="text-foreground font-medium text-xs">
                  ${BACKROOM_PER_SERVICE_FEE.toFixed(2)}/appointment
                </span>
              </div>

              {scaleCount > 0 && (
                <>
                  <div className="flex justify-between items-center font-sans text-sm">
                    <span className="text-muted-foreground">
                      Scale license × {scaleCount}
                    </span>
                    <span className="text-foreground font-medium">${scaleCost}/mo</span>
                  </div>
                  <div className="flex justify-between items-center font-sans text-sm">
                    <span className="text-muted-foreground">
                      Acaia Pearl × {scaleCount} (one-time)
                    </span>
                    <span className="text-foreground font-medium">${hardwareTotal}</span>
                  </div>
                </>
              )}

              <div className="border-t border-border/40 pt-3 flex justify-between items-center">
                <span className={cn(tokens.label.default, 'text-foreground')}>
                  Monthly base
                </span>
                <span className={cn(tokens.stat.large, 'text-foreground')}>${monthlyTotal}/mo</span>
              </div>
              <p className="text-xs text-muted-foreground font-sans text-right">
                + usage-based color service fees
                {hardwareTotal > 0 ? ` + $${hardwareTotal} one-time hardware` : ''}
              </p>
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
              30-day money-back guarantee. ${monthlyTotal}/mo base + usage fees. Cancel anytime.
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
