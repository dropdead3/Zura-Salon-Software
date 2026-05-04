/**
 * OnlinePresenceTab — Phorest's "Online Reputation" body, Zura-styled.
 *
 * Renders platform connector tiles (Google / Facebook) sourced from the
 * operator's primary location's `location_review_settings`. OAuth-based
 * aggregation + per-platform Respond is Phase 2 (P2.1 / P2.2 in build plan).
 *
 * Auto-Boost configuration intentionally lives in Settings → Review Gate &
 * Auto-Boost (single source of truth per the P4.1 consolidation). This tab
 * shows a thin status strip with a deep-link, but never re-implements the form.
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, Facebook, Star } from 'lucide-react';
import { GoogleGIcon } from './GoogleGIcon';
import { Link } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { useLocationReviewLinks } from '@/hooks/useLocationReviewLinks';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PlatformConnectorTile } from './PlatformConnectorTile';
import { useAutoBoostConfig } from './AutoBoostTriggerDialog';
import { FeedbackResponseList } from './FeedbackResponseList';

interface OnlinePresenceTabProps {
  organizationId?: string;
}

export function OnlinePresenceTab({ organizationId }: OnlinePresenceTabProps) {
  const { data: links } = useLocationReviewLinks();
  const { data: autoBoost } = useAutoBoostConfig();
  const { dashPath } = useOrgDashboardPath();

  // Use first location's links as the org default surface
  const primary = useMemo(() => links?.[0], [links]);
  const settingsHref = `${dashPath('/admin/feedback')}?tab=settings`;

  return (
    <div className="space-y-6">
      {/* Auto-Boost status strip — config lives in Settings */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-display text-base tracking-wide">Auto-Boost Reviews</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {autoBoost?.enabled
                  ? `Asking after ${autoBoost.promptAfterNReviews} review${autoBoost.promptAfterNReviews === 1 ? '' : 's'} of ≥ ${autoBoost.minStarThreshold} stars.`
                  : 'Off — qualifying clients see neutral framing on the share screen.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size={tokens.button.card} asChild>
            <Link to={settingsHref}>
              Manage in Settings <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Platform tiles */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlatformConnectorTile
          platform="google"
          label="Google"
          Icon={GoogleGIcon}
          iconBgClass="bg-background border border-border"
          iconColorClass=""
          reviewUrl={primary?.google_review_url}
        />
        <PlatformConnectorTile
          platform="facebook"
          label="Facebook"
          Icon={Facebook}
          iconBgClass="bg-[#1877F2]/10"
          iconColorClass="text-[#1877F2]"
          reviewUrl={primary?.facebook_review_url}
        />
      </div>

      {/* Recent first-party feedback (proxy for the "All Reviews" wall until OAuth lands) */}
      <div className="space-y-2">
        <h3 className={`${tokens.heading?.section ?? 'font-display text-base tracking-wide'} px-1`}>
          Recent client feedback
        </h3>
        <p className="text-xs text-muted-foreground px-1">
          Aggregated Google / Facebook reviews unlock once each platform is connected.
          Until then, this is your first-party feedback stream.
        </p>
        <FeedbackResponseList organizationId={organizationId} limit={20} />
      </div>
    </div>
  );
}
