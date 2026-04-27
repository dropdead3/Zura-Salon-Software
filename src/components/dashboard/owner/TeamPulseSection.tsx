import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';
import { useTeamPulse } from '@/hooks/useTeamPulse';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface TeamPulseSectionProps {
  locationId?: string;
  accessibleLocationIds?: string[];
}

/**
 * TeamPulseSection — Owner-only operator primitive.
 *
 * Surfaces deterministic recognition + intervention triggers from the trailing
 * 4-week revenue baseline. Honors the visibility contract: returns null when
 * no pulses cross materiality thresholds (silence is valid output).
 */
export function TeamPulseSection({ locationId, accessibleLocationIds }: TeamPulseSectionProps) {
  const { dashPath } = useOrgDashboardPath();
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();
  const { data: pulses = [], isLoading } = useTeamPulse({
    enabled: isPrimaryOwner,
    locationId,
    accessibleLocationIds,
  });

  if (!isPrimaryOwner) return null;

  if (!isLoading && pulses.length === 0) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        '[visibility-contract] suppressed section="team_pulse" reason="no-material-pulses"',
      );
    }
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">
                Team Pulse
              </CardTitle>
              <CardDescription className="font-sans text-xs">
                Recognition and intervention triggers vs. trailing 4 weeks
              </CardDescription>
            </div>
          </div>
          {!isLoading && pulses.length > 0 && (
            <Badge variant="secondary" className="font-display tracking-wide">
              {pulses.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </>
        ) : (
          pulses.map((p) => {
            const Icon = p.kind === 'recognition' ? Sparkles : AlertTriangle;
            const iconColor =
              p.kind === 'recognition' ? 'text-primary' : 'text-destructive';
            const href = p.staffUserId
              ? dashPath(`/admin/team-hub?staff=${p.staffUserId}`)
              : dashPath('/admin/team-hub');
            return (
              <Link
                key={p.id}
                to={href}
                className="w-full flex items-center justify-between gap-3 py-3 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
                  <div className="min-w-0 text-left">
                    <p className="font-sans text-sm text-foreground truncate">
                      {p.headline}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground truncate">
                      {p.detail}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
