import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Upcoming Events — operator-curated 14-day window.
 *
 * Owner-facing operator primitive. Pulls from `org_calendar_events` (created
 * by org admins/managers via RLS). Honors visibility contract: returns []
 * when no events fall in the window — section suppresses itself.
 *
 * Capped at 8 events to honor alert-fatigue doctrine on busy weeks.
 */

export type CalendarEventKind =
  | 'training'
  | 'vendor'
  | 'milestone'
  | 'off_site'
  | 'holiday'
  | 'other';

export interface UpcomingEvent {
  id: string;
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  startAt: string;
  endAt: string | null;
  url: string | null;
  locationId: string | null;
}

const MAX_EVENTS = 8;
const WINDOW_DAYS = 14;

export function useUpcomingEvents(args: {
  enabled: boolean;
  locationId?: string;
  accessibleLocationIds?: string[];
}) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { enabled, locationId, accessibleLocationIds } = args;

  return useQuery({
    queryKey: ['upcoming-events', orgId, locationId, accessibleLocationIds?.join(',')],
    queryFn: async (): Promise<UpcomingEvent[]> => {
      if (!orgId) return [];

      const now = new Date();
      const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 86400000);

      let query = supabase
        .from('org_calendar_events')
        .select('id, title, description, kind, start_at, end_at, url, location_id')
        .eq('organization_id', orgId)
        .gte('start_at', now.toISOString())
        .lte('start_at', windowEnd.toISOString())
        .order('start_at', { ascending: true })
        .limit(MAX_EVENTS);

      // Location filter: include null-location (org-wide) events plus the
      // selected location, otherwise org-wide + accessible locations only.
      if (locationId) {
        query = query.or(`location_id.is.null,location_id.eq.${locationId}`);
      } else if (accessibleLocationIds && accessibleLocationIds.length > 0) {
        query = query.or(
          `location_id.is.null,location_id.in.(${accessibleLocationIds.join(',')})`,
        );
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        kind: r.kind as CalendarEventKind,
        startAt: r.start_at,
        endAt: r.end_at,
        url: r.url,
        locationId: r.location_id,
      }));
    },
    enabled: enabled && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
