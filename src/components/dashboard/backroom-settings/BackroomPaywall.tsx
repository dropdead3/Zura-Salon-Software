import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Beaker, BarChart3, Shield, Zap, ArrowRight, Loader2,
  Scale, Droplets, ShieldCheck, MapPin, TrendingUp, DollarSign, Star,
  Info, Clock, AlertTriangle, CheckCircle2,
  Brain, Users, PackageSearch, ChevronRight,
} from 'lucide-react';
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

/* ─── Feature Groups (outcome-driven, 6 categories) ─── */
const featureGroups = [
  {
    icon: Scale,
    title: 'Smart Dispensing',
    outcome: 'Know exactly what goes into every bowl.',
    bullets: [
      'Every gram dispensed is measured automatically',
      'Formulas are saved as they\'re mixed',
      'Excess product is flagged instantly',
    ],
  },
  {
    icon: Brain,
    title: 'Formula Memory',
    outcome: 'Your formulas are remembered automatically.',
    bullets: [
      'Pull up any client\'s last formula in seconds',
      'Suggested ratios based on history',
      'No more guessing what was used last time',
    ],
  },
  {
    icon: Users,
    title: 'Assistant Workflows',
    outcome: 'Assistants can prep bowls before services start.',
    bullets: [
      'Define each service\'s prep steps once',
      'Assistants follow guided mixing screens',
      'Notifications when bowls are ready',
    ],
  },
  {
    icon: PackageSearch,
    title: 'Supply Intelligence',
    outcome: 'Never run out of color during a service.',
    bullets: [
      'Alerts before stock runs low',
      'Tomorrow\'s appointments drive today\'s orders',
      'No more surprise shortages',
    ],
  },
  {
    icon: BarChart3,
    title: 'Profit Visibility',
    outcome: 'See which services make money and which don\'t.',
    bullets: [
      'True product cost for every appointment',
      'See your real margins per service',
      'Bill product costs back to clients automatically',
    ],
  },
  {
    icon: Shield,
    title: 'Waste Control',
    outcome: 'Find out where product disappears.',
    bullets: [
      'Spot product that disappears between uses',
      'Know if bowls are being reweighed',
      'Get notified when usage spikes',
    ],
  },
];

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
    <div className="relative mx-auto max-w-[640px]">
      {/* Browser frame */}
      <div className="rounded-xl border border-border/60 bg-card shadow-2xl shadow-primary/[0.06] overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/30">
          <div className="flex gap-1.5">
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
            <span className="text-[10px] text-muted-foreground font-sans">Station 1</span>
          </div>
          {/* Client + formula row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-1.5">
              <span className="text-[9px] text-muted-foreground font-sans">Client</span>
              <p className="text-xs text-foreground font-sans font-medium">Sarah Mitchell</p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-1.5">
              <span className="text-[9px] text-muted-foreground font-sans">Last Formula</span>
              <p className="text-xs text-foreground font-sans font-medium">7N + 8G (1:1.5)</p>
            </div>
          </div>
          {/* Dispensing bars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-sans">Dispensed</span>
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
        </div>
      </div>
      {/* Soft glow behind */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-gradient-to-br from-primary/30 to-transparent rounded-3xl scale-110" />
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
        'font-sans font-medium gap-2 rounded-full h-12 px-10 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200',
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

  return (
    <div className="flex flex-col items-center justify-center px-6 sm:px-8 py-12 md:py-16">
      <div className="max-w-[1100px] w-full">

        {/* ═══════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════ */}
        <section className="text-center space-y-8 pt-4 pb-20 md:pb-24">
          {/* Headline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-5xl lg:text-[56px] font-medium tracking-wide leading-[1.1]">
              Stop Losing Money in Your Color Room
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto font-sans leading-relaxed">
              Track every gram. Recover supply costs. Reorder before you run out.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <ActivateButton />
            <p className="text-sm text-muted-foreground/60 font-sans">Setup takes minutes. Cancel anytime.</p>
          </div>

          {/* Social Proof */}
          <div className="border-t border-border/20 pt-8 mt-4 max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-center space-y-2">
                <p className="text-muted-foreground text-sm md:text-base font-sans leading-relaxed italic">
                  "Zura Backroom saved us thousands per month and helps us recoup over $50,000 a year in color costs. 10/10 add-on feature."
                </p>
                <footer className="text-xs text-muted-foreground/70 font-sans tracking-wide">
                  — Drop Dead Salon
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 1.5 — PRODUCT PREVIEW
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <ProductPreview />
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 1.75 — BEFORE / AFTER TRANSFORMATION
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-normal tracking-wide uppercase text-foreground">
              How Zura Backroom Transforms Your Color Room
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground font-sans font-light max-w-xl mx-auto">
              From guesswork to a controlled, measurable system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* WITHOUT */}
            <Card className="bg-destructive/[0.03] border-destructive/20 hover-lift">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <h3 className="font-display text-base tracking-wide uppercase text-destructive">Without Backroom</h3>
                </div>
                <ul className="space-y-3.5">
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
                      <XCircle className="w-4 h-4 text-destructive/60 mt-0.5 shrink-0" />
                      <span className="text-sm font-sans text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* WITH */}
            <Card className="bg-success/[0.03] border-success/20 hover-lift">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="font-display text-base tracking-wide uppercase text-success">With Backroom</h3>
                </div>
                <ul className="space-y-3.5">
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
                      <CheckCircle2 className="w-4 h-4 text-success/60 mt-0.5 shrink-0" />
                      <span className="text-sm font-sans text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-8">
            <ActivateButton />
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
                    <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
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
            SECTION 3 — HOW IT WORKS
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="space-y-8 md:space-y-10">
            <SectionHeading>How It Works</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
              {howItWorks.map((step) => (
                <Card key={step.step} className="bg-card border-border/50 shadow-sm hover-lift">
                  <CardContent className="p-6 md:p-8 space-y-3">
                    <span className="font-display text-2xl tracking-wider text-primary/20">{step.step}</span>
                    <p className="font-sans text-lg font-medium text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 4 — WHAT YOU GET (6 feature cards)
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="space-y-8 md:space-y-10">
            <SectionHeading>What You Get</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {featureGroups.map((group) => (
                <Card key={group.title} className="bg-card border-border/50 shadow-sm hover-lift">
                  <CardContent className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <group.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-sans text-base md:text-lg font-medium text-foreground">{group.title}</p>
                        <p className="text-sm text-muted-foreground font-sans mt-0.5">{group.outcome}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pl-14">
                      {group.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground font-sans">{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mid-page CTA */}
            <div className="flex justify-center pt-4">
              <ActivateButton />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 4.5 — COMPETITOR COMPARISON
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <CompetitorComparison />
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 5 — PRICING + ROI
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="space-y-8 md:space-y-10">
            <SectionHeading>Pricing</SectionHeading>

            <Card className="bg-card border-border/50 shadow-sm">
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
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-primary/5 border border-emerald-500/20 p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <p className="font-display text-xs tracking-wider text-emerald-400">Projected Annual Impact</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-3xl md:text-4xl tracking-wide text-emerald-400">
                        +<AnimatedNumber value={yearlyNetBenefit} duration={1200} formatOptions={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }} />
                        <span className="text-base text-emerald-400/70 ml-1">/yr</span>
                      </p>
                      {roiMultiplier >= 2 && (
                        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-sans font-medium">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {roiMultiplier}× ROI
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60 transition-all duration-700"
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

            {/* Location Selector */}
            {activeLocations.length > 0 && (
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
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
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/30">
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
                                'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 cursor-pointer',
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
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 6 — HARDWARE
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="space-y-8 md:space-y-10">
            <SectionHeading>Hardware</SectionHeading>
            <Card className="bg-card border-border/50 shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-sans text-base md:text-lg font-medium text-foreground">Precision Scales</p>
                    <p className="text-sm text-muted-foreground font-sans mt-0.5">
                      Connect to your mixing stations via Bluetooth.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="p-5 rounded-xl bg-muted/30 border border-border/40 text-center">
                    <p className="font-display text-2xl tracking-wide text-foreground">${SCALE_HARDWARE_PRICE}</p>
                    <p className="text-sm text-muted-foreground font-sans mt-1.5">per scale (one-time)</p>
                  </div>
                  <div className="p-5 rounded-xl bg-muted/30 border border-border/40 text-center">
                    <p className="font-display text-2xl tracking-wide text-foreground">${SCALE_LICENSE_MONTHLY}</p>
                    <p className="text-sm text-muted-foreground font-sans mt-1.5">per scale / month</p>
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
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 7 — TRUST + FAQ
            ═══════════════════════════════════════════ */}
        <section className="pb-20 md:pb-24">
          <div className="space-y-6">
            {/* 30-Day Guarantee */}
            <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm">
              <CardContent className="p-6 md:p-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-sans text-base font-medium text-emerald-300">30-Day Money-Back Guarantee</p>
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
                      <AccordionTrigger className="text-sm font-sans text-foreground hover:no-underline py-3.5">
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
        <section className="border-t border-border/20 pt-16 pb-8 text-center space-y-6">
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
