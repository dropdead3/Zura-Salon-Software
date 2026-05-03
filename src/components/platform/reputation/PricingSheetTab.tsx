/**
 * PricingSheetTab — Authoritative AE pricing reference for Zura Reputation.
 * All numbers + Stripe IDs read from src/config/reputationPricing.ts.
 */
import { useState } from 'react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardDescription,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  REPUTATION_PRICING_SHEET,
  REPUTATION_STRIPE,
} from '@/config/reputationPricing';
import { Check, Copy, DollarSign, Tag, Clock, ShieldOff, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-hover)/0.5)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
    >
      <span className="font-mono text-xs text-[hsl(var(--platform-foreground)/0.85)]">{value}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3 text-[hsl(var(--platform-foreground-subtle))]" />
      )}
    </button>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  detail,
  badge,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[hsl(var(--platform-border)/0.3)] last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[hsl(var(--platform-primary))]" />
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-xs tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-subtle))]">
            {label}
          </span>
          {badge}
        </div>
        <div className="font-sans text-sm text-[hsl(var(--platform-foreground))]">{value}</div>
        {detail && (
          <div className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">{detail}</div>
        )}
      </div>
    </div>
  );
}

export function PricingSheetTab() {
  const sheet = REPUTATION_PRICING_SHEET;

  return (
    <div className="space-y-6">
      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Pricing Sheet</PlatformCardTitle>
          <PlatformCardDescription>
            Authorized commercial terms. Quote nothing outside this sheet — escalate to revops first.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="divide-y-0">
          <Row
            icon={DollarSign}
            label="Base SKU"
            value={
              <span>
                <span className="font-display text-2xl">${sheet.baseSku.monthlyPrice}</span>
                <span className="text-[hsl(var(--platform-foreground-muted))] text-sm"> / month, first location</span>
              </span>
            }
            detail={sheet.baseSku.description}
          />
          <Row
            icon={Clock}
            label="Free trial"
            value={`${sheet.baseSku.trialDays} days, no credit card capture required at start.`}
          />
          <Row
            icon={DollarSign}
            label="Per-location add-on"
            badge={
              <PlatformBadge variant="warning" size="sm">
                Coming {sheet.perLocationAddOn.eta}
              </PlatformBadge>
            }
            value={
              <span>
                <span className="font-display text-2xl">${sheet.perLocationAddOn.monthlyPrice}</span>
                <span className="text-[hsl(var(--platform-foreground-muted))] text-sm"> / month, each additional location</span>
              </span>
            }
            detail={sheet.perLocationAddOn.note}
          />
          <Row
            icon={Tag}
            label="Retention coupon"
            value={sheet.retentionCoupon.label}
            detail={sheet.retentionCoupon.rules}
          />
          <Row
            icon={CalendarClock}
            label="Grace window on past_due"
            value={`${sheet.graceWindow.days} days`}
            detail={sheet.graceWindow.behavior}
          />
          <Row
            icon={ShieldOff}
            label="Refund policy"
            value="No prorated refunds."
            detail={sheet.refundPolicy}
          />
        </PlatformCardContent>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Stripe references</PlatformCardTitle>
          <PlatformCardDescription>
            For support escalations and finance reconciliation.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="flex flex-wrap items-center gap-3">
          <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Product:</span>
          <CopyChip label="Product ID" value={REPUTATION_STRIPE.productId} />
          <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] ml-2">
            Retention coupon:
          </span>
          <CopyChip label="Coupon ID" value={REPUTATION_STRIPE.retentionCouponId} />
        </PlatformCardContent>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Authorized discounts</PlatformCardTitle>
          <PlatformCardDescription>
            Anything outside this list requires revops approval.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <ul className="space-y-1">
            {sheet.authorizedDiscounts.map((d) => (
              <li
                key={d}
                className="flex items-center gap-2 font-sans text-sm text-[hsl(var(--platform-foreground)/0.85)]"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                {d}
              </li>
            ))}
          </ul>
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
