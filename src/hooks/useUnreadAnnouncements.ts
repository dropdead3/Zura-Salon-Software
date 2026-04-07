import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';

export function useUnreadAnnouncements() {
  const { user } = useAuth();
  const { assignedLocationIds, canViewAllLocations } = useUserLocationAccess();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-announcements-count', user?.id, assignedLocationIds, canViewAllLocations],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Build base query for active announcements
      let announcementsQuery = supabase
        .from('announcements')
        .select('id, location_id')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      const { data: announcements, error: announcementsError } = await announcementsQuery;

      if (announcementsError) throw announcementsError;

      // Filter announcements by location access (client-side for complex OR logic)
      let filteredAnnouncements = announcements || [];
      if (!canViewAllLocations && assignedLocationIds.length > 0) {
        filteredAnnouncements = filteredAnnouncements.filter(
          (a) => a.location_id === null || assignedLocationIds.includes(a.location_id)
        );
      }

      // Get read announcements for this user
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);
      const unreadAnnouncementCount = filteredAnnouncements.filter(a => !readIds.has(a.id)).length;

      // Get unread user notifications
      const { count: unreadNotificationCount, error: notifError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (notifError) throw notifError;

      return unreadAnnouncementCount + (unreadNotificationCount || 0);
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Realtime subscription replaces polling
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('unread-announcements-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_reads', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}
