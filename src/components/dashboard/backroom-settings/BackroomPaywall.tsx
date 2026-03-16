import { useState, useEffect, useRef, useCallback } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Beaker, BarChart3, ArrowRight, Loader2,
  Scale, ShieldCheck, MapPin, TrendingUp, DollarSign, Star,
  Info, Clock, AlertTriangle, CheckCircle2, XCircle,
  Brain, PackageSearch, ChevronRight,
  Timer, X, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

/* ─── Product Preview Mock (used in hero) ─── */
function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-[720px] overflow-visible isolate">
      {/* Browser frame */}
      <div className="relative rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden">
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
              <div className="h-full rounded-full bg-primary/70" style={{ width: '93%' }} />
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
              <div className="h-full rounded-full bg-accent/50" style={{ width: '93%' }} />
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

  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations(effectiveOrganization?.id);
  const { isLocationEntitled } = useBackroomLocationEntitlements(effectiveOrganization?.id);
  const { formatCurrency, formatCurrencyCompact } = useFormatCurrency();
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
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboard-sidebar-collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const val = localStorage.getItem('dashboard-sidebar-collapsed') === 'true';
      setSidebarCollapsed(prev => prev !== val ? val : prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const ctaLabel = hasPositiveBenefit && yearlySavings > 0
    ? `Start Recovering ${formatCurrencyCompact(yearlySavings)}/yr`
    : 'Start Recovering Revenue';

  const ActivateButton = ({ className = '', compact = false }: { className?: string; compact?: boolean }) => (
    <div className={cn('flex flex-col items-center', compact ? 'gap-1' : 'gap-2')}>
      <Button
        size={compact ? 'default' : 'lg'}
        className={cn(
          'group font-sans font-medium gap-2 rounded-full active:scale-[0.98] transition-all duration-200',
          compact ? 'h-10 px-6 text-sm' : 'h-12 px-10 text-base',
          className,
        )}
        onClick={() => setConfirmDialogOpen(true)}
        disabled={loading || selectedLocationIds.size === 0}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {ctaLabel}
            <span className="overflow-hidden w-0 group-hover:w-5 transition-all duration-200">
              <ArrowRight className="w-4 h-4 -translate-x-1 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </span>
          </>
        )}
      </Button>
      {!compact && (
        <p className="text-xs text-muted-foreground/50 font-sans flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> 30-day money-back guarantee
        </p>
      )}
    </div>
  );

  /* ─── Mid-page CTA helper ─── */
  const MidPageCta = () => (
    <div className="flex flex-col items-center gap-2 py-4">
      <ActivateButton compact />
    </div>
  );

  /* ─── Section heading helper ─── */
  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <h2 className="font-display text-2xl md:text-3xl font-medium tracking-wide text-center text-foreground uppercase">
      {children}
    </h2>
  );

  return (
    <div className="flex flex-col items-center justify-center px-6 sm:px-8 py-12 md:py-16">
      <div className="max-w-[1100px] w-full">

        {/* ═══════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════ */}
        <section className="pt-4 pb-16 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left — Text */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="space-y-4">
                <Eyebrow className="text-muted-foreground mb-2">Zura Backroom</Eyebrow>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-medium tracking-wide leading-[1.08]">
                  Stop Losing Money in Your Color Room
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto lg:mx-0 font-sans leading-relaxed">
                  Track every gram. Recover supply costs. Reorder before you run out.
                </p>
              </div>

              <div className="space-y-3" ref={heroRef}>
                <ActivateButton />
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-2">
                {[
                  { icon: Users, text: '200+ salons tracking' },
                  { icon: ShieldCheck, text: '30-day guarantee' },
                  { icon: Zap, text: 'Setup in minutes' },
                ].map((item) => (
                  <span key={item.text} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 font-sans">
                    <item.icon className="w-3 h-3" />
                    {item.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Static Browser Mockup */}
            <div className="flex flex-col">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 2 — BEFORE / AFTER
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20">
          <div className="text-center mb-10 md:mb-12">
            <SectionHeading>
              How Zura Backroom Transforms Your Color Room
            </SectionHeading>
            <p className="mt-4 text-base text-muted-foreground font-sans font-light max-w-xl mx-auto">
              From guesswork to a controlled, measurable system.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
            {/* Center arrow divider — desktop only */}
            <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 z-10 items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-background border border-border/60 shadow-sm flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* WITHOUT — deliberately muted */}
            <Card className="bg-card/50 border-destructive/20 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-destructive" />
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
                      <span className="text-sm font-sans text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* WITH — elevated, the "winning" side */}
            <Card className="bg-success/[0.05] border-success/20 shadow-md">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-success" />
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
                      <span className="text-sm font-sans text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SOCIAL PROOF (relocated after Before/After)
            ═══════════════════════════════════════════ */}
        <div className="pb-16 md:pb-20 max-w-3xl mx-auto space-y-8">
          {/* Quantified result line */}
          <p className="text-center font-sans text-sm text-muted-foreground/60 uppercase tracking-wider">
            Salon owners recover an average of $2,400/mo in color costs
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Testimonial 1 */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[hsl(var(--oat))] text-[hsl(var(--oat))]" />
                ))}
              </div>
              <blockquote className="space-y-2">
                <p className="text-muted-foreground text-base font-sans leading-relaxed italic">
                  "Zura Backroom saved us thousands per month and helps us recoup over $50,000 a year in color costs. 10/10 add-on feature."
                </p>
                <footer className="text-xs text-muted-foreground/50 font-sans">
                  <span className="font-medium text-muted-foreground/70">Jamie Torres</span> · Owner, Drop Dead Salon · Austin, TX
                </footer>
              </blockquote>
            </div>

            {/* Testimonial 2 */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[hsl(var(--oat))] text-[hsl(var(--oat))]" />
                ))}
              </div>
              <blockquote className="space-y-2">
                <p className="text-muted-foreground text-base font-sans leading-relaxed italic">
                  "We had no idea how much product was walking out the door. Within two weeks, waste dropped 40% and we finally know our true cost per service."
                </p>
                <footer className="text-xs text-muted-foreground/50 font-sans">
                  <span className="font-medium text-muted-foreground/70">Rachel Kim</span> · Owner, Lustre Studio · Denver, CO
                </footer>
              </blockquote>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 3 — LOSS AVERSION STATS
            ═══════════════════════════════════════════ */}
        {(estimate || estimateLoading) && (
          <section className="pb-16 md:pb-20">
            <div className="space-y-6">
              <Card className="overflow-hidden border-border/60">
                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-sans text-base font-medium text-foreground">
                        Your Estimated Color Room Losses
                      </p>
                      <p className="text-sm text-muted-foreground font-sans mt-1">
                        These projections are based on your salon's actual appointment data and industry benchmarks.
                      </p>
                    </div>
                  </div>

                  {estimateLoading ? (
                    <div className="grid grid-cols-3 gap-5">
                      <Skeleton className="h-32 rounded-xl" />
                      <Skeleton className="h-32 rounded-xl" />
                      <Skeleton className="h-32 rounded-xl" />
                    </div>
                  ) : estimate ? (
                    <>
                      {/* Loss stat tiles with explanations */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {[
                          { value: wasteSavings, label: 'Product Waste', subtitle: 'Unmeasured mixing leads to over-dispensing and leftover waste' },
                          { value: monthlyAuditCost, label: 'Staff Time Wasted', subtitle: 'Manual counting, reordering, and inventory audits' },
                          { value: supplyRecovery, label: 'Unrecovered Supply Costs', subtitle: 'Color used but never billed back to services' },
                        ].map((tile) => (
                          <div key={tile.label} className="p-5 rounded-lg bg-destructive/[0.04] border border-destructive/15 text-center shadow-sm space-y-2">
                            <p className="font-display text-2xl md:text-3xl font-medium tracking-wide text-destructive tabular-nums">
                              <AnimatedNumber
                                value={tile.value}
                                duration={1200}
                                formatOptions={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }}
                              />
                            </p>
                            <p className="text-sm text-foreground font-sans font-medium">{tile.label} / mo</p>
                            <p className="text-xs text-muted-foreground font-sans leading-relaxed">{tile.subtitle}</p>
                          </div>
                        ))}
                      </div>

                      {/* Slider */}
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="font-sans text-sm text-foreground">
                            Time your team spends on manual inventory tasks daily: <span className="font-medium">{auditMinutesPerDay} min</span>
                          </p>
                        </div>
                        <div className="w-32">
                          <Slider
                            value={[auditMinutesPerDay]}
                            onValueChange={(v) => setAuditMinutesPerDay(v[0])}
                            min={5}
                            max={90}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Projected Annual Recovery banner */}
                      <div className="border-t border-border/40 pt-6">
                        <div className="relative rounded-xl overflow-hidden">
                          {/* Gradient border glow — top and left edges */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-success/40 via-success/20 to-transparent" />
                          {/* Inner card */}
                          <div className="relative m-px rounded-[11px] bg-gradient-to-br from-success/[0.08] via-card/95 to-card p-8 space-y-6 backdrop-blur-xl">
                            {/* Header */}
                            <div className="space-y-1.5 pb-5 border-b border-success/15">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_2px_hsl(var(--success)/0.4)]" />
                                <p className="font-display text-lg text-success uppercase tracking-wide font-medium">When Backroom Is Implemented</p>
                              </div>
                              <p className="font-sans text-sm text-muted-foreground pl-5">Estimated annual savings based on your salon's current numbers</p>
                            </div>

                            {/* Body */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
                              <div className="space-y-1">
                                <p className="font-sans text-xs text-success/80 uppercase tracking-widest">You could recover</p>
                                <p className="font-display text-5xl md:text-6xl font-medium tracking-wide text-success tabular-nums leading-none">
                                  <AnimatedNumber
                                    value={yearlySavings}
                                    duration={1200}
                                    formatOptions={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }}
                                  />
                                  <span className="text-xl text-success/50 font-sans font-normal ml-1.5">/yr</span>
                                </p>
                              </div>
                              <div className="space-y-2.5 text-sm font-sans min-w-[220px]">
                                {[
                                  { label: 'Waste reduction', value: formatCurrency(wasteSavings * 12, { maximumFractionDigits: 0 }) },
                                  { label: 'Time savings', value: formatCurrency(monthlyAuditCost * 12, { maximumFractionDigits: 0 }) },
                                  { label: 'Supply recovery', value: formatCurrency(supplyRecovery * 12, { maximumFractionDigits: 0 }) },
                                ].map((item) => (
                                  <div key={item.label} className="flex items-center justify-between gap-8 rounded-lg border border-success/15 bg-success/[0.04] px-4 py-3 transition-colors hover:bg-success/[0.08]">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="tabular-nums text-foreground font-medium">{item.value}/yr</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Disclaimer */}
                            <p className="text-xs text-muted-foreground/50 font-sans pt-1">
                              Projections based on your actual appointment data and industry benchmarks for salons using automated color tracking
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Mid-page CTA after loss aversion stats */}
        {estimate && <MidPageCta />}

        {/* ═══════════════════════════════════════════
            SECTION 4 — FEATURE REVEAL
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20">
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-[0.15em]">
                Platform Capabilities
              </span>
              <SectionHeading>What You Get</SectionHeading>
              <p className="font-sans text-base text-muted-foreground font-light max-w-2xl mx-auto">
                Five capabilities, one connected system.
              </p>
            </div>

            {/* Mobile: pill selector */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
                    'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-sans font-medium whitespace-nowrap border transition-all duration-200 shrink-0',
                    activeFeature === f.key
                      ? 'bg-primary/10 border-primary/30 text-foreground ring-1 ring-primary/20'
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
                      'flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-200',
                      activeFeature === f.key
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-transparent border-border/40 hover:bg-muted/40'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200',
                      activeFeature === f.key ? 'bg-primary/15' : 'bg-muted'
                    )}>
                      <f.icon className={cn('w-5 h-5', activeFeature === f.key ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-display text-base tracking-wide text-foreground uppercase">{f.title}</span>
                      <p className="font-sans text-sm text-muted-foreground font-light">{f.desc}</p>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 shrink-0 transition-all duration-200',
                      activeFeature === f.key ? 'text-primary opacity-100' : 'text-muted-foreground/40 opacity-0'
                    )} />
                  </button>
                ))}
              </div>

              {/* Right — iPad Visualization Panel */}
              <div className="relative mx-auto w-full">
                <div className="rounded-[2rem] bg-zinc-900 p-3 shadow-2xl ring-1 ring-white/10">
                  <div className="flex justify-center pb-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  </div>
                  <div className="rounded-[1.5rem] bg-background overflow-hidden min-h-[340px]">
                    <div key={activeFeature}>

                      {activeFeature === 'mixing' && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Beaker className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-display text-xs tracking-wide text-foreground uppercase">Bowl 1</p>
                                <p className="font-sans text-[10px] text-muted-foreground">Sarah M. — Full Colour</p>
                              </div>
                            </div>
                            <span className="font-sans text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full border border-success/20">Mixing</span>
                          </div>

                          <div className="rounded-xl bg-muted/30 p-5 text-center space-y-1">
                            <p className="font-display text-4xl tracking-tight text-foreground tabular-nums">88.6<span className="text-lg text-muted-foreground ml-1">g</span></p>
                            <p className="font-sans text-xs text-muted-foreground">Product Cost: <span className="text-foreground font-medium">$12.40</span></p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-sans text-[10px] text-muted-foreground">Color Allowance</span>
                              <span className="font-sans text-[10px] tabular-nums text-muted-foreground">88.6g / 120g</span>
                            </div>
                            <Progress value={74} className="h-1.5" indicatorClassName="bg-success" />
                          </div>

                          <div className="space-y-1.5">
                            {[
                              { name: 'Koleston 7/0', brand: 'Wella', weight: '28.4g', cost: '$4.80' },
                              { name: '6% Developer', brand: 'Wella', weight: '60.2g', cost: '$7.60' },
                            ].map((line) => (
                              <div key={line.name} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                                <div className="flex-1 min-w-0">
                                  <p className="font-sans text-sm font-medium text-foreground truncate">{line.name}</p>
                                  <p className="font-sans text-[10px] text-muted-foreground">{line.brand}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-display text-xs tabular-nums text-foreground">{line.weight}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Scale</Badge>
                                  <span className="font-sans text-[10px] text-muted-foreground">{line.cost}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-1">
                            <Button size="sm" className="flex-1 font-sans text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Finalize Mix
                            </Button>
                            <Button variant="outline" size="sm" className="font-sans text-xs text-muted-foreground">
                              Discard
                            </Button>
                          </div>
                        </div>
                      )}

                      {activeFeature === 'formulas' && (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Brain className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-display text-xs tracking-wide text-muted-foreground uppercase">Client Formula History</span>
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
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <PackageSearch className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-display text-xs tracking-wide text-muted-foreground uppercase">Inventory Status</span>
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
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-display text-xs tracking-wide text-muted-foreground uppercase">Service Cost Breakdown</span>
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
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-display text-xs tracking-wide text-muted-foreground uppercase">Backroom Intelligence</span>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 5 — COMPETITOR COMPARISON
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20">
          <CompetitorComparison />
        </section>

        {/* Mid-page CTA after competitor comparison */}
        <MidPageCta />

        {/* ═══════════════════════════════════════════
            SECTION 6 — HOW IT WORKS (3-step)
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20">
          <div className="space-y-10 md:space-y-12">
            <div className="text-center space-y-3">
              <SectionHeading>How It Works</SectionHeading>
              <p className="font-sans text-base text-muted-foreground font-light max-w-2xl mx-auto">
                From the first bowl to the final insight — three steps, one connected system.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
              {howItWorks.map((step) => (
                <Card key={step.step} className="bg-card border-border/50 shadow-sm">
                  <CardContent className="p-6 md:p-8 space-y-3">
                    <span className="font-display text-2xl tracking-wide text-primary/20">{step.step}</span>
                    <p className="font-sans text-base font-medium text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 7 — PRICING CONFIGURATOR
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20">
          <div className="space-y-8 md:space-y-12">
            <SectionHeading>Pricing</SectionHeading>

            <Card className="bg-card border-border/50 shadow-md overflow-hidden">
              <CardContent className="p-0">

                {/* ── Price headline ── */}
                <div className="p-6 md:p-8 text-center space-y-2">
                  <p className="font-sans text-base text-foreground">
                    <span className="font-display text-xl tracking-wide">${BACKROOM_BASE_PRICE}</span>
                    <span className="text-muted-foreground">/mo per location</span>
                    <span className="text-muted-foreground/40 mx-3">·</span>
                    <span className="font-display text-xl tracking-wide">${BACKROOM_PER_SERVICE_FEE.toFixed(2)}</span>
                    <span className="text-muted-foreground">/color service</span>
                  </p>
                  <p className="font-sans text-sm text-muted-foreground/60">
                    One highlight service covers your entire monthly cost.
                  </p>
                </div>

                {/* ── Locations config ── */}
                {activeLocations.length > 0 && (
                  <div className="border-t border-border/40 p-6 md:px-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <p className="font-display text-sm tracking-wide text-foreground uppercase">
                          {isSingleLocation ? 'Your Location' : 'Locations'}
                        </p>
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
                          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/30">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="font-sans text-sm text-foreground truncate">{loc.name}</span>
                              {cityLabel && <span className="font-sans text-sm text-muted-foreground">{cityLabel}</span>}
                            </div>
                            <span className="font-sans text-sm text-primary shrink-0">+${BACKROOM_BASE_PRICE}/mo</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-1.5">
                        {activeLocations.map((loc) => {
                          const isChecked = selectedLocationIds.has(loc.id);
                          const cityLabel = loc.city ? loc.city.split(',')[0]?.trim() : '';
                          return (
                            <div
                              key={loc.id}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 cursor-pointer',
                                isChecked ? 'bg-primary/5 border border-primary/30' : 'border border-transparent hover:bg-accent/30',
                              )}
                              onClick={() => toggleLocation(loc.id)}
                            >
                              <Checkbox checked={isChecked} className="pointer-events-none" />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="font-sans text-sm text-foreground truncate">{loc.name}</span>
                                {cityLabel && <span className="font-sans text-sm text-muted-foreground">{cityLabel}</span>}
                              </div>
                              {isChecked && (
                                <span className="font-sans text-sm text-primary shrink-0">+${BACKROOM_BASE_PRICE}/mo</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Scales config ── */}
                <div className="border-t border-border/40 p-6 md:px-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Scale className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-sm tracking-wide text-foreground uppercase">Precision Scales</p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          ${SCALE_HARDWARE_PRICE} one-time · ${SCALE_LICENSE_MONTHLY}/mo each
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
                        <span className="text-sm">−</span>
                      </Button>
                      <span className="font-display text-lg tracking-wide w-8 text-center text-foreground">{scaleCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => { setManualScaleOverride(true); setScaleCount(Math.min(20, scaleCount + 1)); }}
                        disabled={scaleCount >= 20}
                      >
                        <span className="text-sm">+</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground font-sans">
                    <span>{recommendedScales} recommended (1 per 10 daily color appts)</span>
                    {manualScaleOverride && scaleCount !== recommendedScales && (
                      <button
                        type="button"
                        className="text-primary hover:underline transition-colors"
                        onClick={() => { setManualScaleOverride(false); setScaleCount(recommendedScales); }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground/60 font-sans">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Each station requires an iPad with Bluetooth. Tablet stand recommended.</span>
                  </div>
                </div>

                {/* ── Monthly Summary (receipt) ── */}
                <div className="border-t-2 border-border/60 bg-muted/20 p-6 md:px-8 space-y-3">
                  <p className="font-display text-xs tracking-wide text-muted-foreground uppercase">Monthly Summary</p>

                  <div className="space-y-2 text-sm font-sans">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{locationCount} location{locationCount !== 1 ? 's' : ''}</span>
                      <span className="text-foreground">${baseCost}</span>
                    </div>
                    {scaleCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{scaleCount} scale{scaleCount !== 1 ? 's' : ''} license</span>
                        <span className="text-foreground">${scaleCost}</span>
                      </div>
                    )}
                    {estimate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Est. usage (~{Math.round(estimate.monthlyColorServices * locationFraction)} services)
                        </span>
                        <span className="text-foreground">${usageFee}</span>
                      </div>
                    )}

                    <div className="border-t border-border/40 pt-2 mt-2 flex justify-between items-baseline">
                      <span className="text-foreground font-medium">Est. Monthly Total</span>
                      <span className="font-display text-xl tracking-wide text-foreground">${monthlyTotal}<span className="text-sm text-muted-foreground font-sans">/mo</span></span>
                    </div>

                    {hardwareTotal > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground/60">
                        <span>One-time hardware</span>
                        <span>${hardwareTotal}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ROI projection (bottom) ── */}
                {hasPositiveBenefit && estimate && (
                  <div className="border-t border-success/20 bg-success/5 p-6 md:px-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <p className="font-display text-xs tracking-wide text-success uppercase">Projected Annual Impact</p>
                      </div>
                      {roiMultiplier >= 2 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/10 text-success text-xs font-sans font-medium">
                          {roiMultiplier}× ROI
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-2xl md:text-3xl tracking-wide text-success">
                        +<AnimatedNumber value={yearlyNetBenefit} duration={1200} formatOptions={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }} />
                        <span className="text-sm text-success/70 ml-1">/yr</span>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-success/60"
                          style={{ width: `${Math.min(100, yearlySavings > 0 ? (yearlyCost / yearlySavings) * 100 : 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-sans">
                        Cost is only {yearlySavings > 0 ? Math.round((yearlyCost / yearlySavings) * 100) : 0}% of annual benefit
                      </p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SECTION 8 — TRUST + FAQ
            ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-20">
          <div className="space-y-6">
            {/* 30-Day Guarantee */}
            <Card className="bg-success/5 border-success/20 shadow-sm">
              <CardContent className="p-6 md:p-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-success" />
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
                <p className="font-display text-base font-medium tracking-wide text-foreground">Common Questions</p>
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border/30">
                      <AccordionTrigger className="text-sm font-sans font-normal tracking-normal text-foreground hover:no-underline py-3">
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
            SECTION 9 — FINAL CTA
            ═══════════════════════════════════════════ */}
        <section className="border-t border-border/20 pt-16 pb-12 text-center space-y-6">
          {hasPositiveBenefit && estimate ? (
            <p className="font-sans text-base text-muted-foreground">
              Projected to recover {formatCurrency(yearlySavings)} annually{roiMultiplier >= 2 ? ` — ${roiMultiplier}× your cost` : ''}.
            </p>
          ) : (
            <p className="font-sans text-base text-muted-foreground">
              Start tracking every gram. Recover what your color room is losing.
            </p>
          )}
          <ActivateButton />
        </section>

      </div>

      {/* ─── Sticky Bottom Conversion Bar ─── */}
      <AnimatePresence>
        {showStickyBar && !stickyDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-0 right-0 left-0 z-40 border-t border-border/60 bg-card/80 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
              sidebarCollapsed ? 'lg:left-20' : 'lg:left-72'
            )}
          >
            <div className="max-w-[1100px] mx-auto px-6 lg:pr-20 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {hasPositiveBenefit && yearlySavings > 0 && (
                  <p className="font-sans text-sm text-muted-foreground hidden sm:block">
                    Est. <span className="text-success font-medium">{formatCurrencyCompact(yearlySavings)}/yr</span> recovered
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="default"
                  className="font-sans font-medium gap-2 rounded-full h-10 px-6 text-sm shadow-lg shadow-primary/20"
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={loading || selectedLocationIds.size === 0}
                >
                  {ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                <button
                  onClick={() => setStickyDismissed(true)}
                  className="p-1.5 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BackroomCheckoutConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleCheckout}
        loading={loading}
        organizationId={effectiveOrganization?.id}
        locationCount={locationCount}
        scaleCount={scaleCount}
        estimatedMonthlyServices={estimate ? Math.round(estimate.monthlyColorServices * locationFraction) : 0}
        estimatedMonthlySavings={totalSavings}
        netBenefit={netBenefit}
      />
    </div>
  );
}
