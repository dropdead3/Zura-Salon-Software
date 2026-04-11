import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useStylistSPI(userId?: string) {
  const { session } = useAuth();
  const targetUserId = userId ?? session?.user?.id;

  const spiQuery = useQuery({
    queryKey: ['stylist-spi', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_spi_scores')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('scored_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const orsQuery = useQuery({
    queryKey: ['stylist-ors', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_ors_scores')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const milestonesQuery = useQuery({
    queryKey: ['stylist-milestones', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_career_milestones')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('achieved_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const latestSPI = spiQuery.data?.[0] ?? null;
  const spiHistory = (spiQuery.data ?? []).map((s: any) => Number(s.spi_score));

  return {
    latestSPI,
    spiHistory,
    orsData: orsQuery.data,
    milestones: milestonesQuery.data ?? [],
    isLoading: spiQuery.isLoading || orsQuery.isLoading || milestonesQuery.isLoading,
  };
}
