/**
 * PlatformConnectorTile — Per-platform card for Online Presence tab.
 *
 * State precedence:
 *   1. OAuth connection (`review_platform_connections`) — when active, shows
 *      cached review count / average rating + last synced timestamp.
 *   2. Manual review URL (`location_review_settings`) — fallback when no
 *      OAuth connection exists; shows "Open page" deep-link.
 *   3. Empty — guides operator to add a URL in Settings.
 *
 * "Connect" CTA is deferred (P2.1 / P2.2) — surfaced as a disabled tooltip
 * row so operators know it's coming. Doctrine: Visibility Contract — we
 * surface the *intent*, not silence, because this is operator-toggled space.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Link as LinkIcon, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useReviewPlatformConnections, ReviewPlatform } from '@/hooks/useReviewPlatformConnections';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useState, type ComponentType } from 'react';

interface PlatformConnectorTileProps {
  platform: ReviewPlatform;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  iconBgClass: string;
  iconColorClass: string;
  reviewUrl?: string | null;
}

export function PlatformConnectorTile({
  platform,
  label,
  Icon,
  iconBgClass,
  iconColorClass,
  reviewUrl,
}: PlatformConnectorTileProps) {
  const { data: connections } = useReviewPlatformConnections();
  const { effectiveOrganization } = useOrganizationContext();
  const connection = connections?.find((c) => c.platform === platform);
  const [connecting, setConnecting] = useState(false);

  const isActive = connection?.status === 'active';
  const isErrored = connection?.status === 'error' || connection?.status === 'expired' || connection?.status === 'revoked';
  const hasUrl = !!reviewUrl?.trim();
  const supportsOAuth = platform === 'google';

  const handleConnect = async () => {
    if (!effectiveOrganization?.id) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reputation-google-oauth-initiate', {
        body: {
          organization_id: effectiveOrganization.id,
          return_to: window.location.pathname + window.location.search,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No authorization URL returned');
      window.location.href = data.url;
    } catch (e) {
      console.error('Connect failed', e);
      toast.error('Could not start Google connection. Please try again.');
      setConnecting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full">
        <div className={`w-14 h-14 rounded-2xl ${iconBgClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-7 h-7 ${iconColorClass}`} />
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-base tracking-wide">{label}</h3>
          {isActive && connection?.cached_review_count != null && (
            <p className="text-xs text-muted-foreground">
              {connection.cached_review_count} reviews
              {connection.cached_average_rating != null && ` · ${connection.cached_average_rating.toFixed(1)} avg`}
            </p>
          )}
          {isActive && connection?.last_synced_at && (
            <p className="text-[11px] text-muted-foreground/70">
              Synced {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 w-full">
          {isActive && (
            <Badge variant="outline" className="gap-1 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </Badge>
          )}
          {isErrored && (
            <Badge variant="outline" className="gap-1 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" /> Reconnect needed
            </Badge>
          )}
          {!isActive && !isErrored && hasUrl && (
            <Badge variant="outline" className="gap-1 text-xs">
              <LinkIcon className="h-3 w-3" /> Review URL set
            </Badge>
          )}
          {!isActive && !isErrored && !hasUrl && (
            <Badge variant="secondary" className="text-xs">Not connected</Badge>
          )}

          {hasUrl && (
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
          )}

          {/* Connect CTA — Google uses live OAuth; Facebook deferred. */}
          {!isActive && supportsOAuth && (
            <>
              <Button
                variant="default"
                size={tokens.button.card}
                className="w-full gap-1.5"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting…</>
                ) : isErrored ? 'Reconnect Google' : 'Connect Google'}
              </Button>
              <p className="text-[11px] text-muted-foreground/80 leading-snug">
                You'll be asked to sign in with the Google account that manages your Business Profile.
              </p>
              <p className="text-[11px] text-muted-foreground/60 leading-snug">
                Tip: if you're signed into multiple Google accounts, use an incognito window to avoid picking the wrong one.
              </p>
            </>
          )}
          {!isActive && !supportsOAuth && (
            <Button
              variant="ghost"
              size={tokens.button.card}
              disabled
              className="w-full text-xs"
              title="Live sync is coming soon — for now, set the review URL in Settings."
            >
              Connect (coming soon)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
