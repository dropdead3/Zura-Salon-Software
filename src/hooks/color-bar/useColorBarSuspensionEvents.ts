/**
 * useColorBarSuspensionEvents — Network Intelligence audit feed.
 *
 * Reads `color_bar_suspension_events` joined to organization names and
 * actor display names. RLS enforces visibility:
 *   - Platform users see all events
 *   - Org admins see only their own org's events
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SuspensionEventWindow = '7d' | '30d' | '90d' | 'all';

export interface SuspensionEventRow {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string | null;
  event_type: 'suspended' | 'reactivated';
  reason: string | null;
  notes: string | null;
  actor_user_id: string | null;
  actor_name: string;
  affected_location_count: number;
  created_at: string;
}

const WINDOW_DAYS: Record<SuspensionEventWindow, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

export function useColorBarSuspensionEvents(window: SuspensionEventWindow = '30d') {
  return useQuery({
    queryKey: ['color-bar-suspension-events', window],
    queryFn: async (): Promise<SuspensionEventRow[]> => {
      // Cast through `any` — the joined select shape outruns the generated types
      // and the embedded organizations join produces an excessively deep instantiation.
      let query: any = (supabase as any)
        .from('color_bar_suspension_events')
        .select(
          `
          id,
          organization_id,
          event_type,
          reason,
          notes,
          actor_user_id,
          affected_location_count,
          created_at,
          organizations!inner ( name, slug )
        `
        )
        .order('created_at', { ascending: false })
        .limit(500);

      const days = WINDOW_DAYS[window];
      if (days != null) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', cutoff);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as any[];

      // Resolve actor display names in a single batched lookup against employee_profiles.
      const actorIds = Array.from(
        new Set(rows.map((r) => r.actor_user_id).filter((id: any): id is string => !!id))
      );

      const actorMap = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('employee_profiles')
          .select('user_id, full_name, email')
          .in('user_id', actorIds);
        for (const p of (profiles ?? []) as any[]) {
          actorMap.set(p.user_id, p.full_name || p.email || 'Unknown');
        }
      }

      return rows.map((r) => ({
        id: r.id,
        organization_id: r.organization_id,
        organization_name: r.organizations?.name ?? 'Unknown organization',
        organization_slug: r.organizations?.slug ?? null,
        event_type: r.event_type,
        reason: r.reason,
        notes: r.notes,
        actor_user_id: r.actor_user_id,
        actor_name: r.actor_user_id ? actorMap.get(r.actor_user_id) ?? 'System' : 'System',
        affected_location_count: r.affected_location_count ?? 0,
        created_at: r.created_at,
      }));
    },
    staleTime: 60_000,
  });
}
