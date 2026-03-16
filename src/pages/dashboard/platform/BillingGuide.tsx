import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, BookOpen, Calculator, Receipt, Package, FileText, Clock, Hash, FlaskConical } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useSubscriptionPlans, type BillingCycle, type OrganizationBilling, type SubscriptionPlan } from '@/hooks/useOrganizationBilling';
import { CYCLE_MULTIPLIERS, CYCLE_DISCOUNTS, useBillingCalculations, formatCurrency, getBillingCycleLabel } from '@/hooks/useBillingCalculations';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// --- Changelog entries (add newest first) ---
const BILLING_CHANGELOG = [
  { date: '2026-03-16', description: 'Added Billing Guide page with live plan data, cycle discount reference, and billing logic walkthrough.' },
  { date: '2026-03-16', description: 'Added interactive billing calculator widget and section anchor navigation.' },
  { date: '2026-03-10', description: 'Setup fee moved to Contract & Billing Terms card in account billing.' },
  { date: '2026-03-05', description: 'Introduced per-user overage fees alongside per-location fees.' },
  { date: '2026-02-28', description: 'Added promotional pricing with time-limited promo_ends_at logic.' },
  { date: '2026-02-20', description: 'Initial billing calculation engine: base price, cycle discounts, trial period.' },
];

const SECTIONS = [
  { id: 'plans', label: 'Plans' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'backroom', label: 'Backroom' },
  { id: 'backroom-calc', label: 'Backroom Calc' },
  { id: 'quick-ref', label: 'Quick Ref' },
  { id: 'changelog', label: 'Changelog' },
];

// --- Backroom pricing constants (from pricing model) ---
const BR_LOCATION_FEE = 20;
const BR_USAGE_FEE = 0.50;
const BR_HARDWARE_COST = 199;
const BR_LICENSE_FEE = 10;
const BR_BASELINE_WASTE_RATE = 0.12;
const BR_AVG_PRODUCT_COST = 12; // industry avg per color service

export default function BillingGuide() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { formatCurrency: fmtCurrency } = useFormatCurrency();
  const [searchParams] = useSearchParams();
  const scrolledRef = useRef(false);

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

  const cycleEntries = Object.entries(CYCLE_DISCOUNTS) as [string, number][];
  const cycleLabels: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual',
  };

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
        backTo="/dashboard/platform/accounts"
      />

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
        <PlatformCard variant="glass" id="plans">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <PlatformCardTitle className={tokens.card.title}>Subscription Plans</PlatformCardTitle>
                <PlatformCardDescription>Live from the database. These are the plans available to organizations.</PlatformCardDescription>
              </div>
            </div>
          </PlatformCardHeader>
          <PlatformCardContent>
            <PlatformTable>
              <PlatformTableHeader>
                <PlatformTableRow>
                  <PlatformTableHead className={tokens.table.columnHeader}>Plan</PlatformTableHead>
                  <PlatformTableHead className={tokens.table.columnHeader}>Monthly</PlatformTableHead>
                  <PlatformTableHead className={tokens.table.columnHeader}>Annual Effective</PlatformTableHead>
                  <PlatformTableHead className={tokens.table.columnHeader}>Max Locations</PlatformTableHead>
                  <PlatformTableHead className={tokens.table.columnHeader}>Max Users</PlatformTableHead>
                  <PlatformTableHead className={tokens.table.columnHeader}>Description</PlatformTableHead>
                </PlatformTableRow>
              </PlatformTableHeader>
              <PlatformTableBody>
                {plans?.map((plan) => (
                  <PlatformTableRow key={plan.id}>
                    <PlatformTableCell className="font-medium">{plan.name}</PlatformTableCell>
                    <PlatformTableCell>{fmtCurrency(plan.price_monthly)}</PlatformTableCell>
                    <PlatformTableCell>{fmtCurrency(plan.price_monthly * (1 - CYCLE_DISCOUNTS.annual) * 12)}/yr</PlatformTableCell>
                    <PlatformTableCell>{plan.max_locations === -1 ? 'Unlimited' : plan.max_locations}</PlatformTableCell>
                    <PlatformTableCell>{plan.max_users === -1 ? 'Unlimited' : plan.max_users}</PlatformTableCell>
                    <PlatformTableCell className="text-[hsl(var(--platform-foreground-muted))] max-w-xs truncate">{plan.description || '—'}</PlatformTableCell>
                  </PlatformTableRow>
                ))}
              </PlatformTableBody>
            </PlatformTable>
          </PlatformCardContent>
        </PlatformCard>

        {/* Billing Cycle Discounts */}
        <PlatformCard variant="glass" id="discounts">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div>
                <PlatformCardTitle className={tokens.card.title}>Billing Cycle Discounts</PlatformCardTitle>
                <PlatformCardDescription>Discount applied when an org pays for multiple months upfront.</PlatformCardDescription>
              </div>
            </div>
          </PlatformCardHeader>
          <PlatformCardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cycleEntries.map(([cycle, discount]) => (
                <div key={cycle} className="rounded-xl border border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg-card)/0.5)] p-4 text-center">
                  <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
                    {cycleLabels[cycle]}
                  </p>
                  <p className="font-display text-2xl tracking-wide mt-1 text-[hsl(var(--platform-foreground))]">
                    {discount === 0 ? 'No Discount' : `${(discount * 100).toFixed(0)}% Off`}
                  </p>
                  <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-1">
                    {CYCLE_MULTIPLIERS[cycle as keyof typeof CYCLE_MULTIPLIERS]} months
                  </p>
                </div>
              ))}
            </div>
          </PlatformCardContent>
        </PlatformCard>

        {/* How Billing Works */}
        <PlatformCard variant="glass" id="how-it-works">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <PlatformCardTitle className={tokens.card.title}>How Billing Works</PlatformCardTitle>
                <PlatformCardDescription>Step-by-step breakdown of how an invoice amount is calculated.</PlatformCardDescription>
              </div>
            </div>
          </PlatformCardHeader>
          <PlatformCardContent>
            <ol className="space-y-4 text-sm text-[hsl(var(--platform-foreground)/0.85)]">
              {[
                { title: 'Base Price', desc: 'Comes from the subscription plan\'s monthly price. Can be overridden with a Custom Price on the account\'s billing config.' },
                { title: 'Promotional Pricing', desc: 'If a promo is active (has a future expiry date), the promo price replaces the base price for the promo period. Discounts do not stack on top of promos.' },
                { title: 'Discounts (when no promo)', desc: 'A percentage or fixed-amount discount is applied to the effective monthly price. Only applies when no promotional pricing is active.' },
                { title: 'Overage Fees', desc: 'If the org exceeds their plan\'s included locations or users, per-unit overage fees are added monthly. Purchased add-on capacity also adds per-unit fees.' },
                { title: 'Cycle Discount', desc: 'The total monthly amount is multiplied by the cycle length (e.g. ×3 for quarterly), then the cycle discount is applied (see table above).' },
                { title: 'Setup Fee', desc: 'A one-time setup fee is added to the first invoice only. Once marked as paid, it won\'t appear again.' },
                { title: 'Trial Period', desc: 'If a trial is active (future expiry), the first invoice amount is $0 until the trial ends. After trial, normal billing resumes.' },
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
        </PlatformCard>

        {/* Interactive Billing Calculator */}
        <BillingCalculatorWidget plans={plans || []} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Backroom Add-On */}
          <PlatformCard variant="glass" id="backroom">
            <PlatformCardHeader>
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <PlatformCardTitle className={tokens.card.title}>Backroom Add-On</PlatformCardTitle>
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
                  Backroom is enabled per-location. Charges are billed alongside the subscription invoice.
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
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Contract Lengths</p>
                  <p>Month-to-Month, 6 Months, 1 Year, 2 Years, or 3 Years. Configured per organization.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Auto-Renewal</p>
                  <p>When enabled, the contract renews at the same terms when it expires. When disabled, the org moves to month-to-month after contract end.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Promotional Pricing</p>
                  <p>Set a reduced price for X months from contract start. Once the promo expires, billing reverts to the base (or custom) price. Promos and discounts never stack.</p>
                </div>
                <div className="border-t border-[hsl(var(--platform-border)/0.5)] pt-3">
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Plan Changes</p>
                  <p>Upgrades/downgrades are logged in billing history. Can take effect immediately or at next billing cycle.</p>
                </div>
              </div>
            </PlatformCardContent>
          </PlatformCard>
        </div>

        {/* Changelog */}
        <PlatformCard variant="glass" id="changelog">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <PlatformCardTitle className={tokens.card.title}>Changelog</PlatformCardTitle>
                <PlatformCardDescription>History of billing logic and pricing changes.</PlatformCardDescription>
              </div>
            </div>
          </PlatformCardHeader>
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
        </PlatformCard>
      </div>
    </PlatformPageContainer>
  );
}

// --- Billing Calculator Widget ---

function BillingCalculatorWidget({ plans }: { plans: SubscriptionPlan[] }) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [promoPrice, setPromoPrice] = useState<string>('');
  const [promoActive, setPromoActive] = useState(false);
  const [setupFee, setSetupFee] = useState<string>('0');
  const [setupFeePaid, setSetupFeePaid] = useState(false);
  const [addLocations, setAddLocations] = useState<string>('0');
  const [addUsers, setAddUsers] = useState<string>('0');
  const [perLocationFee, setPerLocationFee] = useState<string>('0');
  const [perUserFee, setPerUserFee] = useState<string>('0');
  const [locationCount, setLocationCount] = useState<string>('1');
  const [userCount, setUserCount] = useState<string>('1');

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || null;

  // Build synthetic billing object
  const syntheticBilling = useMemo<OrganizationBilling | null>(() => {
    if (!selectedPlan) return null;
    const now = new Date();
    const futureDate = promoActive ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    return {
      id: 'calc',
      organization_id: 'calc',
      plan_id: selectedPlan.id,
      billing_cycle: cycle,
      contract_length_months: CYCLE_MULTIPLIERS[cycle],
      contract_start_date: null,
      contract_end_date: null,
      base_price: selectedPlan.price_monthly,
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
      per_location_fee: parseFloat(perLocationFee) || 0,
      per_user_fee: parseFloat(perUserFee) || 0,
      additional_locations_purchased: parseInt(addLocations) || 0,
      additional_users_purchased: parseInt(addUsers) || 0,
      included_locations: selectedPlan.max_locations,
      included_users: selectedPlan.max_users,
      auto_renewal: true,
      non_renewal_requested_at: null,
      non_renewal_reason: null,
      notes: null,
      created_at: '',
      updated_at: '',
    };
  }, [selectedPlan, cycle, customPrice, promoPrice, promoActive, setupFee, setupFeePaid, addLocations, addUsers, perLocationFee, perUserFee]);

  const calc = useBillingCalculations(
    syntheticBilling,
    selectedPlan,
    parseInt(locationCount) || 1,
    parseInt(userCount) || 0
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
            <PlatformCardDescription>Punch in plan details to see computed invoice amounts. Uses the same engine as real billing.</PlatformCardDescription>
          </div>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="bg-[hsl(var(--platform-input))] border-[hsl(var(--platform-border)/0.5)] text-[hsl(var(--platform-foreground))]">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price_monthly)}/mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Billing Cycle</Label>
              <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
                <SelectTrigger className="bg-[hsl(var(--platform-input))] border-[hsl(var(--platform-border)/0.5)] text-[hsl(var(--platform-foreground))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['monthly', 'quarterly', 'semi_annual', 'annual'] as BillingCycle[]).map(c => (
                    <SelectItem key={c} value={c}>
                      {getBillingCycleLabel(c)} {CYCLE_DISCOUNTS[c] > 0 && `(${(CYCLE_DISCOUNTS[c] * 100).toFixed(0)}% off)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Total Locations</Label>
                <PlatformInput type="number" value={locationCount} onChange={e => setLocationCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Total Users</Label>
                <PlatformInput type="number" value={userCount} onChange={e => setUserCount(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Add-On Locations</Label>
                <PlatformInput type="number" value={addLocations} onChange={e => setAddLocations(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Add-On Users</Label>
                <PlatformInput type="number" value={addUsers} onChange={e => setAddUsers(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Per-Location Fee</Label>
                <PlatformInput type="number" value={perLocationFee} onChange={e => setPerLocationFee(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[hsl(var(--platform-foreground-muted))]">Per-User Fee</Label>
                <PlatformInput type="number" value={perUserFee} onChange={e => setPerUserFee(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] p-5">
            <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))] mb-4">Invoice Preview</p>
            {!selectedPlan ? (
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Select a plan to see results.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <ResultRow label="Base Monthly" value={formatCurrency(calc.monthlyAmount)} />
                <ResultRow label="Effective Monthly" value={formatCurrency(calc.effectiveMonthlyAmount)} highlight />
                {calc.isInPromo && <ResultRow label="Promo Savings" value={`-${formatCurrency(calc.promoSavings)}/mo`} accent />}
                <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
                <ResultRow label={`Cycle Amount (${getBillingCycleLabel(cycle)})`} value={formatCurrency(calc.cycleAmount)} highlight />
                {calc.savingsAmount > 0 && <ResultRow label="Cycle Savings" value={`-${formatCurrency(calc.savingsAmount)} (${calc.savingsPercentage}%)`} accent />}
                <ResultRow label="Annual Projection" value={formatCurrency(calc.annualAmount)} />
                <div className="border-t border-[hsl(var(--platform-border)/0.3)] my-2" />
                <ResultRow label="First Invoice" value={formatCurrency(calc.firstInvoiceAmount)} highlight />
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
