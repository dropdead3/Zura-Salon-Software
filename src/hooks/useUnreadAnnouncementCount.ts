import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';

/**
 * Returns only the unread announcement count (excludes notifications).
 * Used by the AnnouncementsDrawer badge.
 */
export function useUnreadAnnouncementCount() {
  const { user } = useAuth();
  const { assignedLocationIds, canViewAllLocations } = useUserLocationAccess();

  return useQuery({
    queryKey: ['unread-announcement-count', user?.id, assignedLocationIds, canViewAllLocations],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, location_id')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (announcementsError) throw announcementsError;

      let filtered = announcements || [];
      if (!canViewAllLocations && assignedLocationIds.length > 0) {
        filtered = filtered.filter(
          (a) => a.location_id === null || assignedLocationIds.includes(a.location_id)
        );
      }

      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);
      return filtered.filter(a => !readIds.has(a.id)).length;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}
