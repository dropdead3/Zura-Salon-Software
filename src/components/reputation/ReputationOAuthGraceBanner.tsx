/**
 * ReputationOAuthGraceBanner
 *
 * Materiality-gated banner that surfaces when one or more per-location Google
 * Business Profile connections need attention (expired/revoked/error) OR
 * legacy org-scoped rows are unmapped to a specific location.
 *
 * Visibility Contract: silent when all GBP connections are healthy.
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useGBPHealth } from '@/hooks/useGBPHealth';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export function ReputationOAuthGraceBanner() {
  const { data } = useGBPHealth();
  const { dashPath } = useOrgDashboardPath();
  if (!data) return null;
  const { needsReconnect, unmapped, total } = data;
  if (needsReconnect === 0 && unmapped === 0) return null;

  const message = needsReconnect > 0
    ? `${needsReconnect} of ${total} location${total === 1 ? '' : 's'} need a Google reconnect`
    : `${unmapped} Google connection${unmapped === 1 ? '' : 's'} not mapped to a location`;

  // Unmapped → backfill page; reconnect needed → Online Presence tab.
  const ctaHref = unmapped > 0 && needsReconnect === 0
    ? dashPath('/admin/feedback/connect-google')
    : `${dashPath('/admin/feedback')}?tab=presence`;
  const ctaLabel = unmapped > 0 && needsReconnect === 0 ? 'Map connections' : 'Review connections';

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">Google Business Profile attention needed</p>
        <p className="text-muted-foreground mt-0.5">
          {message} — review collection is paused for affected locations until reconnected.
        </p>
      </div>
      <Link
        to={ctaHref}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-700 shrink-0"
      >
        {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
