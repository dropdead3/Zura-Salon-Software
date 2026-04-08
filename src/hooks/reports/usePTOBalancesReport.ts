import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface PTOBalanceEntry {
  staffName: string;
  policyName: string;
  currentBalance: number;
  accruedYTD: number;
  usedYTD: number;
  carriedOver: number;
}

export function usePTOBalancesReport() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['pto-balances-report', orgId],
    queryFn: async (): Promise<PTOBalanceEntry[]> => {
      const { data: balances, error: bErr } = await supabase
        .from('employee_pto_balances')
        .select('user_id, policy_id, current_balance, accrued_ytd, used_ytd, carried_over')
        .eq('organization_id', orgId!);
      if (bErr) throw bErr;

      const { data: policies } = await supabase.from('pto_policies').select('id, name').eq('organization_id', orgId!);
      const { data: profiles } = await supabase.from('employee_profiles').select('user_id, full_name, display_name');

      const policyMap = new Map((policies || []).map(p => [p.id, p.name]));
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || p.full_name || 'Unknown']));

      return (balances || []).map(b => ({
        staffName: nameMap.get(b.user_id) || 'Unknown',
        policyName: policyMap.get(b.policy_id) || 'Default',
        currentBalance: Number(b.current_balance) || 0,
        accruedYTD: Number(b.accrued_ytd) || 0,
        usedYTD: Number(b.used_ytd) || 0,
        carriedOver: Number(b.carried_over) || 0,
      })).sort((a, b) => a.staffName.localeCompare(b.staffName));
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
