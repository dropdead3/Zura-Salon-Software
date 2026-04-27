import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Marks a list of announcements as read for the current user.
 *
 * Coverage doctrine (Phase 1.5): every surface that *displays* an announcement
 * to the user must mark it as read so the org's read-receipt analytics
 * (`announcement_read_stats`) accurately reflect actual reach. This hook is the
 * canonical writer — do not write to `announcement_reads` ad-hoc from other
 * components.
 *
 * Behavior:
 *  - No-ops when there is no user, no announcements, or the surface is hidden
 *    (`enabled = false`, e.g. a collapsed widget).
 *  - Dedupes against existing reads before inserting.
 *  - Invalidates unread caches + read-stats so badges/analytics react instantly.
 *  - Tracks the set of marked IDs in a ref to avoid hammering the DB on
 *    every re-render when the announcement list is stable.
 */
export function useMarkAnnouncementsRead(
  announcementIds: string[] | undefined,
  enabled: boolean = true,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (!user?.id) return;
    if (!announcementIds || announcementIds.length === 0) return;

    const candidates = announcementIds.filter(id => !markedRef.current.has(id));
    if (candidates.length === 0) return;

    let cancelled = false;

    (async () => {
      const { data: existingReads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', candidates);

      if (cancelled) return;

      const alreadyRead = new Set(existingReads?.map(r => r.announcement_id) || []);
      const unread = candidates.filter(id => !alreadyRead.has(id));

      // Optimistically remember so we don't re-query for these IDs this session.
      candidates.forEach(id => markedRef.current.add(id));

      if (unread.length === 0) return;

      const { error } = await supabase
        .from('announcement_reads')
        .insert(unread.map(id => ({ announcement_id: id, user_id: user.id })));

      if (!error && !cancelled) {
        queryClient.invalidateQueries({ queryKey: ['unread-announcement-count'] });
        queryClient.invalidateQueries({ queryKey: ['unread-announcements-count'] });
        queryClient.invalidateQueries({ queryKey: ['announcement-read-stats'] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [announcementIds?.join(','), user?.id, enabled, queryClient]);
}
