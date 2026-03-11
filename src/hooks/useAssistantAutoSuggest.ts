import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { useMemo } from 'react';
import { getDay } from 'date-fns';
import { useAssistantsAtLocation } from '@/hooks/useAssistantAvailability';
import { useAssistantConflictCheck } from '@/hooks/useAssistantConflictCheck';

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface SuggestedAssistant {
  user_id: string;
  name: string;
  photo_url: string | null;
  score: number;
  reasons: string[];
}

/**
 * Auto-suggest algorithm for assistant assignment.
 * Returns a ranked list of assistants based on:
 * 1. Scheduled at this location today (highest weight)
 * 2. Conflict-free (required filter)
 * 3. Historical acceptance rate (tiebreaker)
 * 4. Current-day workload balance (tiebreaker)
 */
export function useAssistantAutoSuggest(
  locationId: string | null,
  date: Date | null,
  startTime: string | null,
  endTime: string | null,
  requestingUserId: string | null,
) {
  const dateStr = date ? date.toISOString().slice(0, 10) : null;

  // Get assistants scheduled at this location today
  const availableAssistants = useAssistantsAtLocation(locationId || undefined, date || undefined);

  // Conflict check
  const conflictMap = useAssistantConflictCheck(
    dateStr, startTime, endTime, 'auto-suggest', !!dateStr && !!startTime && !!endTime,
  );

  // Historical stats: acceptance rate per assistant
  const { data: historyStats } = useQuery({
    queryKey: ['assistant-history-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistant_time_blocks')
        .select('assistant_user_id, status');

      if (error) throw error;

      // Group by assistant_user_id
      const stats = new Map<string, { total: number; confirmed: number }>();
      for (const row of data || []) {
        if (!row.assistant_user_id) continue;
        const existing = stats.get(row.assistant_user_id) || { total: 0, confirmed: 0 };
        existing.total++;
        if (row.status === 'confirmed') existing.confirmed++;
        stats.set(row.assistant_user_id, existing);
      }
      return stats;
    },
    staleTime: 60_000,
  });

  // Today's workload: count confirmed blocks per assistant today
  const { data: todayWorkload } = useQuery({
    queryKey: ['assistant-today-workload', dateStr],
    queryFn: async () => {
      if (!dateStr) return new Map<string, number>();
      const { data, error } = await supabase
        .from('assistant_time_blocks')
        .select('assistant_user_id')
        .eq('date', dateStr)
        .eq('status', 'confirmed');

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data || []) {
        if (!row.assistant_user_id) continue;
        counts.set(row.assistant_user_id, (counts.get(row.assistant_user_id) || 0) + 1);
      }
      return counts;
    },
    enabled: !!dateStr,
    staleTime: 30_000,
  });

  const suggestions = useMemo((): SuggestedAssistant[] => {
    if (!locationId || !date || !startTime || !endTime) return [];

    const availableSet = new Set(availableAssistants.map(a => a.user_id));

    // Start from available assistants (scheduled at location)
    const candidates = availableAssistants
      .filter(a => a.user_id !== requestingUserId) // Exclude self
      .map(a => {
        const reasons: string[] = [];
        let score = 0;

        // Weight 1: Scheduled at location (already filtered, so always true)
        score += 50;
        reasons.push('Scheduled today');

        // Filter: conflict-free
        const hasConflict = conflictMap.has(a.user_id);
        if (hasConflict) {
          return null; // Exclude conflicting assistants
        }
        score += 20;
        reasons.push('No conflicts');

        // Weight 3: Historical acceptance rate
        const history = historyStats?.get(a.user_id);
        if (history && history.total > 0) {
          const rate = history.confirmed / history.total;
          score += Math.round(rate * 15);
          if (rate >= 0.8) reasons.push(`${Math.round(rate * 100)}% acceptance`);
        } else {
          score += 7; // Neutral for no history
        }

        // Weight 4: Workload balance (fewer blocks = higher score)
        const blocksToday = todayWorkload?.get(a.user_id) || 0;
        score += Math.max(0, 10 - blocksToday * 3);
        if (blocksToday === 0) reasons.push('No blocks today');

        return {
          user_id: a.user_id,
          name: a.display_name || a.full_name,
          photo_url: a.photo_url,
          score,
          reasons,
        };
      })
      .filter((c): c is SuggestedAssistant => c !== null);

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  }, [availableAssistants, conflictMap, historyStats, todayWorkload, locationId, date, startTime, endTime, requestingUserId]);

  return suggestions;
}
