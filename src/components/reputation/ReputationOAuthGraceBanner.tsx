/**
 * ReputationOAuthGraceBanner
 *
 * Materiality-gated banner that surfaces when one or more per-location Google
 * Business Profile connections need attention (expired/revoked/error) OR
 * legacy org-scoped rows are unmapped to a specific location.
 *
 * Visibility Contract: silent when all GBP connections are healthy.
 *
 * Throttling (Alert Governance alignment):
 *   The banner is mounted GLOBALLY in DashboardLayout, so a naive render-on-
 *   every-page model produces fatigue when a salon has been broken for weeks
 *   without action. We adopt a client-side dedup window keyed on
 *   (org_id, signature) — signature being needsReconnect|unmapped|total.
 *
 *   Rules:
 *     1. First time we see a given signature: show + record snooze timestamp.
 *     2. Subsequent renders within `THROTTLE_HOURS`: silent.
 *     3. Signature change (more locations break, or one is fixed): re-show
 *        immediately — the situation has materially changed.
 *     4. Operator can dismiss explicitly to extend the snooze.
 *
 *   This mirrors the platform-wide notification dedup philosophy from
 *   `_shared/notify.ts` but for client-rendered nudges (no DB row).
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useGBPHealth } from '@/hooks/useGBPHealth';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const THROTTLE_HOURS = 24;
const STORAGE_KEY = 'reputation-oauth-grace-snooze-v1';

interface SnoozeEntry {
  signature: string;
  snoozedAt: number; // epoch ms
}

function readSnooze(orgId: string): SnoozeEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, SnoozeEntry>;
    return map[orgId] ?? null;
  } catch {
    return null;
  }
}

function writeSnooze(orgId: string, entry: SnoozeEntry | null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, SnoozeEntry>) : {};
    if (entry) map[orgId] = entry;
    else delete map[orgId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable (private mode etc.) — fall through; banner
    // will simply re-render on each page load (degraded but safe).
  }
}

export function ReputationOAuthGraceBanner() {
  const { data } = useGBPHealth();
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  // Local dismissal forces immediate re-snooze even within the active window.
  const [forceDismissTick, setForceDismissTick] = useState(0);

  const signature = data
    ? `${data.needsReconnect}|${data.unmapped}|${data.total}`
    : null;

  const isSnoozed = useMemo(() => {
    if (!orgId || !signature) return false;
    const snooze = readSnooze(orgId);
    if (!snooze) return false;
    // Signature changed → situation evolved, show again.
    if (snooze.signature !== signature) return false;
    const ageHours = (Date.now() - snooze.snoozedAt) / (1000 * 60 * 60);
    return ageHours < THROTTLE_HOURS;
    // forceDismissTick intentionally re-triggers memo on dismiss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, signature, forceDismissTick]);

  if (!data || !orgId || !signature) return null;
  const { needsReconnect, unmapped, total } = data;
  if (needsReconnect === 0 && unmapped === 0) return null;
  if (isSnoozed) return null;

  // Auto-record the snooze the first time we render this signature so that
  // subsequent page loads within THROTTLE_HOURS stay quiet without explicit
  // dismissal. Operator action (CTA click or X) extends the same window.
  const existing = readSnooze(orgId);
  if (!existing || existing.signature !== signature) {
    writeSnooze(orgId, { signature, snoozedAt: Date.now() });
  }

  const message = needsReconnect > 0
    ? `${needsReconnect} of ${total} location${total === 1 ? '' : 's'} need a Google reconnect`
    : `${unmapped} Google connection${unmapped === 1 ? '' : 's'} not mapped to a location`;

  const ctaHref = unmapped > 0 && needsReconnect === 0
    ? dashPath('/admin/feedback/connect-google')
    : `${dashPath('/admin/feedback')}?tab=presence`;
  const ctaLabel = unmapped > 0 && needsReconnect === 0 ? 'Map connections' : 'Review connections';

  const handleDismiss = () => {
    writeSnooze(orgId, { signature, snoozedAt: Date.now() });
    setForceDismissTick((t) => t + 1);
  };

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
