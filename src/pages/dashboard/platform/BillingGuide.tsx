import { Loader2, BookOpen, Calculator, Receipt, Package, FileText } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useSubscriptionPlans } from '@/hooks/useOrganizationBilling';
import { CYCLE_MULTIPLIERS, CYCLE_DISCOUNTS } from '@/hooks/useBillingCalculations';
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

export default function BillingGuide() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { formatCurrency } = useFormatCurrency();

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

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Billing Guide"
        description="Internal reference for how organizations are billed. Data is live — changes to plans or billing logic are reflected here automatically."
        backTo="/dashboard/platform/accounts"
      />

      <div className="space-y-6 mt-6">
        {/* Plans Overview */}
        <PlatformCard variant="glass">
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
                    <PlatformTableCell>{formatCurrency(plan.price_monthly)}</PlatformTableCell>
                    <PlatformTableCell>{formatCurrency(plan.price_monthly * (1 - CYCLE_DISCOUNTS.annual) * 12)}/yr</PlatformTableCell>
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
        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Calculator className="w-5 h-5 text-primary" />
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
        <PlatformCard variant="glass">
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
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">1</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Base Price</p>
                  <p>Comes from the subscription plan's monthly price. Can be overridden with a <strong>Custom Price</strong> on the account's billing config.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">2</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Promotional Pricing</p>
                  <p>If a promo is active (has a future expiry date), the promo price replaces the base price for the promo period. Discounts do <strong>not</strong> stack on top of promos.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">3</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Discounts (when no promo)</p>
                  <p>A percentage or fixed-amount discount is applied to the effective monthly price. Only applies when no promotional pricing is active.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">4</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Overage Fees</p>
                  <p>If the org exceeds their plan's included locations or users, per-unit overage fees are added monthly. Purchased add-on capacity also adds per-unit fees.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">5</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Cycle Discount</p>
                  <p>The total monthly amount is multiplied by the cycle length (e.g. ×3 for quarterly), then the cycle discount is applied (see table above).</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">6</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Setup Fee</p>
                  <p>A one-time setup fee is added to the <strong>first invoice only</strong>. Once marked as paid, it won't appear again.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-display text-xs flex items-center justify-center">7</span>
                <div>
                  <p className="font-medium text-[hsl(var(--platform-foreground))]">Trial Period</p>
                  <p>If a trial is active (future expiry), the first invoice amount is <strong>$0</strong> until the trial ends. After trial, normal billing resumes.</p>
                </div>
              </li>
            </ol>
          </PlatformCardContent>
        </PlatformCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Backroom Add-On */}
          <PlatformCard variant="glass">
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
                  <span className="font-medium text-[hsl(var(--platform-foreground))]">$20/mo per location</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[hsl(var(--platform-border)/0.5)]">
                  <span>Per color service fee</span>
                  <span className="font-medium text-[hsl(var(--platform-foreground))]">$0.50 per service</span>
                </div>
                <p className="text-xs text-[hsl(var(--platform-foreground-muted))] pt-2">
                  Backroom is enabled per-location. Charges are billed alongside the subscription invoice.
                </p>
              </div>
            </PlatformCardContent>
          </PlatformCard>

          {/* Quick Reference */}
          <PlatformCard variant="glass">
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
      </div>
    </PlatformPageContainer>
  );
}
