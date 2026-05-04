/**
 * ReputationOAuthGraceBanner
 *
 * Materiality-gated banner that surfaces when one or more per-location Google
 * Business Profile connections need attention (expired/revoked/error) OR
 * legacy org-scoped rows are unmapped to a specific location.
 *
 * Visibility Contract: silent when all GBP connections are healthy.
 *
 * Throttling — cross-device via `user_ui_preferences`:
 *   Surface key: `reputation.gbp-grace-snooze`. Per-user JSON of shape
 *   `{ orgId, signature, snoozedAt }`. The same operator opening the
 *   dashboard on phone after dismissing on desktop stays in the snoozed
 *   window. Signature change (more locations break, or one is fixed)
 *   re-shows immediately because the situation has materially changed.
 *
 * Why "before clicking Reconnect" matters:
 *   The verify-locations cron writes a `last_error` reason to
 *   `review_platform_connections` (e.g. `token_revoked`,
 *   `gbp_suspended_or_merged`). The banner now surfaces that reason inline
 *   AND deep-links to the affected location's connector tile in the Online
 *   Presence tab via `?tab=presence&focus=<location_id>` so operators see
 *   *why* before re-authenticating.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X, Info } from 'lucide-react';
import { useGBPHealth } from '@/hooks/useGBPHealth';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useUiPreference } from '@/hooks/useUiPreference';

const THROTTLE_HOURS = 24;
const SURFACE = 'reputation.gbp-grace-snooze';

interface SnoozeState {
  orgId: string;
  signature: string;
  snoozedAt: number;
}

/**
 * Translate a raw `last_error` enum from the verify-locations cron into a
 * one-line operator-readable phrase. Unknown reasons fall back to the raw
 * code (better than silent erasure) so we get reports instead of mysteries.
 */
function describeReason(reason: string | null): string | null {
  if (!reason) return null;
  switch (reason) {
    case 'token_revoked':
      return 'Google access was revoked from the Google account';
    case 'refresh_failed':
      return 'Google refused to refresh the access token';
    case 'gbp_suspended_or_merged':
      return 'The Business Profile was suspended or merged on Google';
    default:
      return `Last error: ${reason}`;
  }
}

export function ReputationOAuthGraceBanner() {
  const { data } = useGBPHealth();
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;
  const { value: snooze, setValue: setSnooze } = useUiPreference<SnoozeState>(SURFACE);

  const signature = data
    ? `${data.needsReconnect}|${data.unmapped}|${data.total}`
    : null;

  const isSnoozed = useMemo(() => {
    if (!orgId || !signature || !snooze) return false;
    if (snooze.orgId !== orgId) return false;
    if (snooze.signature !== signature) return false;
    const ageHours = (Date.now() - snooze.snoozedAt) / (1000 * 60 * 60);
    return ageHours < THROTTLE_HOURS;
  }, [orgId, signature, snooze]);

  if (!data || !orgId || !signature) return null;
  const { needsReconnect, unmapped, total, topError } = data;
  if (needsReconnect === 0 && unmapped === 0) return null;
  if (isSnoozed) return null;

  // Auto-record the snooze for this signature on first render, so subsequent
  // page loads within the window stay quiet without explicit dismissal.
  if (!snooze || snooze.orgId !== orgId || snooze.signature !== signature) {
    void setSnooze({ orgId, signature, snoozedAt: Date.now() });
  }

  const reasonPhrase = describeReason(topError?.reason ?? null);

  const message = needsReconnect > 0
    ? `${needsReconnect} of ${total} location${total === 1 ? '' : 's'} need a Google reconnect`
    : `${unmapped} Google connection${unmapped === 1 ? '' : 's'} not mapped to a location`;

  // Deep-link rules:
  //   unmapped-only → backfill page (Map connections).
  //   has reason + locationId → focus that location's connector tile so the
  //     operator can read the failure context before reconnecting.
  //   reconnect needed, no specific location → Online Presence tab overview.
  let ctaHref: string;
  let ctaLabel: string;
  if (unmapped > 0 && needsReconnect === 0) {
    ctaHref = dashPath('/admin/feedback/connect-google');
    ctaLabel = 'Map connections';
  } else if (topError?.locationId) {
    ctaHref = `${dashPath('/admin/feedback')}?tab=presence&focus=${encodeURIComponent(topError.locationId)}`;
    ctaLabel = 'See what changed';
  } else {
    ctaHref = `${dashPath('/admin/feedback')}?tab=presence`;
    ctaLabel = 'Review connections';
  }

  const handleDismiss = () => {
    void setSnooze({ orgId, signature, snoozedAt: Date.now() });
  };

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">Google Business Profile attention needed</p>
        <p className="text-muted-foreground mt-0.5">
          {message} — review collection is paused for affected locations until reconnected.
        </p>
        {reasonPhrase && (
          <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs">
            <Info className="w-3 h-3" />
            <span>{reasonPhrase}.</span>
          </p>
        )}
      </div>
      <Link
        to={ctaHref}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-700 shrink-0"
      >
        {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={`Dismiss for ${THROTTLE_HOURS} hours`}
        className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
