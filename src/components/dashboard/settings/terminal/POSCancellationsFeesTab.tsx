/**
 * POS Cancellations & Fees Tab (Wave 28.17)
 *
 * READ-ONLY contextual reference inside the POS settings surface. Surfaces
 * the four booking-adjacent policies (`payment_policy`, `cancellation_policy`,
 * `no_show_policy`, `booking_policy`) so an operator configuring the terminal
 * can see exactly what will be charged — without owning the edit path.
 *
 * Doctrine: Bookings & Payments (`?category=bookings-payments`, Wave 28.16)
 * is the single source of truth. This tab MUST NOT write to
 * `policy_rule_blocks`. Discoverability without drift.
 */
import * as React from 'react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CreditCard, CalendarX, UserX, ShieldCheck, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePolicyConfiguratorData, type PolicyRuleBlock } from '@/hooks/policy/usePolicyConfigurator';
import { usePolicyVariants } from '@/hooks/policy/usePolicyDrafter';
import { usePolicyLastEdited } from '@/hooks/policy/usePolicyLastEdited';
import { extractReceiptSentence } from '@/lib/policy/extract-receipt-sentence';
import { formatRelativeTime } from '@/lib/format';

// ─── Helpers ────────────────────────────────────────────────────────────────

function blockValue(blocks: PolicyRuleBlock[] | undefined, key: string): unknown {
  return blocks?.find((b) => b.block_key === key)?.value;
}

function formatCurrency(value: unknown): string | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

function formatHours(value: unknown): string | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  if (n >= 24 && n % 24 === 0) {
    const days = n / 24;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${n} hour${n === 1 ? '' : 's'}`;
}

function humanize(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const str = String(value).replace(/_/g, ' ').trim();
  if (!str) return null;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Summary row primitive ──────────────────────────────────────────────────

interface SummaryRowProps {
  label: string;
  value: string | null | undefined;
  fallback?: string;
}

function SummaryRow({ label, value, fallback = 'Not configured' }: SummaryRowProps) {
  const isSet = value != null && value !== '';
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border/40 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-medium text-right',
          isSet ? 'text-foreground' : 'text-muted-foreground/60 italic',
        )}
      >
        {isSet ? value : fallback}
      </span>
    </div>
  );
}

// ─── Policy summary card ────────────────────────────────────────────────────

interface PolicySummaryCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  isLoading: boolean;
  rows: Array<{ label: string; value: string | null | undefined }>;
}

// ─── Receipt preview line ───────────────────────────────────────────────────

interface ReceiptPreviewLineProps {
  versionId: string | undefined;
  policyKey: string;
  onJump: () => void;
}

function ReceiptPreviewLine({ versionId, policyKey, onJump }: ReceiptPreviewLineProps) {
  const { data: variants, isLoading } = usePolicyVariants(versionId);

  if (!versionId) return null;
  if (isLoading) return null;

  const clientVariant = (variants ?? []).find(
    (v) => v.variant_type === 'client' && v.approved,
  );
  const sentence = clientVariant
    ? extractReceiptSentence(clientVariant.body_md, policyKey)
    : null;

  if (!sentence) {
    return (
      <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
          On the receipt
        </div>
        <button
          type="button"
          onClick={onJump}
          className="text-xs text-muted-foreground italic text-left hover:text-foreground transition-colors"
        >
          Not yet approved — Publish in Bookings &amp; Payments to set the receipt copy.
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
        On the receipt
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">&ldquo;{sentence}&rdquo;</p>
    </div>
  );
}

// ─── Last-edited footer ─────────────────────────────────────────────────────

interface LastEditedFooterProps {
  policyId: string | undefined;
}

function LastEditedFooter({ policyId }: LastEditedFooterProps) {
  const { data, isLoading } = usePolicyLastEdited(policyId);

  if (!policyId || isLoading || !data?.updatedAt) return null;

  return (
    <div className="mt-3 pt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
      <Clock className="w-3 h-3" />
      <span>
        Last edited {formatRelativeTime(data.updatedAt)} by {data.actorName}
      </span>
    </div>
  );
}

// ─── Policy summary card ────────────────────────────────────────────────────

interface PolicySummaryCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  isLoading: boolean;
  rows: Array<{ label: string; value: string | null | undefined }>;
  policyId: string | undefined;
  versionId: string | undefined;
  policyKey: string;
  onJump: () => void;
}

function PolicySummaryCard({
  title,
  description,
  icon: Icon,
  isLoading,
  rows,
  policyId,
  versionId,
  policyKey,
  onJump,
}: PolicySummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className={tokens.card.title}>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading current rules…
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {rows.map((r) => (
                <SummaryRow key={r.label} label={r.label} value={r.value} />
              ))}
            </div>
            <ReceiptPreviewLine versionId={versionId} policyKey={policyKey} onJump={onJump} />
            <LastEditedFooter policyId={policyId} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main tab ───────────────────────────────────────────────────────────────

export function POSCancellationsFeesTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read-only: pull current rule blocks for the four booking-adjacent policies.
  // Forward-compatible — when Wave 28.16 ships `useBookingsPaymentsBundle`,
  // this can be swapped for a single bundled fetch.
  const payment = usePolicyConfiguratorData('payment_policy');
  const cancellation = usePolicyConfiguratorData('cancellation_policy');
  const noShow = usePolicyConfiguratorData('no_show_policy');
  const booking = usePolicyConfiguratorData('booking_policy');

  const isLoading = payment.isLoading || cancellation.isLoading || noShow.isLoading || booking.isLoading;
  const noneConfigured =
    !isLoading &&
    !payment.data?.versionId &&
    !cancellation.data?.versionId &&
    !noShow.data?.versionId &&
    !booking.data?.versionId;

  // ─── Derived display values ───────────────────────────────────────────────

  const paymentRows = useMemo(() => {
    const blocks = payment.data?.blocks;
    const headline = humanize(blockValue(blocks, 'payment_requirement'))
      ?? humanize(blockValue(blocks, 'collection_mode'))
      ?? humanize(blockValue(blocks, 'mode'));
    const depositAmount = formatCurrency(blockValue(blocks, 'deposit_amount'));
    const depositPercent = blockValue(blocks, 'deposit_percent');
    const depositDisplay = depositAmount
      ?? (depositPercent != null ? `${depositPercent}% of service` : null);
    return [
      { label: 'Payment requirement', value: headline },
      { label: 'Deposit', value: depositDisplay },
    ];
  }, [payment.data]);

  const cancellationRows = useMemo(() => {
    const blocks = cancellation.data?.blocks;
    const cutoff = formatHours(blockValue(blocks, 'cutoff_hours'))
      ?? humanize(blockValue(blocks, 'cutoff_window'));
    const feeAmount = formatCurrency(blockValue(blocks, 'late_fee_amount'))
      ?? formatCurrency(blockValue(blocks, 'fee_amount'));
    const feePercent = blockValue(blocks, 'fee_percent');
    const feeDisplay = feeAmount
      ?? (feePercent != null ? `${feePercent}% of service` : null);
    return [
      { label: 'Cut-off window', value: cutoff },
      { label: 'Late cancellation fee', value: feeDisplay },
    ];
  }, [cancellation.data]);

  const noShowRows = useMemo(() => {
    const blocks = noShow.data?.blocks;
    const chargeType = humanize(blockValue(blocks, 'charge_type'))
      ?? humanize(blockValue(blocks, 'fee_type'));
    const flat = formatCurrency(blockValue(blocks, 'flat_fee_amount'))
      ?? formatCurrency(blockValue(blocks, 'fee_amount'));
    const percent = blockValue(blocks, 'percent_of_service');
    const charge = flat
      ?? (percent != null ? `${percent}% of service` : null)
      ?? chargeType;
    const colorCorrectionFlat = formatCurrency(blockValue(blocks, 'color_correction_flat_fee'));
    return [
      { label: 'No-show charge', value: charge },
      { label: 'Color-correction override', value: colorCorrectionFlat },
    ];
  }, [noShow.data]);

  const bookingRows = useMemo(() => {
    const blocks = booking.data?.blocks;
    const cardOnFile = blockValue(blocks, 'card_on_file_required');
    const cardLabel = cardOnFile == null
      ? null
      : cardOnFile === true || cardOnFile === 'required'
        ? 'Required at booking'
        : 'Optional';
    const newClientPolicy = humanize(blockValue(blocks, 'new_client_consultation_required'))
      ?? humanize(blockValue(blocks, 'consultation_required_for'));
    return [
      { label: 'Card on file', value: cardLabel },
      { label: 'New client consultation', value: newClientPolicy },
    ];
  }, [booking.data]);

  // ─── Jump-link handler ────────────────────────────────────────────────────

  const goToBookingsPayments = (anchor?: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('category', 'bookings-payments');
    newParams.delete('subtab');
    if (anchor) newParams.set('anchor', anchor);
    setSearchParams(newParams, { replace: false });
  };

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (noneConfigured) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className={cn(tokens.empty.heading)}>No fee policies configured</h3>
              <p className={cn(tokens.empty.description)}>
                Set your payment, cancellation, and no-show rules in Bookings & Payments
                to govern what your terminal will charge.
              </p>
            </div>
            <Button onClick={() => goToBookingsPayments()} className="mt-2">
              Configure in Bookings & Payments
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Standard render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Explainer + primary jump-link */}
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <p className="text-sm text-foreground">
                These rules are configured in Bookings &amp; Payments and govern what your terminal will charge clients.
              </p>
              <p className="text-xs text-muted-foreground">
                Edit them in one place to keep your policy, your booking page, and your terminal in sync.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => goToBookingsPayments()}
              className="shrink-0"
            >
              Edit in Bookings &amp; Payments
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Read-only summary grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <PolicySummaryCard
          title="Payment policy"
          description="What clients commit at the time of booking."
          icon={CreditCard}
          isLoading={payment.isLoading}
          rows={paymentRows}
        />
        <PolicySummaryCard
          title="Cancellation policy"
          description="When and how late cancellations are charged."
          icon={CalendarX}
          isLoading={cancellation.isLoading}
          rows={cancellationRows}
        />
        <PolicySummaryCard
          title="No-show policy"
          description="What the terminal charges when a client doesn't arrive."
          icon={UserX}
          isLoading={noShow.isLoading}
          rows={noShowRows}
        />
        <PolicySummaryCard
          title="Booking rules"
          description="Card-on-file and consultation requirements."
          icon={ShieldCheck}
          isLoading={booking.isLoading}
          rows={bookingRows}
        />
      </div>
    </div>
  );
}
