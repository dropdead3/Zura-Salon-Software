import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PreferredStylistInfo {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  is_active: boolean;
}

/**
 * Fetches display name and active status for a preferred stylist by user_id.
 * Returns null if no stylist is assigned.
 */
export function usePreferredStylist(stylistUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['preferred-stylist', stylistUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, is_active')
        .eq('user_id', stylistUserId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PreferredStylistInfo | null;
    },
    enabled: !!stylistUserId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Resolves a map of stylist user_ids to their display names + active status.
 * Useful for batch-resolving preferred stylists in a list view.
 */
export function usePreferredStylistsBatch(stylistUserIds: string[]) {
  const uniqueIds = [...new Set(stylistUserIds.filter(Boolean))];

  return useQuery({
    queryKey: ['preferred-stylists-batch', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<string, PreferredStylistInfo>();

      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, is_active')
        .in('user_id', uniqueIds);

      if (error) throw error;

      const map = new Map<string, PreferredStylistInfo>();
      (data || []).forEach(p => map.set(p.user_id, p as PreferredStylistInfo));
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

/** Helper to get a stylist's display label */
export function getStylistDisplayName(stylist: PreferredStylistInfo | null | undefined): string {
  if (!stylist) return 'None assigned';
  return formatDisplayName(stylist.full_name || '', stylist.display_name);
}
