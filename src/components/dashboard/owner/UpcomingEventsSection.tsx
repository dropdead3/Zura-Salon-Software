import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ExternalLink, GraduationCap, Truck, Trophy, MapPin, Palmtree, CalendarDays } from 'lucide-react';
import { useUpcomingEvents, type CalendarEventKind } from '@/hooks/useUpcomingEvents';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';

interface UpcomingEventsSectionProps {
  locationId?: string;
  accessibleLocationIds?: string[];
}

const KIND_ICON: Record<CalendarEventKind, typeof Calendar> = {
  training: GraduationCap,
  vendor: Truck,
  milestone: Trophy,
  off_site: MapPin,
  holiday: Palmtree,
  other: CalendarDays,
};

const KIND_LABEL: Record<CalendarEventKind, string> = {
  training: 'Training',
  vendor: 'Vendor',
  milestone: 'Milestone',
  off_site: 'Off-site',
  holiday: 'Holiday',
  other: 'Event',
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, now)) return `Today · ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${time}`;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * UpcomingEventsSection — Owner-only operator primitive.
 *
 * 14-day forward view of operator-curated events. Honors visibility contract:
 * returns null when no events fall in the window.
 */
export function UpcomingEventsSection({ locationId, accessibleLocationIds }: UpcomingEventsSectionProps) {
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();
  const { data: events = [], isLoading } = useUpcomingEvents({
    enabled: isPrimaryOwner,
    locationId,
    accessibleLocationIds,
  });

  if (!isPrimaryOwner) return null;

  if (!isLoading && events.length === 0) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        '[visibility-contract] suppressed section="upcoming_events" reason="no-events-in-window"',
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
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">
                Upcoming · Next 14 Days
              </CardTitle>
              <CardDescription className="font-sans text-xs">
                Training, vendor visits, milestones, and off-site days
              </CardDescription>
            </div>
          </div>
          {!isLoading && events.length > 0 && (
            <Badge variant="secondary" className="font-display tracking-wide">
              {events.length}
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
          events.map((e) => {
            const Icon = KIND_ICON[e.kind] ?? CalendarDays;
            const Wrapper: React.ElementType = e.url ? 'a' : 'div';
            const wrapperProps = e.url
              ? { href: e.url, target: '_blank', rel: 'noopener noreferrer' }
              : {};
            return (
              <Wrapper
                key={e.id}
                {...wrapperProps}
                className="w-full flex items-center justify-between gap-3 py-3 px-3 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 text-left">
                    <p className="font-sans text-sm text-foreground truncate">
                      {e.title}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground truncate">
                      <span className="font-display tracking-wide uppercase text-[10px] mr-2">
                        {KIND_LABEL[e.kind]}
                      </span>
                      {formatEventDate(e.startAt)}
                    </p>
                  </div>
                </div>
                {e.url && (
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </Wrapper>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
