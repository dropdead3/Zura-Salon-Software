import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FraudWarning {
  id: string;
  stripe_charge_id: string;
  stripe_warning_id: string;
  fraud_type: string;
  actionable: boolean;
  resolved_at: string | null;
  resolved_action: string | null;
  created_at: string;
}

export function useFraudWarnings(orgId: string | undefined) {
  return useQuery({
    queryKey: ['fraud-warnings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_warnings')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as FraudWarning[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUnresolvedFraudWarningCount(orgId: string | undefined) {
  return useQuery({
    queryKey: ['fraud-warning-count', orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('fraud_warnings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .is('resolved_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });
}
