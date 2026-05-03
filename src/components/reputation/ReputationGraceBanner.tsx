/**
 * ReputationGraceBanner
 *
 * Global dashboard banner that surfaces a past_due Reputation subscription
 * BEFORE the operator's 30-day grace clock burns down. Sits inside
 * DashboardLayout so it's visible from any page — not just Feedback Hub.
 *
 * Materiality gate: silent unless status === 'past_due' AND grace_until > now.
 * Visibility Contract: silence is valid output (no stub when nothing to warn).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useReputationSubscription } from '@/hooks/reputation/useReputationSubscription';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { toast } from 'sonner';

const DISMISS_KEY = 'reputation-grace-banner-dismissed-until';

export function ReputationGraceBanner() {
  const { isEntitled, orgId } = useReputationEntitlement();
  const { data } = useReputationSubscription();
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(() => {
    const v = localStorage.getItem(DISMISS_KEY);
    return v ? Number(v) : 0;
  });

  const daysLeft = useMemo(() => {
    if (!data?.grace_until) return null;
    const ms = new Date(data.grace_until).getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [data?.grace_until]);

  if (!isEntitled || !data) return null;
  if (data.status !== 'past_due' || !data.grace_until) return null;
  if (daysLeft == null) return null;
  if (Date.now() < dismissedUntil) return null;

  async function openPortal() {
    if (!orgId) return;
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

  function dismissForOneDay() {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissedUntil(until);
  }

  const curated = data.curated_testimonial_count;
  const orgSlug = effectiveOrganization?.slug;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          Zura Reputation payment is past due — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
        </p>
        <p className="text-muted-foreground mt-0.5">
          Update your payment method to keep review collection active
          {curated > 0 ? (
            <> and avoid auto-hiding {curated} curated {curated === 1 ? 'review' : 'reviews'} from your site.</>
          ) : (
            <>.</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={openPortal}
          disabled={opening}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-700 disabled:opacity-60"
        >
          {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
          Update payment
        </button>
        {orgSlug && (
          <button
            type="button"
            onClick={() => navigate(dashPath('admin/feedback', orgSlug))}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View details
          </button>
        )}
        <button
          type="button"
          onClick={dismissForOneDay}
          aria-label="Dismiss for 24 hours"
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
