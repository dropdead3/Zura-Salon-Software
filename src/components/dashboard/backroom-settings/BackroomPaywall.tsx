import { useState, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Beaker, BarChart3, Zap, ArrowRight, Loader2,
  Scale, Droplets, ShieldCheck, MapPin, TrendingUp, DollarSign, Star,
  Info, Clock, AlertTriangle, CheckCircle2, XCircle,
  Brain, Users, PackageSearch, ChevronRight,
  Calendar, Timer,
} from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
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
import { BackroomCheckoutConfirmDialog } from './BackroomCheckoutConfirmDialog';
import { CompetitorComparison } from './CompetitorComparison';


const howItWorks = [
  {
    step: '01',
    title: 'Weigh & Track',
    description: 'Every color service is weighed. Grams, formulas, and leftovers are recorded automatically.',
  },
  {
    step: '02',
    title: 'Detect & Reduce',
    description: 'Waste, ghost losses, and variances are flagged. You see exactly where product goes.',
  },
  {
    step: '03',
    title: 'Recover & Reorder',
    description: 'Supply costs are billed back automatically. Predictive alerts prevent stockouts.',
  },
];

const faqItems = [
  {
    question: 'Will this slow down my stylists?',
    answer: 'No. Weighing takes less than 10 seconds and happens while the bowl is already being mixed. Most stylists forget the scale is even there after a few days.',
  },
  {
    question: 'Do I need to train my team?',
    answer: 'Minimal training. The iPad interface walks assistants and stylists through each step. Most teams are comfortable within one or two shifts.',
  },
  {
    question: 'What hardware do I need?',
    answer: 'Each mixing station needs a precision scale (included with purchase) and an iPad with Bluetooth plus a tablet stand (not included). That\'s it.',
  },
  {
    question: 'Is this only for big salons?',
    answer: 'No. Single-chair colorists and 20-chair salons both benefit. The pricing scales with your actual usage — you only pay when you\'re making money.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most salons are fully operational within one day. Product catalog setup takes about 30 minutes, and scale pairing is instant via Bluetooth.',
  },
  {
    question: 'Do I need to change my workflow?',
    answer: 'No. Zura Backroom adapts to how your team already works. The scale sits at your existing station — no rearranging required.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. There are no contracts. Cancel from your account settings at any time.',
  },
];

/* ─── Product Preview Mock ─── */
function ProductPreview() {
  return (
    <div className="space-y-8">
      {/* Section heading */}
      <div className="text-center space-y-3">
        <Eyebrow className="text-muted-foreground">See It In Action</Eyebrow>
        <p className="text-sm md:text-base text-muted-foreground font-sans font-light max-w-2xl mx-auto leading-relaxed">
          A real-time mixing session&nbsp;— every gram tracked, every formula remembered.
        </p>
      </div>

      <div className="relative mx-auto max-w-[720px] overflow-visible isolate">
        {/* Top-edge fade */}
        <div className="absolute -top-16 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

        {/* Browser frame */}
        <div className="relative rounded-xl border border-border/60 bg-card shadow-[0_32px_120px_-48px_hsl(var(--background)/0.9)] overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1 rounded-md bg-muted/50 text-[10px] text-muted-foreground font-sans">
                backroom.getzura.com
              </div>
            </div>
          </div>
          {/* Mock UI content */}
          <div className="p-5 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Beaker className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-display text-[10px] tracking-wider text-foreground">MIXING SESSION</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-sans">
                  <Timer className="w-3 h-3" /> 4:32
                </span>
                <span className="text-[10px] text-muted-foreground font-sans">Station 1</span>
              </div>
            </div>
            {/* Client + formula row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-2">
                <span className="text-[9px] text-muted-foreground font-sans">Client</span>
                <p className="text-xs text-foreground font-sans font-medium">Sarah Mitchell</p>
              </div>
              <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-2">
                <span className="text-[9px] text-muted-foreground font-sans">Last Formula</span>
                <p className="text-xs text-foreground font-sans font-medium">Liberator 7 + Activator (1:1.5)</p>
              </div>
            </div>
            {/* Dispensing bars — Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-sans">Color — Liberator 7</span>
                <span className="text-[10px] text-primary font-sans font-medium">42g / 45g target</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: '93%' }} />
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-success/10 text-success text-[9px] font-sans">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Within target
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground text-[9px] font-sans">
                  3g under allowance
                </span>
              </div>
            </div>
            {/* Dispensing bars — Developer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-sans">Developer — 20 Vol</span>
                <span className="text-[10px] text-muted-foreground font-sans font-medium">63g / 67.5g target</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full bg-accent/50 transition-all" style={{ width: '93%' }} />
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-success/10 text-success text-[9px] font-sans">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Within target
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BackroomPaywall() {
  const [loading, setLoading] = useState(false);
  const [scaleCount, setScaleCount] = useState(0);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [manualStylistCount, setManualStylistCount] = useState(2);
  const [manualScaleOverride, setManualScaleOverride] = useState(false);
  const [auditMinutesPerDay, setAuditMinutesPerDay] = useState(30);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState('mixing');
  const [heroStep, setHeroStep] = useState(0);
  const [heroWeight, setHeroWeight] = useState(0);

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

  // Hero step cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroStep((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Weight counting animation for step 1
  useEffect(() => {
    if (heroStep === 1) {
      setHeroWeight(0);
      const target = 28.4;
      const duration = 2000;
      const startTime = performance.now();
      let raf: number;
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setHeroWeight(+(target * progress).toFixed(1));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    } else if (heroStep !== 2) {
      setHeroWeight(0);
    }
  }, [heroStep]);

  const isSingleLocation = activeLocations.length === 1;
  const locationCount = selectedLocationIds.size;

  const toggleLocation = (locId: string) => {
    if (isSingleLocation) return;
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

  const totalLocations = activeLocations.length || 1;
  const locationFraction = locationCount / totalLocations;

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

  const staffHourlyCost = 18;
  const monthlyAuditHours = (auditMinutesPerDay * 30) / 60;
  const monthlyAuditCost = Math.round(monthlyAuditHours * staffHourlyCost * locationFraction);

  const wasteSavings = Math.round((estimate?.estimatedWasteSavings ?? 0) * locationFraction);
  const supplyRecovery = Math.round((estimate?.estimatedSupplyRecovery ?? 0) * locationFraction);
  const totalSavings = wasteSavings + supplyRecovery + monthlyAuditCost;
  const netBenefit = totalSavings - monthlyTotal;
  const roiMultiplier = monthlyTotal > 0 ? Math.round(totalSavings / monthlyTotal) : 0;

  const yearlySavings = totalSavings * 12;
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

  /* ─── Shared CTA button ─── */
  const ActivateButton = ({ className = '' }: { className?: string }) => (
    <Button
      size="lg"
      className={cn(
        'font-sans font-medium gap-2 rounded-full h-12 px-10 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200',
        className,
      )}
      onClick={() => setConfirmDialogOpen(true)}
      disabled={loading || selectedLocationIds.size === 0}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          Activate Backroom
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Button>
  );

  /* ─── Section heading helper ─── */
  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <h2 className="font-display text-2xl md:text-3xl font-medium tracking-wide text-center text-foreground">
      {children}
    </h2>
  );

  /* ─── Scroll reveal wrapper (disabled — animations removed) ─── */
  const RevealOnScroll = ({ children, className }: { children: React.ReactNode; className?: string; delay?: number }) => {
    return <div className={className}>{children}</div>;
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 sm:px-8 py-12 md:py-16">
      <div className="max-w-[1100px] w-full">

        {/* ═══════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════ */}
        <section className="pt-4 pb-24 md:pb-32 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative">
            {/* Left — Text (tightened spacing) */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="space-y-4">
                <h1 className="font-display text-4xl md:text-5xl lg:text-[60px] font-medium tracking-wide leading-[1.05]">
                  Stop Losing Money in Your Color Room
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto lg:mx-0 font-sans leading-relaxed mt-1">
                  Track every gram. Recover supply costs. Reorder before you run out.
                </p>
              </div>

              <div className="space-y-3">
                <ActivateButton />
                <p className="text-sm text-muted-foreground/60 font-sans">Setup takes minutes. Cancel anytime.</p>
              </div>

            </div>

            {/* Right — Live System Preview (rebalanced) */}
            <div className="flex flex-col relative">
              <Card className="relative overflow-hidden min-h-[360px] bg-card/80 backdrop-blur-xl border-border/60 shadow-xl">
                <CardContent className="p-6 flex flex-col justify-center min-h-[360px] relative">
                  {/* Step content */}
                  <div key={heroStep} className="space-y-4">
                    {heroStep === 0 && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                          <Scale className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">Bowl placed on scale</p>
                        <div className="bg-muted/50 rounded-xl p-6 w-full max-w-[300px]">
                          <p className="text-xs text-muted-foreground/70 font-sans mb-1">Current Weight</p>
                          <p className="font-display text-5xl tracking-wide text-foreground">0.0g</p>
                        </div>
                      </div>
                    )}
                    {heroStep === 1 && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Droplets className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">Dispensing product…</p>
                        <div className="bg-muted/50 rounded-xl p-6 w-full max-w-[300px]">
                          <p className="text-xs text-muted-foreground/70 font-sans mb-1">Danger Jones Liberator 7</p>
                          <p className="font-display text-4xl tracking-wide text-foreground">{heroWeight}g</p>
                          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-200"
                              style={{ width: `${(heroWeight / 28.4) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground/60 font-sans mt-1">Target: 28.4g</p>
                        </div>
                      </div>
                    )}
                    {heroStep === 2 && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">Usage captured</p>
                        <div className="bg-muted/50 rounded-xl p-4 w-full max-w-[300px] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-sans text-foreground">Liberator 7</span>
                            <span className="text-sm font-display tracking-wide text-foreground">28.4g</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-sans text-foreground">Activator 20 Vol</span>
                            <span className="text-sm font-display tracking-wide text-foreground">42.6g</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {heroStep === 3 && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Brain className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">Formula saved to client profile</p>
                        <div className="bg-muted/50 rounded-xl p-4 w-full max-w-[300px] space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-sans text-foreground">Sarah Mitchell</p>
                              <p className="text-xs text-muted-foreground font-sans">Last visit: Mar 2</p>
                            </div>
                          </div>
                          <div className="border-t border-border/30 pt-2 space-y-1">
                            <p className="text-xs text-muted-foreground/70 font-sans">Formula #4</p>
                            <p className="text-xs font-sans text-foreground">Liberator 7 — 28.4g</p>
                            <p className="text-xs font-sans text-foreground">Activator 20 Vol — 42.6g</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {heroStep === 4 && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <PackageSearch className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">Inventory updated</p>
                        <div className="bg-muted/50 rounded-xl p-4 w-full max-w-[300px] space-y-2">
                          {[
                            { name: 'Liberator 7', stock: '340g', status: 'Good', color: 'text-primary' },
                            { name: 'Activator 20 Vol', stock: '180g', status: 'Low', color: 'text-amber-500' },
                            { name: 'Cosmic Crystal Lightener', stock: '45g', status: 'Critical', color: 'text-destructive' },
                          ].map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <span className="font-sans text-foreground">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-sans text-muted-foreground">{item.stock}</span>
                                <span className={cn('text-xs font-sans', item.color)}>{item.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {heroStep === 5 && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <DollarSign className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans">Service cost insight</p>
                        <div className="bg-muted/50 rounded-xl p-4 w-full max-w-[300px] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-sans text-foreground">Service Revenue</span>
                            <span className="text-sm font-display tracking-wide text-foreground">$185</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-sans text-foreground">Product Cost</span>
                            <span className="text-sm font-display tracking-wide text-muted-foreground">$12.40</span>
                          </div>
                          <div className="border-t border-border/30 pt-2 flex items-center justify-between">
                            <span className="text-sm font-sans text-foreground">Margin</span>
                            <span className="text-sm font-display tracking-wide text-primary">93.3%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Integrated step indicators — inside card footer */}
                <div className="border-t border-border/30 px-6 py-3 flex items-center justify-between bg-muted/20">
                  <p className="text-xs text-muted-foreground/70 font-sans font-medium">
                    {['Bowl on Scale', 'Dispensing Product', 'Usage Captured', 'Formula Saved', 'Inventory Updated', 'Cost Insight'][heroStep]}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {['Bowl on Scale', 'Dispensing', 'Usage Captured', 'Formula Saved', 'Inventory Updated', 'Cost Insight'].map((label, i) => (
                      <button
                        key={label}
                        onClick={() => setHeroStep(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-200',
                          heroStep === i ? 'w-6 bg-primary' : 'w-3 bg-muted-foreground/20 hover:bg-muted-foreground/40'
                        )}
                        aria-label={label}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SOCIAL PROOF STRIP
            ═══════════════════════════════════════════ */}
        <div className="py-16 md:py-20 flex flex-col items-center gap-4 max-w-2xl mx-auto text-center">
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-[hsl(var(--oat))] text-[hsl(var(--oat))]" />
            ))}
          </div>
          <blockquote className="space-y-3 mt-2">
            <p className="text-muted-foreground text-lg md:text-xl font-sans leading-relaxed italic">
              "Zura Backroom saved us thousands per month and helps us recoup over $50,000 a year in color costs. 10/10 add-on feature."
            </p>
            <footer className="text-sm text-muted-foreground/60 font-sans tracking-wide">
              — Drop Dead Salon
            </footer>
          </blockquote>
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 1.5 — PRODUCT PREVIEW
            ═══════════════════════════════════════════ */}
        <section className="relative pb-16 md:pb-20">
          <ProductPreview />
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 1.75 — BEFORE / AFTER TRANSFORMATION
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20 bg-muted/20 -mx-6 sm:-mx-8 px-6 sm:px-8 rounded-2xl pt-10 md:pt-12 border-t border-border/40 shadow-[inset_0_2px_4px_0_hsl(var(--border)/0.15)]">
          <RevealOnScroll>
            <div className="text-center mb-10 md:mb-12">
              <SectionHeading>
                How Zura Backroom Transforms Your Color Room
              </SectionHeading>
              <p className="mt-4 text-base md:text-lg text-muted-foreground font-sans font-light max-w-xl mx-auto">
                From guesswork to a controlled, measurable system.
              </p>
            </div>
          </RevealOnScroll>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
            {/* Center arrow divider — desktop only */}
            <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 z-10 items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-background border border-border/60 shadow-sm flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* WITHOUT — deliberately muted */}
            <Card className="bg-card/50 border-destructive/15 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-destructive/10 ring-1 ring-destructive/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
                  </div>
                  <h3 className="font-display text-base tracking-wide uppercase text-destructive">Without Backroom</h3>
                </div>
                <ul className="space-y-5">
                  {[
                    "Stylists guess how much color to mix",
                    "Formulas are scribbled in notebooks or forgotten",
                    "Assistants mix bowls without standard measurements",
                    "Inventory runs out mid-service without warning",
                    "Product costs per service are unknown",
                    "Chemical waste goes untracked",
                    "Service profitability is a blind spot",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <span className="text-[15px] font-sans text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* WITH — elevated, the "winning" side */}
            <Card className="bg-success/[0.05] border-success/20 shadow-md ring-1 ring-success/10">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-success/10 ring-1 ring-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-success" />
                  </div>
                  <h3 className="font-display text-base tracking-wide uppercase text-success">With Backroom</h3>
                </div>
                <ul className="space-y-5">
                  {[
                    "Every formula is saved automatically per client",
                    "Stylists see the last formula instantly at the chair",
                    "Assistants prep bowls from guided mixing screens",
                    "Product usage is tracked to the gram",
                    "Inventory shortages are predicted before they happen",
                    "Waste is visible, measurable, and reducible",
                    "Service-level profitability becomes clear",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="text-[15px] font-sans text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

        </section>




        {/* ═══════════════════════════════════════════
            SECTION 2 — THE PROBLEM (Loss Aversion)
            ═══════════════════════════════════════════ */}
        {(estimate || estimateLoading) && (
          <section className="pb-20 md:pb-24">
            <div className="space-y-6">
              <Card className="bg-destructive/[0.03] border-destructive/20 overflow-hidden">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-sans text-base md:text-lg font-medium text-destructive">
                        What Your Color Room Is Costing You Right Now
                      </p>
                      <p className="text-sm text-muted-foreground font-sans mt-1">
                        Most salons have no visibility into color room costs. Here is what the data shows.
                      </p>
                    </div>
                  </div>

                  {estimateLoading ? (
                    <div className="grid grid-cols-3 gap-5">
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                    </div>
                  ) : estimate ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {[
                          { value: wasteSavings, label: 'product waste / mo' },
                          { value: monthlyAuditCost, label: 'staff time wasted / mo' },
                          { value: supplyRecovery, label: 'unrecovered supply costs / mo' },
                        ].map((tile) => (
                          <div key={tile.label} className="p-5 rounded-xl bg-destructive/5 border border-destructive/15 text-center shadow-sm">
                            <p className="font-display text-3xl tracking-wide text-destructive">
                              <AnimatedNumber value={tile.value} prefix="$" duration={1000} />
                            </p>
                            <p className="text-sm text-muted-foreground font-sans mt-2">{tile.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Total monthly loss */}
                      <div className="flex items-center justify-center gap-4 pt-4">
                        <div className="h-px flex-1 bg-destructive/20" />
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground font-sans">Estimated total monthly loss</p>
                          <p className="font-display text-4xl md:text-[44px] tracking-wide text-destructive mt-2">
                            <AnimatedNumber value={totalSavings} prefix="$" duration={1200} />
                            <span className="text-lg text-destructive/60 ml-1">/mo</span>
                          </p>
                        </div>
                        <div className="h-px flex-1 bg-destructive/20" />
                      </div>

                      {/* Stylist slider for manual estimate adjustment */}
                      {!estimate.hasRealData && (
                        <div className="space-y-3 pt-2">
                          <p className="text-sm text-muted-foreground font-sans italic text-center">
                            Based on industry averages — adjust your stylist count for a personalized estimate:
                          </p>
                          <div className="flex items-center gap-4 max-w-xs mx-auto">
                            <span className="font-sans text-sm text-muted-foreground w-20 shrink-0">
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

                      {/* Manual inventory time */}
                      <div className="border-t border-destructive/10 pt-4 flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        <p className="text-sm text-muted-foreground font-sans">
                          Plus ~<span className="text-foreground font-medium">{monthlyAuditHours.toFixed(0)} hours</span> of staff time recovered monthly
                        </p>
                      </div>

                      {estimate.hasRealData && (
                        <p className="text-xs text-muted-foreground font-sans italic text-center">
                          Based on {estimate.totalColorAppointments.toLocaleString()} color appointments over {estimate.dataWindowDays} days
                        </p>
                      )}
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex gap-2 items-start px-1">
                <Info className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground/60 font-sans leading-relaxed">
                  Estimates based on scheduled color and chemical service appointments. Actual results may vary.
                </p>
              </div>
            </div>
          </section>
        )}


        {/* ═══════════════════════════════════════════
            SECTION 4.25 — INTERACTIVE FEATURE REVEAL
            ═══════════════════════════════════════════ */}
        <section className="pb-24 md:pb-32">
          <div className="space-y-8 md:space-y-10">
            <div className="text-center space-y-3">
              <SectionHeading>Explore Zura Backroom</SectionHeading>
              <p className="font-sans text-base text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
                Click each feature to see how it works inside your salon.
              </p>
            </div>

            {/* Mobile: horizontal scrollable pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden scrollbar-none">
              {[
                { key: 'mixing', icon: Scale, title: 'Smart Mixing' },
                { key: 'formulas', icon: Brain, title: 'Formula Memory' },
                { key: 'inventory', icon: PackageSearch, title: 'Inventory' },
                { key: 'profitability', icon: DollarSign, title: 'Profitability' },
                { key: 'insights', icon: BarChart3, title: 'Insights' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFeature(f.key)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-sans font-medium whitespace-nowrap border transition-all duration-200 shrink-0',
                    activeFeature === f.key
                      ? 'bg-primary/10 border-primary/30 text-foreground'
                      : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.title}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left — Feature Selector (desktop) */}
              <div className="hidden lg:flex flex-col gap-2">
                {[
                  { key: 'mixing', icon: Scale, title: 'Smart Mixing', desc: 'The scale captures every gram while stylists mix normally.' },
                  { key: 'formulas', icon: Brain, title: 'Formula Memory', desc: 'Formulas are saved automatically to the client profile.' },
                  { key: 'inventory', icon: PackageSearch, title: 'Inventory Intelligence', desc: 'Every bowl updates product inventory in real time.' },
                  { key: 'profitability', icon: DollarSign, title: 'Service Profitability', desc: 'Product costs are connected directly to each service.' },
                  { key: 'insights', icon: BarChart3, title: 'Operational Insights', desc: 'Backroom activity becomes measurable salon intelligence.' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFeature(f.key)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200',
                      activeFeature === f.key
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'bg-transparent border-border/40 hover:bg-muted/40'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200',
                      activeFeature === f.key ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <f.icon className={cn('w-5 h-5', activeFeature === f.key ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-display text-sm tracking-wide text-foreground">{f.title}</span>
                      <p className="font-sans text-sm text-muted-foreground font-light mt-0.5">{f.desc}</p>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 shrink-0 transition-all duration-200',
                      activeFeature === f.key ? 'text-primary opacity-100' : 'text-muted-foreground/40 opacity-0'
                    )} />
                  </button>
                ))}
              </div>

              {/* Right — Visualization Panel */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6 min-h-[320px] flex flex-col justify-center">
                  <div key={activeFeature} className="animate-fade-in-fast">
                    {activeFeature === 'mixing' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-4 h-4 text-primary" />
                          <span className="font-display text-xs tracking-wide text-muted-foreground">LIVE SCALE READOUT</span>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                          {[
                            { name: 'Koleston 7/0', target: 30, current: 28.4, unit: 'g' },
                            { name: '6% Developer', target: 60, current: 60.2, unit: 'g' },
                          ].map((item) => {
                            const pct = Math.min((item.current / item.target) * 100, 100);
                            const reached = item.current >= item.target;
                            return (
                              <div key={item.name} className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="font-sans text-sm text-foreground">{item.name}</span>
                                  <span className="font-sans text-xs text-muted-foreground tabular-nums">
                                    {item.current}{item.unit} / {item.target}{item.unit}
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full transition-all', reached ? 'bg-success' : 'bg-primary')}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="font-sans text-sm text-success">Bowl complete — formula saved</span>
                        </div>
                      </div>
                    )}

                    {activeFeature === 'formulas' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="w-4 h-4 text-primary" />
                          <span className="font-display text-xs tracking-wide text-muted-foreground">CLIENT FORMULA HISTORY</span>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border/40">
                            <div>
                              <p className="font-sans text-sm font-medium text-foreground">Sarah Mitchell</p>
                              <p className="font-sans text-xs text-muted-foreground">Last visit: Feb 28, 2026</p>
                            </div>
                            <span className="font-sans text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">3 formulas</span>
                          </div>
                          {[
                            { product: 'Koleston 7/0', weight: '30g', date: 'Feb 28' },
                            { product: 'Illumina 8/05', weight: '25g', date: 'Jan 15' },
                            { product: 'Color Touch 9/16', weight: '20g', date: 'Dec 12' },
                          ].map((f) => (
                            <div key={f.product} className="flex items-center justify-between py-1">
                              <span className="font-sans text-sm text-foreground">{f.product}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-sans text-xs tabular-nums text-muted-foreground">{f.weight}</span>
                                <span className="font-sans text-xs text-muted-foreground/60">{f.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeFeature === 'inventory' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <PackageSearch className="w-4 h-4 text-primary" />
                          <span className="font-display text-xs tracking-wide text-muted-foreground">INVENTORY STATUS</span>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-4">
                          <div className="space-y-0">
                            {[
                              { product: 'Koleston 7/0', stock: '340g', status: 'Good', color: 'text-success bg-success/10' },
                              { product: 'Illumina 8/05', stock: '85g', status: 'Low', color: 'text-amber-500 bg-amber-500/10' },
                              { product: 'Blondor Powder', stock: '12g', status: 'Critical', color: 'text-red-500 bg-red-500/10' },
                            ].map((item, i, arr) => (
                              <div key={item.product} className={cn('flex items-center justify-between py-2.5', i < arr.length - 1 && 'border-b border-border/30')}>
                                <span className="font-sans text-sm text-foreground">{item.product}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-sans text-xs tabular-nums text-muted-foreground">{item.stock}</span>
                                  <span className={cn('font-sans text-xs px-2 py-0.5 rounded-full', item.color)}>{item.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeFeature === 'profitability' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <span className="font-display text-xs tracking-wide text-muted-foreground">SERVICE COST BREAKDOWN</span>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border/40">
                            <p className="font-sans text-sm font-medium text-foreground">Full Colour & Blowdry</p>
                            <span className="font-sans text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">78% margin</span>
                          </div>
                          {[
                            { label: 'Service Revenue', value: '$185.00' },
                            { label: 'Product Cost', value: '$28.40' },
                            { label: 'Labor Cost', value: '$12.50' },
                            { label: 'Net Profit', value: '$144.10', highlight: true },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between py-0.5">
                              <span className="font-sans text-sm text-muted-foreground">{row.label}</span>
                              <span className={cn('font-sans text-sm tabular-nums', row.highlight ? 'text-success font-medium' : 'text-foreground')}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeFeature === 'insights' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          <span className="font-display text-xs tracking-wide text-muted-foreground">BACKROOM INTELLIGENCE</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { label: 'Bowls Mixed', value: '847', sub: 'This month' },
                            { label: 'Avg Waste', value: '3.2%', sub: '↓ from 5.1%' },
                            { label: 'Top Product', value: 'Koleston 7/0', sub: '142 uses' },
                          ].map((stat) => (
                            <div key={stat.label} className="rounded-lg bg-muted/40 p-3 text-center space-y-1">
                              <p className="font-display text-xs tracking-wide text-muted-foreground">{stat.label}</p>
                              <p className="font-sans text-lg font-medium text-foreground tabular-nums">{stat.value}</p>
                              <p className="font-sans text-xs text-muted-foreground/70">{stat.sub}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex justify-center pt-4">
            <ActivateButton />
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 4.5 — COMPETITOR COMPARISON
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <CompetitorComparison />
        </section>







        {/* ═══════════════════════════════════════════
            SECTION 4.98 — REAL SALON SCENARIO
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24 bg-muted/20 -mx-6 sm:-mx-8 px-6 sm:px-8 rounded-2xl pt-10 md:pt-12 shadow-[inset_0_1px_0_0_hsl(var(--border)/0.3)]">
          <div className="space-y-10 md:space-y-12">
            <RevealOnScroll>
              <div className="text-center space-y-3">
                <SectionHeading>How It Works</SectionHeading>
                <p className="font-sans text-base text-muted-foreground font-light max-w-2xl mx-auto">
                  From the first bowl to the final insight — three steps, one connected system.
                </p>
              </div>
            </RevealOnScroll>

            {/* 3-step summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
              {howItWorks.map((step, i) => (
                <RevealOnScroll key={step.step} delay={i * 100}>
                  <Card className="bg-card border-border/50 shadow-sm hover:shadow-md transition-shadow duration-150">
                    <CardContent className="p-6 space-y-3">
                      <span className="font-display text-2xl tracking-wider text-primary/20">{step.step}</span>
                      <p className="font-sans text-lg font-medium text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground font-sans leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                </RevealOnScroll>
              ))}
            </div>

            {/* Divider */}
            <div className="flex justify-center">
              <div className="w-12 h-px bg-border/40" />
            </div>

            <RevealOnScroll>
              <p className="text-center font-display text-lg tracking-wide text-foreground">
                Here's what that looks like in practice
              </p>
            </RevealOnScroll>

            {/* Desktop: horizontal timeline */}
            <div className="hidden md:grid grid-cols-7 gap-2 items-start">
              {[
                { icon: Calendar, step: '01', title: 'Client Arrives', desc: 'Sarah arrives for a full highlight service.', preview: null },
                { icon: Users, step: '02', title: 'Bowl Prepared', desc: 'The assistant stages the mixing bowl on the scale.', preview: null },
                {
                  icon: Scale, step: '03', title: 'Product Measured', desc: '32g of Koleston 7/0 is dispensed and recorded.',
                  preview: (
                    <Card className="mt-3 bg-card border-border/40 shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <p className="font-sans text-xs text-muted-foreground">Koleston 7/0</p>
                        <p className="font-display text-xl tracking-wide text-foreground">32.0<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 w-[80%]" />
                        </div>
                      </CardContent>
                    </Card>
                  ),
                },
                { icon: Zap, step: '04', title: 'Usage Captured', desc: 'The system logs every product used in the session.', preview: null },
                {
                  icon: Brain, step: '05', title: 'Formula Saved', desc: "Sarah's formula is stored for her next visit.",
                  preview: (
                    <Card className="mt-3 bg-card border-border/40 shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <p className="font-sans text-sm text-foreground">Sarah M.</p>
                        <p className="font-sans text-xs text-muted-foreground">Koleston 7/0 — 32g</p>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-sans">
                          Saved automatically
                        </span>
                      </CardContent>
                    </Card>
                  ),
                },
                { icon: PackageSearch, step: '06', title: 'Inventory Updates', desc: 'Koleston 7/0 stock adjusts automatically.', preview: null },
                {
                  icon: DollarSign, step: '07', title: 'Cost Visible', desc: "The service's true product cost is $18.40.",
                  preview: (
                    <Card className="mt-3 bg-card border-border/40 shadow-sm">
                       <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs text-muted-foreground">Revenue</span>
                          <span className="font-display text-sm tracking-wide text-foreground">$185</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs text-muted-foreground">Product Cost</span>
                          <span className="font-display text-sm tracking-wide text-foreground">$18.40</span>
                        </div>
                        <span className="inline-block px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-sans">
                          90% margin
                        </span>
                      </CardContent>
                    </Card>
                  ),
                },
              ].map((item, idx, arr) => (
                <div key={idx} className="relative flex flex-col items-center text-center">
                  {idx < arr.length - 1 && (
                    <div className="absolute top-6 -right-2 z-10 text-muted-foreground/30">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                  <span className="font-display text-2xl tracking-wide text-primary/20 mb-2">{item.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-background border border-border/40 flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-display text-xs tracking-wide text-foreground mb-1">{item.title}</h4>
                  <p className="font-sans text-xs text-muted-foreground font-light leading-relaxed max-w-[130px]">{item.desc}</p>
                  {item.preview}
                </div>
              ))}
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden space-y-0">
              {[
                { icon: Calendar, step: '01', title: 'Client Arrives', desc: 'Sarah arrives for a full highlight service.', preview: null },
                { icon: Users, step: '02', title: 'Bowl Prepared', desc: 'The assistant stages the mixing bowl on the scale.', preview: null },
                {
                  icon: Scale, step: '03', title: 'Product Measured', desc: '32g of Koleston 7/0 is dispensed and recorded.',
                  preview: (
                    <Card className="mt-2 bg-card border-border/40 shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <p className="font-sans text-xs text-muted-foreground">Koleston 7/0</p>
                        <p className="font-display text-xl tracking-wide text-foreground">32.0<span className="text-xs text-muted-foreground ml-0.5">g</span></p>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 w-[80%]" />
                        </div>
                      </CardContent>
                    </Card>
                  ),
                },
                { icon: Zap, step: '04', title: 'Usage Captured', desc: 'The system logs every product used in the session.', preview: null },
                {
                  icon: Brain, step: '05', title: 'Formula Saved', desc: "Sarah's formula is stored for her next visit.",
                  preview: (
                    <Card className="mt-2 bg-card border-border/40 shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <p className="font-sans text-sm text-foreground">Sarah M.</p>
                        <p className="font-sans text-xs text-muted-foreground">Koleston 7/0 — 32g</p>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-sans">
                          Saved automatically
                        </span>
                      </CardContent>
                    </Card>
                  ),
                },
                { icon: PackageSearch, step: '06', title: 'Inventory Updates', desc: 'Koleston 7/0 stock adjusts automatically.', preview: null },
                {
                  icon: DollarSign, step: '07', title: 'Cost Visible', desc: "The service's true product cost is $18.40.",
                  preview: (
                    <Card className="mt-2 bg-card border-border/40 shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs text-muted-foreground">Revenue</span>
                          <span className="font-display text-sm tracking-wide text-foreground">$185</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs text-muted-foreground">Product Cost</span>
                          <span className="font-display text-sm tracking-wide text-foreground">$18.40</span>
                        </div>
                        <span className="inline-block px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-sans">
                          90% margin
                        </span>
                      </CardContent>
                    </Card>
                  ),
                },
              ].map((item, idx, arr) => (
                <div key={idx} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {idx < arr.length - 1 && (
                    <div className="absolute left-[23px] top-12 bottom-0 w-px bg-border/40" />
                  )}
                  {/* Icon */}
                  <div className="relative z-10 shrink-0 w-12 h-12 rounded-xl bg-background border border-border/40 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 pt-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display text-xs tracking-wider text-primary/40">{item.step}</span>
                      <h4 className="font-display text-xs tracking-wide text-foreground">{item.title}</h4>
                    </div>
                    <p className="font-sans text-xs text-muted-foreground font-light leading-relaxed">{item.desc}</p>
                    {item.preview}
                  </div>
                </div>
              ))}
            </div>

            {/* Supporting message */}
            <p className="text-center font-sans text-sm text-muted-foreground font-light max-w-xl mx-auto">
              Zura Backroom works quietly during every service, turning everyday activity into structured salon intelligence.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center py-4">
          <div className="w-12 h-px bg-border/40" />
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 5 — PRICING + ROI
            ═══════════════════════════════════════════ */}
        <section className="pb-24 md:pb-32 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(var(--primary) / 0.02), transparent 60%)' }} />
          <div className="space-y-8 md:space-y-10 relative">
            <RevealOnScroll><SectionHeading>Pricing</SectionHeading></RevealOnScroll>

            <RevealOnScroll>
              <Card className="bg-card border-border/50 shadow-md">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="p-5 rounded-xl bg-muted/30 border border-border/40 text-center">
                    <p className="font-display text-3xl tracking-wide text-foreground">${BACKROOM_BASE_PRICE}</p>
                    <p className="text-sm text-muted-foreground font-sans mt-2">per location / month</p>
                  </div>
                  <div className="p-5 rounded-xl bg-muted/30 border border-border/40 text-center">
                    <p className="font-display text-3xl tracking-wide text-foreground">${BACKROOM_PER_SERVICE_FEE.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground font-sans mt-2">per color service</p>
                  </div>
                </div>

                {/* ROI anchor */}
                <div className="text-center py-2">
                  <p className="font-sans text-base text-muted-foreground">
                    One highlight service covers your entire monthly cost.
                  </p>
                  <p className="font-sans text-sm text-muted-foreground/60 mt-1">
                    You only pay when you're making money.
                  </p>
                </div>

                {/* Annual impact summary */}
                {hasPositiveBenefit && estimate && (
                  <div className="rounded-xl bg-gradient-to-br from-success/5 to-primary/5 border border-success/20 p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <p className="font-display text-xs tracking-wider text-success">Projected Annual Impact</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-3xl md:text-4xl tracking-wide text-success">
                        +<AnimatedNumber value={yearlyNetBenefit} duration={1200} formatOptions={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }} />
                        <span className="text-base text-success/70 ml-1">/yr</span>
                      </p>
                      {roiMultiplier >= 2 && (
                        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-sans font-medium">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {roiMultiplier}× ROI
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-success/60 transition-all duration-700"
                          style={{ width: `${Math.min(100, yearlySavings > 0 ? (yearlyCost / yearlySavings) * 100 : 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-sans text-center">
                        Cost is only {yearlySavings > 0 ? Math.round((yearlyCost / yearlySavings) * 100) : 0}% of annual benefit
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </RevealOnScroll>

            {/* Location Selector */}
            {activeLocations.length > 0 && (
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-sans text-base font-medium text-foreground">
                          {isSingleLocation ? 'Your Location' : 'Select Locations'}
                        </p>
                        <p className="text-sm text-muted-foreground font-sans mt-0.5">
                          ${BACKROOM_BASE_PRICE}/mo per location
                        </p>
                      </div>
                    </div>
                    {!isSingleLocation && (
                      <Button variant="ghost" size="sm" className="font-sans text-sm" onClick={selectAllLocations}>
                        {selectedLocationIds.size === activeLocations.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                  </div>

                  {isSingleLocation ? (
                    (() => {
                      const loc = activeLocations[0];
                      const cityLabel = loc.city ? loc.city.split(',')[0]?.trim() : '';
                      return (
                        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-primary/5 border border-primary/30">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="font-sans text-sm text-foreground truncate">{loc.name}</span>
                              {cityLabel && <span className="font-sans text-sm text-muted-foreground">{cityLabel}</span>}
                            </div>
                          </div>
                          <span className="font-sans text-sm text-primary shrink-0">${BACKROOM_BASE_PRICE}/mo</span>
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      <div className="space-y-2">
                        {activeLocations.map((loc) => {
                          const isChecked = selectedLocationIds.has(loc.id);
                          const cityLabel = loc.city ? loc.city.split(',')[0]?.trim() : '';
                          return (
                            <div
                              key={loc.id}
                              className={cn(
                                'flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-150 cursor-pointer',
                                isChecked ? 'bg-primary/5 border border-primary/30' : 'border border-transparent hover:bg-accent/30',
                              )}
                              onClick={() => toggleLocation(loc.id)}
                            >
                              <Checkbox checked={isChecked} className="pointer-events-none" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-sans text-sm text-foreground truncate">{loc.name}</span>
                                  {cityLabel && <span className="font-sans text-sm text-muted-foreground">{cityLabel}</span>}
                                </div>
                              </div>
                              {isChecked && (
                                <span className="font-sans text-sm text-primary shrink-0">+${BACKROOM_BASE_PRICE}/mo</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {selectedLocationIds.size > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/40 flex justify-between items-center">
                          <span className="font-sans text-sm text-muted-foreground">
                            {selectedLocationIds.size} location{selectedLocationIds.size > 1 ? 's' : ''} selected
                          </span>
                          <span className="font-sans text-base text-foreground font-medium">${baseCost}/mo</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
            {/* Hardware sub-section */}
            <RevealOnScroll>
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-sans text-base md:text-lg font-medium text-foreground">Precision Scales</p>
                      <p className="text-sm text-muted-foreground font-sans mt-1">
                        Connect to your mixing stations via Bluetooth.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/40 text-center">
                      <p className="font-display text-2xl tracking-wide text-foreground">${SCALE_HARDWARE_PRICE}</p>
                      <p className="text-sm text-muted-foreground font-sans mt-2">per scale (one-time)</p>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/30 border border-border/40 text-center">
                      <p className="font-display text-2xl tracking-wide text-foreground">${SCALE_LICENSE_MONTHLY}</p>
                      <p className="text-sm text-muted-foreground font-sans mt-2">per scale / month</p>
                    </div>
                  </div>

                  {/* Recommendation summary */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="space-y-1">
                      <p className="font-sans text-sm text-foreground font-medium">
                        {recommendedScales} scale{recommendedScales !== 1 ? 's' : ''} recommended
                      </p>
                      <p className="text-xs text-muted-foreground font-sans">
                        Based on 1 scale per 10 daily color appointments
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        onClick={() => { setManualScaleOverride(true); setScaleCount(Math.max(0, scaleCount - 1)); }}
                        disabled={scaleCount <= 0}
                      >
                        <span className="text-sm">−</span>
                      </Button>
                      <span className={cn(tokens.stat.large, 'w-8 text-center text-foreground text-lg')}>{scaleCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg"
                        onClick={() => { setManualScaleOverride(true); setScaleCount(Math.min(20, scaleCount + 1)); }}
                        disabled={scaleCount >= 20}
                      >
                        <span className="text-sm">+</span>
                      </Button>
                    </div>
                  </div>
                  {manualScaleOverride && scaleCount !== recommendedScales && (
                    <button
                      type="button"
                      className="text-sm text-primary font-sans hover:underline transition-colors"
                      onClick={() => { setManualScaleOverride(false); setScaleCount(recommendedScales); }}
                    >
                      Reset to recommended
                    </button>
                  )}

                  {/* iPad requirement */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                    <Info className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground font-sans">
                      Each station uses an iPad with Bluetooth for the mixing interface. A tablet stand is recommended.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </RevealOnScroll>
          </div>
        </section>

        {/* Divider — Pricing → Trust */}
        <div className="flex justify-center py-4">
          <div className="w-12 h-px bg-border/40" />
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 7 — TRUST + FAQ
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="space-y-6">
            {/* 30-Day Guarantee */}
            <Card className="bg-success/5 border-success/20 shadow-sm">
              <CardContent className="p-6 md:p-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="font-sans text-base font-medium text-success">30-Day Money-Back Guarantee</p>
                  <p className="text-sm text-muted-foreground font-sans mt-1">
                    If Backroom doesn't work for your salon, get a full refund within 30 days. No questions asked.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="bg-card border-border/50 shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-4">
                <p className="font-sans text-base font-medium text-foreground">Common Questions</p>
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border/30">
                      <AccordionTrigger className="text-sm font-sans text-foreground hover:no-underline py-3">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground font-sans pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>




        {/* ═══════════════════════════════════════════
            SECTION 8 — FINAL CTA
            ═══════════════════════════════════════════ */}
        <section className="border-t border-border/20 pt-16 pb-8 text-center space-y-6 relative">
          {hasPositiveBenefit && estimate ? (
            <p className="font-sans text-base text-muted-foreground">
              Projected to recover {formatCurrency(yearlySavings)} annually{roiMultiplier >= 2 ? ` — ${roiMultiplier}× your cost` : ''}.
            </p>
          ) : (
            <p className="font-sans text-base text-muted-foreground">
              Most salons recover their Backroom cost within the first week.
            </p>
          )}
          <ActivateButton />
        </section>

      </div>

      {/* Checkout Confirm Dialog */}
      <BackroomCheckoutConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={() => {
          setConfirmDialogOpen(false);
          handleCheckout();
        }}
        loading={loading}
        organizationId={effectiveOrganization?.id}
        locationCount={locationCount}
        scaleCount={scaleCount}
        estimatedMonthlyServices={Math.round((estimate?.monthlyColorServices ?? 0) * locationFraction)}
        estimatedMonthlySavings={totalSavings}
        netBenefit={netBenefit}
      />
    </div>
  );
}
