/**
 * ReputationSubscriptionCard — Subscribed-state companion to ReputationGate.
 * Renders inside the Feedback Hub for orgs that already have an active /
 * trialing / past_due subscription. Shows status, renewal/grace date, and a
 * "Manage subscription" button that opens the Stripe Billing Portal via the
 * `reputation-customer-portal` edge function.
 *
 * If the org has curated (auto-published) testimonials wired into the live
 * site, we surface a cancellation-impact warning ("X live testimonials will
 * be hidden in 30 days") BEFORE the operator clicks through to Stripe — so
 * they don't accidentally torpedo their SEO proof.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Loader2, ExternalLink, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useReputationSubscription } from '@/hooks/reputation/useReputationSubscription';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ReputationSubscriptionCard() {
  const { isEntitled, orgId } = useReputationEntitlement();
  const { data, isLoading } = useReputationSubscription();
  const [opening, setOpening] = useState(false);

  if (!isEntitled || isLoading || !data) return null;

  const { status, current_period_end, grace_until, curated_testimonial_count } = data;

  async function openPortal() {
    if (!orgId) {
      toast.error('No organization context');
      return;
    }
    setOpening(true);
    try {
      const { data: invoke, error } = await supabase.functions.invoke(
        'reputation-customer-portal',
        { body: { organization_id: orgId } },
      );
      if (error) throw error;
      const url = (invoke as { url?: string } | null)?.url;
      if (!url) throw new Error('No portal URL returned');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(
        'Failed to open billing portal: ' + (e instanceof Error ? e.message : 'Unknown error'),
      );
    } finally {
      setOpening(false);
    }
  }


  const isPastDue = status === 'past_due';
  const isCanceling = status === 'canceled' || (isPastDue && grace_until);

  const statusLabel =
    status === 'trialing'
      ? 'Free trial'
      : status === 'active'
        ? 'Active'
        : status === 'past_due'
          ? 'Payment past due'
          : 'Canceled';

  const renewalLabel = isPastDue && grace_until
    ? `Grace ends ${formatDate(grace_until)}`
    : current_period_end
      ? `Renews ${formatDate(current_period_end)}`
      : '';

  return (
    <Card className="border-border/60">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={tokens.label.tiny}>Zura Reputation</span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                    isPastDue || status === 'canceled'
                      ? 'bg-amber-500/15 text-amber-600'
                      : 'bg-emerald-500/15 text-emerald-600'
                  }`}
                >
                  {isPastDue || status === 'canceled' ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {renewalLabel || '$49/month · Manage payment, plan, and cancellation in Stripe.'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={openPortal} disabled={opening}>
            {opening ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Opening…
              </>
            ) : (
              <>
                Manage subscription <ExternalLink className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>

        {curated_testimonial_count > 0 && (
          <div
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              isCanceling
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-border/60 bg-muted/30'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                isCanceling ? 'text-amber-500' : 'text-muted-foreground'
              }`}
            />
            <div className="text-sm">
              <p className="font-medium">
                {curated_testimonial_count} curated{' '}
                {curated_testimonial_count === 1 ? 'review is' : 'reviews are'} live on your site.
              </p>
              <p className="text-muted-foreground mt-1">
                {isCanceling
                  ? 'These will be auto-hidden when your subscription ends and restored if you re-subscribe within 30 days.'
                  : 'If you cancel, these will be hidden from your website 30 days after your subscription ends. Re-subscribing restores them automatically.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
