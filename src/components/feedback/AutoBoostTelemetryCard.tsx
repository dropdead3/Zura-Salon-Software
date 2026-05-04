/**
 * AutoBoostTelemetryCard — Overview-tab KPI showing how Auto-Boost is converting.
 *
 * Reads:
 *   - `useAutoBoostConfig()` for cadence/threshold + on/off state.
 *   - last 30 days of `client_feedback_responses` scoped to the org, to derive
 *     qualifying volume + click-through (any non-null `external_review_clicked`).
 *
 * Doctrine guards:
 *   - Visibility Contracts: returns a calm "Auto-Boost is off" surface when
 *     disabled — silence is valid output, but operator-toggled implies the
 *     Settings link must be present so the card never reads as broken.
 *   - Reputation Engine non-gating: the card never describes link suppression;
 *     it only reports framing-conversion telemetry.
 *   - Privacy: monetary values aren't surfaced here, so no `BlurredAmount`
 *     wrap is required (counts/percentages only).
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useAutoBoostConfig } from './AutoBoostTriggerDialog';
import { tokens } from '@/lib/design-tokens';

const WINDOW_DAYS = 30;

export function AutoBoostTelemetryCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { dashPath } = useOrgDashboardPath();
  const { data: autoBoost } = useAutoBoostConfig();

  const sinceIso = useMemo(
    () => new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );

  const { data: rows } = useQuery({
    queryKey: ['auto-boost-telemetry', orgId, sinceIso],
    enabled: !!orgId && !!autoBoost?.enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_feedback_responses')
        .select('overall_rating, passed_review_gate, external_review_clicked, responded_at')
        .eq('organization_id', orgId!)
        .gte('responded_at', sinceIso)
        .not('responded_at', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const settingsHref = `${dashPath('/admin/feedback')}?tab=settings`;

  // Off state — calm summary + path back to Settings (Visibility Contract).
  if (!autoBoost?.enabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Auto-Boost</CardTitle>
                <CardDescription className="mt-1">
                  Off — qualifying clients see neutral framing on the share screen.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size={tokens.button.card} asChild>
              <Link to={settingsHref}>Configure <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const minStars = autoBoost.minStarThreshold;
  const qualifying = (rows ?? []).filter(
    (r) => r.passed_review_gate && (r.overall_rating ?? 0) >= minStars,
  );
  const converted = qualifying.filter((r) => !!r.external_review_clicked);
  const qualifyingCount = qualifying.length;
  const convertedCount = converted.length;
  const conversionPct = qualifyingCount > 0
    ? Math.round((convertedCount / qualifyingCount) * 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Auto-Boost</CardTitle>
              <CardDescription className="mt-1">
                Asking after {autoBoost.promptAfterNReviews} review
                {autoBoost.promptAfterNReviews === 1 ? '' : 's'} of ≥ {minStars} stars · last {WINDOW_DAYS} days
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size={tokens.button.card} asChild>
            <Link to={settingsHref}>Settings <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Qualifying" value={qualifyingCount} />
          <Stat label="Clicked through" value={convertedCount} />
          <Stat
            label="Conversion"
            value={conversionPct === null ? '—' : `${conversionPct}%`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="space-y-1">
      <div className={tokens.kpi.label}>{label}</div>
      <div className={tokens.kpi.value}>{value}</div>
    </div>
  );
}
