import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
  const queryClient = useQueryClient();

  const query = useQuery({
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

  // Realtime subscription replaces polling
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('unread-announcement-count-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-announcement-count'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_reads', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-announcement-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}
