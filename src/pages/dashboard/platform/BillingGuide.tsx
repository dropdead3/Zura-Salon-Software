import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, BookOpen, Calculator, Receipt, Package, FileText, Clock, FlaskConical, Users, MapPin, Check, Sparkles, ChevronDown } from 'lucide-react';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useSubscriptionPlans, type OrganizationBilling, type SubscriptionPlan } from '@/hooks/useOrganizationBilling';
import { useBillingCalculations, formatCurrency } from '@/hooks/useBillingCalculations';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import {
  PlatformTable,
  PlatformTableHeader,
  PlatformTableBody,
  PlatformTableHead,
  PlatformTableRow,
  PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { cn } from '@/lib/utils';
import { PageExplainer } from '@/components/ui/PageExplainer';

// --- Changelog entries (add newest first) ---
const BILLING_CHANGELOG = [
  { date: '2026-03-17', description: 'Pricing restructure: monthly-only billing, per-location pricing ($99 Operator, $200/loc Growth/Infrastructure), removed cycle discounts.' },
  { date: '2026-03-16', description: 'Added Billing Guide page with live plan data and billing logic walkthrough.' },
  { date: '2026-03-16', description: 'Added interactive billing calculator widget and section anchor navigation.' },
  { date: '2026-03-10', description: 'Setup fee moved to Contract & Billing Terms card in account billing.' },
  { date: '2026-03-05', description: 'Introduced per-user overage fees alongside per-location fees.' },
  { date: '2026-02-28', description: 'Added promotional pricing with time-limited promo_ends_at logic.' },
  { date: '2026-02-20', description: 'Initial billing calculation engine: base price, trial period.' },
];

const SECTIONS = [
  { id: 'plans', label: 'Plans' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'color-bar' , label: 'Color Bar' },
  { id: 'color-bar-calc', label: 'Color Bar Calc' },
  { id: 'quick-ref', label: 'Quick Ref' },
  { id: 'changelog', label: 'Changelog' },
];

// --- Color Bar pricing constants (from pricing model) ---
const BR_LOCATION_FEE = 20;
const BR_USAGE_FEE = 0.50;
const BR_HARDWARE_COST = 199;
const BR_LICENSE_FEE = 10;
const BR_BASELINE_WASTE_RATE = 0.12;
const BR_AVG_PRODUCT_COST = 12;

export default function BillingGuide() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { formatCurrency: fmtCurrency } = useFormatCurrency();
  const [searchParams] = useSearchParams();
  const scrolledRef = useRef(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  // Scroll to section on mount
  useEffect(() => {
    if (scrolledRef.current) return;
    const section = searchParams.get('section');
    if (section) {
      const el = document.getElementById(section);
      if (el) {
        scrolledRef.current = true;
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
    }
  }, [searchParams, isLoading]);

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <div className="flex items-center justify-center h-64">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      </PlatformPageContainer>
    );
  }

  const lastUpdated = BILLING_CHANGELOG[0]?.date
    ? new Date(BILLING_CHANGELOG[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Billing Guide"
        description={
          lastUpdated
            ? `Internal reference for how organizations are billed. Last updated: ${lastUpdated}`
            : 'Internal reference for how organizations are billed.'
        }
        backTo="/platform/accounts"
      />
      <PageExplainer pageId="platform-billing-guide" />

      {/* Sticky jump nav */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-[hsl(var(--platform-bg)/0.85)] backdrop-blur-xl border-b border-[hsl(var(--platform-border)/0.3)]">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3 py-1.5 rounded-full text-xs font-sans transition-colors bg-[hsl(var(--platform-bg-card)/0.6)] border border-[hsl(var(--platform-border)/0.4)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:border-[hsl(var(--platform-border))]"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {/* Plans Overview */}
        <div id="plans" className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={tokens.card.iconBox}>
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">Subscription Plans</h2>
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Monthly billing only — per-location pricing for scaling brands.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Operator */}
            <PlatformCard variant="glass" className="relative border-l-4 border-l-primary/30 flex flex-col">
              <PlatformCardContent className="p-5 flex flex-col flex-1">
                <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">Operator</p>
                <div className="mt-3 mb-4">
                  <span className="font-display text-3xl tracking-tight text-[hsl(var(--platform-foreground))]">{fmtCurrency(99)}</span>
                  <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">/mo flat</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    <MapPin className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span>1 location</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    <Users className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span>1 included, up to 4 total</span>
                  </div>
                </div>
                <ul className="space-y-1.5 mt-auto text-xs text-[hsl(var(--platform-foreground-muted))]">
                  {['Core scheduling & booking', 'Personal KPI dashboard', 'Client management'].map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="w-3 h-3 text-primary/50 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
              </PlatformCardContent>
            </PlatformCard>

            {/* Multi-Location */}
            <PlatformCard variant="glass" className="relative border-l-4 border-l-primary/60 flex flex-col ring-1 ring-primary/20">
              <PlatformCardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">Multi-Location</p>
                  <PlatformBadge variant="primary" size="sm">Most Popular</PlatformBadge>
                </div>
                <div className="mt-3 mb-4">
                  <span className="font-display text-3xl tracking-tight text-[hsl(var(--platform-foreground))]">{fmtCurrency(200)}</span>
                  <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">/loc/mo</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    <MapPin className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span>2+ locations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    <Users className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span>10 per location included</span>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-[hsl(var(--platform-foreground-muted))]">
                  {['Everything in Operator', 'Multi-location benchmarking', 'Team performance analytics', 'Operational drift alerts'].map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="w-3 h-3 text-primary/50 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <div className="border-t border-[hsl(var(--platform-border)/0.3)] mt-4 pt-3">
                  <p className="font-display text-[10px] tracking-wide uppercase text-primary/70 mb-1.5">5+ locations unlocks</p>
                  <ul className="space-y-1.5 text-xs text-[hsl(var(--platform-foreground-muted))]">
                    {['Regional brand management', 'Advanced margin analytics', 'Deep operational features'].map((f) => (
                      <li key={f} className="flex items-start gap-2"><Sparkles className="w-3 h-3 text-primary/50 mt-0.5 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                </div>
              </PlatformCardContent>
            </PlatformCard>

            {/* Enterprise */}
            <PlatformCard variant="glass" className="relative border-l-4 border-l-primary flex flex-col">
              <PlatformCardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">Enterprise</p>
                  <PlatformBadge variant="glow" size="sm">Custom</PlatformBadge>
                </div>
                <div className="mt-3 mb-4">
                  <span className="font-display text-3xl tracking-tight text-[hsl(var(--platform-foreground))]">Custom</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    <MapPin className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span>Unlimited locations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                    <Users className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <span>Custom user allocation</span>
                  </div>
                </div>
                <ul className="space-y-1.5 mt-auto text-xs text-[hsl(var(--platform-foreground-muted))]">
                  {['Everything in Infrastructure', 'PE-backed brand support', 'Negotiable pricing', 'Dedicated onboarding'].map((f) => (
                    <li key={f} className="flex items-start gap-2"><Sparkles className="w-3 h-3 text-primary/50 mt-0.5 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
              </PlatformCardContent>
            </PlatformCard>
          </div>

          {/* Extra users callout */}
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] text-center mt-2">
            Additional users beyond included allocation: <span className="text-[hsl(var(--platform-foreground))]">+$25/user/mo</span> across all tiers.
          </p>
        </div>

        {/* How Billing Works - Collapsible */}
        <PlatformCard variant="glass" id="how-it-works">
          <button
            onClick={() => setBillingOpen(!billingOpen)}
            className="w-full text-left"
          >
            <PlatformCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <PlatformCardTitle className={tokens.card.title}>How Billing Works</PlatformCardTitle>
                    <PlatformCardDescription>Step-by-step breakdown of how an invoice amount is calculated.</PlatformCardDescription>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-[hsl(var(--platform-foreground-muted))] transition-transform duration-200 ${billingOpen ? 'rotate-180' : ''}`} />
              </div>
            </PlatformCardHeader>
          </button>
          {billingOpen && (
            <PlatformCardContent>
              <ol className="space-y-4 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                {[
                  { title: 'Tier Detection', desc: '1 location → Operator ($99/mo flat). 2-5 locations → Growth ($200/loc/mo). 5+ locations → Infrastructure ($200/loc/mo). Enterprise → custom.' },
                  { title: 'Base Price', desc: 'Operator: $99/mo flat. Growth/Infrastructure: $200 × number of locations. Can be overridden with a Custom Price on the account billing config.' },
                  { title: 'User Capacity', desc: 'Operator includes 1 user (max 4 total at +$25/ea). Growth/Infrastructure includes 10 users per location, +$25/ea for additional users.' },
                  { title: 'Promotional Pricing', desc: 'If a promo is active (has a future expiry date), the promo price replaces the base price. Discounts do not stack on promos.' },
                  { title: 'Discounts (when no promo)', desc: 'A percentage or fixed-amount discount is applied to the effective monthly price. Only applies when no promotional pricing is active.' },
                  { title: 'Setup Fee', desc: 'A one-time $199 setup fee is added to the first invoice (waivable). Once marked as paid, it won\'t appear again.' },
                  { title: 'Trial Period', desc: '14-day free trial. While active, the first invoice amount is $0. After trial, normal monthly billing resumes.' },
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="font-medium text-[hsl(var(--platform-foreground))]">{step.title}</p>
                      <p>{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </PlatformCardContent>
          )}
        </PlatformCard>

        {/* Interactive Billing Calculator */}
        <BillingCalculatorWidget plans={plans || []} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Color Bar Add-On */}
          <PlatformCard variant="glass" id="backroom">
            <PlatformCardHeader>
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <PlatformCardTitle className={tokens.card.title}>Color Bar Add-On</PlatformCardTitle>
                  <PlatformCardDescription>Chemical tracking module pricing.</PlatformCardDescription>
                </div>
              </div>
            </PlatformCardHeader>
            <PlatformCardContent>
              <div className="space-y-3 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                <div className="flex justify-between py-2 border-b border-[hsl(var(--platform-border)/0.5)]">
                  <span>Per-location fee</span>
                  <span className="font-medium text-[hsl(var(--platform-foreground))]">${BR_LOCATION_FEE}/mo per location</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[hsl(var(--platform-border)/0.5)]">
                  <span>Per color service fee</span>
                  <span className="font-medium text-[hsl(var(--platform-foreground))]">${BR_USAGE_FEE.toFixed(2)} per service</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[hsl(var(--platform-border)/0.5)]">
                  <span>Scale hardware (one-time)</span>
                  <span className="font-medium text-[hsl(var(--platform-foreground))]">${BR_HARDWARE_COST} per scale</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[hsl(var(--platform-border)/0.5)]">
                  <span>Scale license</span>
                  <span className="font-medium text-[hsl(var(--platform-foreground))]">${BR_LICENSE_FEE}/mo per scale</span>
                </div>
                <p className="text-xs text-[hsl(var(--platform-foreground-muted))] pt-2">
                  Color Bar is enabled per-location. Charges are billed alongside the subscription invoice.
                </p>
              </div>
            </PlatformCardContent>
          </PlatformCard>

          {/* Quick Reference */}
          <PlatformCard variant="glass" id="quick-ref">
            <PlatformCardHeader>
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <PlatformCardTitle className={tokens.card.title}>Quick Reference</PlatformCardTitle>
                  <PlatformCardDescription>Common billing questions at a glance.</PlatformCardDescription>
                </div>
              </div>
            </PlatformCardHeader>
            <PlatformCardContent>
              <div className="space-y-4 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Billing</p>
                  <p>Monthly billing only. No annual contracts or cycle discounts. Month-to-month commitment.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Setup Fee</p>
                  <p>$199 one-time setup fee added to first invoice. Can be waived per organization.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Trial</p>
                  <p>14-day free trial. No charges until trial ends. Normal monthly billing starts automatically.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Promotional Pricing</p>
                  <p>Set a reduced price for X months. Once expired, billing reverts to base (or custom) price. Promos and discounts never stack.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Scaling</p>
                  <p>Adding a 2nd location auto-upgrades from Operator ($99) to Growth ($200/loc). The jump is $99 → $400/mo. No transition discount.</p>
                </div>
              </div>
            </PlatformCardContent>
          </PlatformCard>
        </div>

        {/* Color Bar Add-On Calculator */}
        <ColorBarCalculatorWidget />

        {/* Changelog */}
        <PlatformCard variant="glass" id="changelog">
          <button
            onClick={() => setChangelogOpen(!changelogOpen)}
            className="w-full text-left"
          >
            <PlatformCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <PlatformCardTitle className={tokens.card.title}>Changelog</PlatformCardTitle>
                    <PlatformCardDescription>History of billing logic and pricing changes.</PlatformCardDescription>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-[hsl(var(--platform-foreground-muted))] transition-transform duration-200 ${changelogOpen ? 'rotate-180' : ''}`} />
              </div>
            </PlatformCardHeader>
          </button>
          {changelogOpen && (
            <PlatformCardContent>
              <div className="space-y-0">
                {BILLING_CHANGELOG.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-4 py-3 text-sm',
                      i < BILLING_CHANGELOG.length - 1 && 'border-b border-[hsl(var(--platform-border)/0.3)]'
                    )}
                  >
                    <span className="flex-shrink-0 font-display text-xs tracking-wide text-[hsl(var(--platform-foreground-muted))] w-24">
                      {entry.date}
                    </span>
                    <span className="text-[hsl(var(--platform-foreground)/0.85)]">{entry.description}</span>
                  </div>
                ))}
              </div>
            </PlatformCardContent>
          )}
        </PlatformCard>
      </div>
    </PlatformPageContainer>
  );
}

// --- Billing Calculator Widget ---

function BillingCalculatorWidget({ plans }: { plans: SubscriptionPlan[] }) {
  const [locationCount, setLocationCount] = useState<string>('1');
  const [extraUsers, setExtraUsers] = useState<string>('0');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [promoPrice, setPromoPrice] = useState<string>('');
  const [promoActive, setPromoActive] = useState(false);
  const [setupFee, setSetupFee] = useState<string>('199');
  const [setupFeePaid, setSetupFeePaid] = useState(false);

  const locCount = Math.max(1, parseInt(locationCount) || 1);

  // Auto-detect tier based on location count
  const detectedTier = locCount === 1 ? 'operator' : locCount <= 5 ? 'growth' : 'infrastructure';
  const selectedPlan = plans.find(p => p.tier === detectedTier) || null;

  // Calculate base monthly from tier
  const baseMonthly = detectedTier === 'operator' ? 99 : locCount * 200;
  const includedUsers = detectedTier === 'operator' ? 1 : locCount * 10;
  const maxUsers = detectedTier === 'operator' ? 4 : undefined;
  const extraUserCount = Math.max(0, parseInt(extraUsers) || 0);
  const cappedExtraUsers = maxUsers ? Math.min(extraUserCount, maxUsers - 1) : extraUserCount;
  const userFees = cappedExtraUsers * 25;

  // Build synthetic billing object
  const syntheticBilling = useMemo<OrganizationBilling | null>(() => {
    if (!selectedPlan) return null;
    const now = new Date();
    const futureDate = promoActive ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    return {
      id: 'calc',
      organization_id: 'calc',
      plan_id: selectedPlan.id,
      billing_cycle: 'monthly' as const,
      contract_length_months: 1,
      contract_start_date: null,
      contract_end_date: null,
      base_price: baseMonthly,
      custom_price: customPrice ? parseFloat(customPrice) : null,
      discount_type: null,
      discount_value: null,
      discount_reason: null,
      promo_months: null,
      promo_price: promoActive && promoPrice ? parseFloat(promoPrice) : null,
      promo_ends_at: futureDate,
      trial_days: 0,
      trial_ends_at: null,
      billing_starts_at: null,
      setup_fee: parseFloat(setupFee) || 0,
      setup_fee_paid: setupFeePaid,
      per_location_fee: 0,
      per_user_fee: 25,
      additional_locations_purchased: 0,
      additional_users_purchased: cappedExtraUsers,
      included_locations: detectedTier === 'operator' ? 1 : -1,
      included_users: includedUsers,
      auto_renewal: true,
      non_renewal_requested_at: null,
      non_renewal_reason: null,
      notes: null,
      created_at: '',
      updated_at: '',
    };
  }, [selectedPlan, baseMonthly, customPrice, promoPrice, promoActive, setupFee, setupFeePaid, cappedExtraUsers, includedUsers, detectedTier]);

  const calc = useBillingCalculations(
    syntheticBilling,
    selectedPlan,
    locCount,
    includedUsers + cappedExtraUsers
  );

  return (
    <PlatformCard variant="glass" id="calculator">
      <PlatformCardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <PlatformCardTitle className={tokens.card.title}>Billing Calculator</PlatformCardTitle>
            <PlatformCardDescription>Enter location count to auto-detect tier. Uses the same engine as real billing.</PlatformCardDescription>
          </div>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Number of Locations</Label>
              <PlatformInput type="number" min="1" value={locationCount} onChange={e => setLocationCount(e.target.value)} />
              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                Auto-detected tier: <span className="font-medium capitalize text-[hsl(var(--platform-foreground))]">{detectedTier}</span>
                {detectedTier === 'operator' ? ' ($99/mo flat)' : ` ($200/loc × ${locCount} = ${formatCurrency(locCount * 200)}/mo)`}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Extra Users (beyond {includedUsers} included)</Label>
              <PlatformInput type="number" min="0" value={extraUsers} onChange={e => setExtraUsers(e.target.value)} />
              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                +$25/mo each{maxUsers ? ` (max ${maxUsers - 1} extra for Operator)` : ''}
                {cappedExtraUsers > 0 && ` = ${formatCurrency(userFees)}/mo`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Custom Price Override</Label>
                <PlatformInput type="number" placeholder="—" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Setup Fee</Label>
                <PlatformInput type="number" value={setupFee} onChange={e => setSetupFee(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={setupFeePaid} onCheckedChange={setSetupFeePaid} />
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Setup fee already paid</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={promoActive} onCheckedChange={setPromoActive} />
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Promo active</Label>
            </div>

            {promoActive && (
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Promo Price (monthly)</Label>
                <PlatformInput type="number" placeholder="e.g. 99" value={promoPrice} onChange={e => setPromoPrice(e.target.value)} />
              </div>
            )}
          </div>

          {/* Results */}
          <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] p-5">
            <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))] mb-4">Invoice Preview</p>
            {!selectedPlan ? (
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">No plan found for detected tier.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <ResultRow label="Tier" value={detectedTier.charAt(0).toUpperCase() + detectedTier.slice(1)} />
                <ResultRow label={detectedTier === 'operator' ? 'Base (flat)' : `Base (${locCount} loc × $200)`} value={formatCurrency(baseMonthly)} />
                {cappedExtraUsers > 0 && <ResultRow label={`Extra users (${cappedExtraUsers} × $25)`} value={formatCurrency(userFees)} />}
                {calc.isInPromo && <ResultRow label="Promo Savings" value={`-${formatCurrency(calc.promoSavings)}/mo`} accent />}
                <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
                <ResultRow label="Effective Monthly" value={formatCurrency(calc.effectiveMonthlyAmount)} highlight />
                <ResultRow label="Annual Projection" value={formatCurrency(calc.annualAmount)} />
                <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
                <ResultRow label="First Invoice" value={formatCurrency(calc.firstInvoiceAmount)} highlight />
                <p className="text-xs text-[hsl(var(--platform-foreground-subtle))] mt-2">
                  Includes {includedUsers} user{includedUsers !== 1 ? 's' : ''} in plan
                  {!setupFeePaid && parseFloat(setupFee) > 0 && ` + ${formatCurrency(parseFloat(setupFee))} setup fee`}
                </p>
              </div>
            )}
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

function ResultRow({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[hsl(var(--platform-foreground-muted))]">{label}</span>
      <span className={cn(
        'font-medium',
        highlight && 'text-[hsl(var(--platform-foreground))]',
        accent && 'text-primary',
        !highlight && !accent && 'text-[hsl(var(--platform-foreground)/0.85)]'
      )}>
        {value}
      </span>
    </div>
  );
}

// --- Color Bar Add-On Calculator Widget ---

function ColorBarCalculatorWidget() {
  const [locations, setLocations] = useState<string>('1');
  const [scales, setScales] = useState<string>('1');
  const [colorServices, setColorServices] = useState<string>('80');
  const [includeHardware, setIncludeHardware] = useState(true);

  const loc = Math.max(0, parseInt(locations) || 0);
  const sc = Math.max(0, parseInt(scales) || 0);
  const svc = Math.max(0, parseInt(colorServices) || 0);

  const locationFees = loc * BR_LOCATION_FEE;
  const licenseFees = sc * BR_LICENSE_FEE;
  const usageFees = svc * BR_USAGE_FEE;
  const monthlyTotal = locationFees + licenseFees + usageFees;
  const hardwareTotal = includeHardware ? sc * BR_HARDWARE_COST : 0;
  const annualTotal = monthlyTotal * 12;

  const monthlyWasteSavings = Math.round(svc * BR_AVG_PRODUCT_COST * BR_BASELINE_WASTE_RATE);
  const annualWasteSavings = monthlyWasteSavings * 12;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtWhole = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <PlatformCard variant="glass" id="color-bar-calc">
      <PlatformCardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <PlatformCardTitle className={tokens.card.title}>Color Bar Quote Calculator</PlatformCardTitle>
            <PlatformCardDescription>Estimate monthly Color Bar costs for an organization. Uses the flat metered pricing model.</PlatformCardDescription>
          </div>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Number of Locations</Label>
              <PlatformInput type="number" min="0" value={locations} onChange={e => setLocations(e.target.value)} />
              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">${BR_LOCATION_FEE}/mo each</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Number of Scales</Label>
              <PlatformInput type="number" min="0" value={scales} onChange={e => setScales(e.target.value)} />
              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">${BR_HARDWARE_COST} one-time + ${BR_LICENSE_FEE}/mo license each</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Estimated Color Services / Month</Label>
              <PlatformInput type="number" min="0" value={colorServices} onChange={e => setColorServices(e.target.value)} />
              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">${BR_USAGE_FEE.toFixed(2)} per service (usage-based)</p>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={includeHardware} onCheckedChange={setIncludeHardware} />
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Include hardware cost (one-time)</Label>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] p-5">
            <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))] mb-4">Color Bar Quote</p>

            <div className="space-y-3 text-sm">
              <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">Monthly Recurring</p>
              <ResultRow label={`Location fees (${loc} × $${BR_LOCATION_FEE})`} value={fmt(locationFees)} />
              <ResultRow label={`Scale licenses (${sc} × $${BR_LICENSE_FEE})`} value={fmt(licenseFees)} />
              <ResultRow label={`Usage estimate (${svc} × $${BR_USAGE_FEE.toFixed(2)})`} value={fmt(usageFees)} />
              <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
              <ResultRow label="Total Monthly Recurring" value={fmt(monthlyTotal)} highlight />

              {includeHardware && hardwareTotal > 0 && (
                <>
                  <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
                  <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">One-Time</p>
                  <ResultRow label={`Scale hardware (${sc} × $${BR_HARDWARE_COST})`} value={fmtWhole(hardwareTotal)} />
                </>
              )}

              <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
              <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">Projections</p>
              <ResultRow label="Annual Recurring" value={fmt(annualTotal)} highlight />
              {includeHardware && hardwareTotal > 0 && (
                <ResultRow label="First-Year Total (incl. hardware)" value={fmt(annualTotal + hardwareTotal)} />
              )}

              <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
              <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">Estimated Waste Savings</p>
              <ResultRow label={`Monthly (${svc} svc × $${BR_AVG_PRODUCT_COST} avg × ${(BR_BASELINE_WASTE_RATE * 100).toFixed(0)}%)`} value={fmt(monthlyWasteSavings)} accent />
              <ResultRow label="Annual Waste Savings" value={fmt(annualWasteSavings)} accent />
              {annualWasteSavings > annualTotal && (
                <div className="mt-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  Net positive ROI — estimated savings exceed Color Bar cost by {fmt(annualWasteSavings - annualTotal)}/yr
                </div>
              )}
            </div>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
