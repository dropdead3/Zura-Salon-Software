import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface PTOPolicy {
  id: string;
  organization_id: string;
  name: string;
  accrual_rate: number;
  accrual_period: string;
  max_balance: number | null;
  carry_over_limit: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeePTOBalance {
  id: string;
  organization_id: string;
  user_id: string;
  policy_id: string;
  current_balance: number;
  accrued_ytd: number;
  used_ytd: number;
  carried_over: number;
  last_accrual_date: string | null;
  created_at: string;
  updated_at: string;
}

export function usePTOPolicies() {
  const { effectiveOrganization: organization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const policies = useQuery({
    queryKey: ['pto-policies', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pto_policies')
        .select('*')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data as unknown as PTOPolicy[];
    },
    enabled: !!orgId,
  });

  const createPolicy = useMutation({
    mutationFn: async (policy: Partial<PTOPolicy>) => {
      const { data, error } = await supabase
        .from('pto_policies')
        .insert({ ...policy, organization_id: orgId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pto-policies'] });
      toast({ title: 'Policy created' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create policy', description: error.message, variant: 'destructive' });
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PTOPolicy> & { id: string }) => {
      const { data, error } = await supabase
        .from('pto_policies')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pto-policies'] });
      toast({ title: 'Policy updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update policy', description: error.message, variant: 'destructive' });
    },
  });

  return { policies, createPolicy, updatePolicy };
}

export function usePTOBalances() {
  const { effectiveOrganization: organization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const balances = useQuery({
    queryKey: ['pto-balances', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_pto_balances')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EmployeePTOBalance[];
    },
    enabled: !!orgId,
  });

  const upsertBalance = useMutation({
    mutationFn: async (balance: Partial<EmployeePTOBalance>) => {
      const { data, error } = await supabase
        .from('employee_pto_balances')
        .upsert({ ...balance, organization_id: orgId! } as any, { onConflict: 'user_id,policy_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pto-balances'] });
      toast({ title: 'Balance updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update balance', description: error.message, variant: 'destructive' });
    },
  });

  return { balances, upsertBalance };
}
