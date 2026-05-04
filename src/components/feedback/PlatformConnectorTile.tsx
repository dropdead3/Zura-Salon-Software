/**
 * PlatformConnectorTile — Per-platform card for Online Presence tab.
 * Phase 1: shows platform identity + manual review URL state (from
 * location_review_settings). OAuth "Connect" is Phase 2 — see Deferral
 * Register entry on the Reputation Per-Location Metering Scope memory.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import type { ComponentType } from 'react';

interface PlatformConnectorTileProps {
  platform: 'google' | 'facebook' | 'yelp';
  label: string;
  Icon: ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconColorClass: string;
  reviewUrl?: string | null;
  /** Aggregated stat (deferred — Phase 2 OAuth fills this). */
  averageRating?: number | null;
  totalReviews?: number | null;
  lastReviewLabel?: string | null;
}

export function PlatformConnectorTile({
  label,
  Icon,
  iconBgClass,
  iconColorClass,
  reviewUrl,
  averageRating,
  totalReviews,
  lastReviewLabel,
}: PlatformConnectorTileProps) {
  const hasUrl = !!reviewUrl?.trim();

  return (
    <Card className="h-full">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full">
        <div className={`w-14 h-14 rounded-2xl ${iconBgClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-7 h-7 ${iconColorClass}`} />
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-base tracking-wide">{label}</h3>
          {totalReviews != null && (
            <p className="text-xs text-muted-foreground">
              {totalReviews} reviews{averageRating != null && ` · ${averageRating.toFixed(1)} avg`}
            </p>
          )}
          {lastReviewLabel && (
            <p className="text-xs text-muted-foreground">Most recent: {lastReviewLabel}</p>
          )}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 w-full">
          {hasUrl ? (
            <>
              <Badge variant="outline" className="gap-1 text-xs">
                <LinkIcon className="h-3 w-3" /> Review URL set
              </Badge>
              <Button
                variant="outline"
                size={tokens.button.card}
                asChild
                className="gap-1.5 w-full"
              >
                <a href={reviewUrl!} target="_blank" rel="noopener noreferrer">
                  Open page <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="text-xs">Not connected</Badge>
              <p className="text-xs text-muted-foreground">
                Add a review URL in Settings → Review Links
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
