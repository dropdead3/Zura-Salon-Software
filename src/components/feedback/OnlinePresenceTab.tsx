/**
 * OnlinePresenceTab — Per-location GBP/Facebook connection management.
 *
 * Post-federation: renders one accordion per active Zura location. Each
 * accordion contains the location's PlatformConnectorTile pair, scoped to
 * that location's `review_platform_connections` row.
 *
 * Auto-Boost configuration intentionally lives in Settings (single source of
 * truth per P4.1 consolidation); this tab shows a thin status strip with a
 * deep-link, but never re-implements the form.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowRight, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GoogleGIcon, FacebookFIcon } from '@/components/brand/marks';
import { Link } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { useLocationReviewLinks } from '@/hooks/useLocationReviewLinks';
import { useActiveLocations } from '@/hooks/useLocations';
import { useReviewPlatformConnections } from '@/hooks/useReviewPlatformConnections';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PlatformConnectorTile } from './PlatformConnectorTile';

import { useAutoBoostConfig } from './AutoBoostTriggerDialog';
import { FeedbackResponseList } from './FeedbackResponseList';

interface OnlinePresenceTabProps {
  organizationId?: string;
}

export function OnlinePresenceTab({ organizationId }: OnlinePresenceTabProps) {
  const { data: links } = useLocationReviewLinks();
  const { data: locations = [] } = useActiveLocations();
  const { data: connections } = useReviewPlatformConnections();
  const { data: autoBoost } = useAutoBoostConfig();
  const { dashPath } = useOrgDashboardPath();

  const settingsHref = `${dashPath('/admin/feedback')}?tab=settings`;
  const linkByLocation = (locId: string) => links?.find((l) => l.location_id === locId);
  const googleStatusForLocation = (locId: string) => {
    const c = connections?.find((c) => c.platform === 'google' && c.location_id === locId);
    if (!c) return 'none';
    if (c.status === 'active') return 'active';
    if (c.status === 'expired' || c.status === 'revoked' || c.status === 'error') return 'attention';
    return 'pending';
  };

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

      {/* Per-location connections */}
      <div className="space-y-2">
        <h3 className="font-display text-base tracking-wide px-1">
          Connections by location
        </h3>
        <p className="text-xs text-muted-foreground px-1">
          Each location can connect its own Google Business Profile. Facebook live sync is coming soon.
        </p>

        {locations.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No active locations found.</CardContent></Card>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={locations.length === 1 ? [locations[0].id] : []}
            className="space-y-2"
          >
            {locations.map((loc) => {
              const link = linkByLocation(loc.id);
              const status = googleStatusForLocation(loc.id);
              return (
                <AccordionItem
                  key={loc.id}
                  value={loc.id}
                  className="border border-border rounded-xl bg-card/60 px-4 [&[data-state=open]]:bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{loc.name}</span>
                      {status === 'active' && (
                        <Badge variant="outline" className="gap-1 text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Google connected
                        </Badge>
                      )}
                      {status === 'attention' && (
                        <Badge variant="outline" className="gap-1 text-[11px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Reconnect needed
                        </Badge>
                      )}
                      {status === 'none' && (
                        <Badge variant="secondary" className="text-[11px]">Not connected</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <PlatformConnectorTile
                        platform="google"
                        label="Google"
                        Icon={GoogleGIcon}
                        iconBgClass="bg-background border border-border"
                        iconColorClass=""
                        reviewUrl={link?.google_review_url}
                        locationId={loc.id}
                      />
                      <PlatformConnectorTile
                        platform="facebook"
                        label="Facebook"
                        Icon={FacebookFIcon}
                        iconBgClass="bg-background border border-border"
                        iconColorClass=""
                        reviewUrl={link?.facebook_review_url}
                        locationId={loc.id}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Recent first-party feedback */}
      <div className="space-y-2">
        <h3 className={`${tokens.heading?.section ?? 'font-display text-base tracking-wide'} px-1`}>
          Recent client feedback
        </h3>
        <p className="text-xs text-muted-foreground px-1">
          Aggregated Google / Facebook reviews unlock once each location is connected.
          Until then, this is your first-party feedback stream.
        </p>
        <FeedbackResponseList organizationId={organizationId} limit={20} />
      </div>
    </div>
  );
}
