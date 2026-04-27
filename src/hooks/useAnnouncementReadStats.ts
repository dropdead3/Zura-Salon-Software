import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnnouncementReadStat {
  announcement_id: string;
  organization_id: string | null;
  location_id: string | null;
  audience_count: number;
  read_count: number;
  read_rate: number;
}

/**
 * Fetches read-receipt analytics for all announcements visible to the current admin.
 * Returned as a map keyed by announcement_id for O(1) lookup at render time.
 *
 * Audience denominator semantics (per `announcement_read_stats` view):
 * - location_id IS NULL  -> active employees in author's organization (org-wide)
 * - location_id IS SET   -> active employees assigned to that location
 *
 * Read count: distinct user_ids in announcement_reads.
 */
export function useAnnouncementReadStats(announcementIds: string[] | undefined) {
  return useQuery({
    queryKey: ['announcement-read-stats', announcementIds?.slice().sort()],
    queryFn: async () => {
      if (!announcementIds || announcementIds.length === 0) return {} as Record<string, AnnouncementReadStat>;

      const { data, error } = await supabase
        .from('announcement_read_stats' as any)
        .select('*')
        .in('announcement_id', announcementIds);

      if (error) throw error;

      const map: Record<string, AnnouncementReadStat> = {};
      ((data ?? []) as unknown as AnnouncementReadStat[]).forEach((row) => {
        map[row.announcement_id] = row;
      });
      return map;
    },
    enabled: !!announcementIds && announcementIds.length > 0,
    staleTime: 60_000,
  });
}
