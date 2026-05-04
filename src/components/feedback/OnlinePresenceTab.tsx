/**
 * OnlinePresenceTab — Phorest's "Online Reputation" body, Zura-styled.
 *
 * Renders three platform connector tiles (Google / Facebook / Yelp) sourced
 * from location_review_settings (the operator's primary location) and exposes
 * the Auto-Boost trigger config. OAuth-based aggregation + per-platform
 * Respond is Phase 2.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { Facebook, Star } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useLocationReviewLinks } from '@/hooks/useLocationReviewLinks';
import { PlatformConnectorTile } from './PlatformConnectorTile';
import { AutoBoostTriggerDialog, useAutoBoostConfig } from './AutoBoostTriggerDialog';
import { FeedbackResponseList } from './FeedbackResponseList';

interface OnlinePresenceTabProps {
  organizationId?: string;
}

export function OnlinePresenceTab({ organizationId }: OnlinePresenceTabProps) {
  const { data: links } = useLocationReviewLinks();
  const { data: autoBoost } = useAutoBoostConfig();
  const [autoBoostOpen, setAutoBoostOpen] = useState(false);

  // Use first location's links as the org default surface
  const primary = useMemo(() => links?.[0], [links]);

  return (
    <div className="space-y-6">
      {/* Auto-Boost banner */}
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
                  ? `Asking after ${autoBoost.promptAfterNReviews} review${autoBoost.promptAfterNReviews === 1 ? '' : 's'} of ≥ ${autoBoost.minStarThreshold} stars`
                  : 'Route happy clients to Google and Facebook automatically.'}
              </p>
            </div>
          </div>
          <Button onClick={() => setAutoBoostOpen(true)} className="gap-2">
            <Zap className="h-4 w-4" /> Configure triggers
          </Button>
        </CardContent>
      </Card>

      {/* Platform tiles */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlatformConnectorTile
          platform="google"
          label="Google"
          Icon={Star}
          iconBgClass="bg-blue-500/10"
          iconColorClass="text-blue-500"
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

      <AutoBoostTriggerDialog open={autoBoostOpen} onOpenChange={setAutoBoostOpen} />
    </div>
  );
}
