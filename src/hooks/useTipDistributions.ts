import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface TipDistribution {
  id: string;
  organization_id: string;
  location_id: string | null;
  stylist_user_id: string;
  distribution_date: string;
  total_tips: number;
  cash_tips: number;
  card_tips: number;
  method: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  stylist_name?: string;
}

export function useTipDistributions(date: string, locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['tip-distributions', orgId, date, locationId],
    queryFn: async (): Promise<TipDistribution[]> => {
      let q = supabase
        .from('tip_distributions')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('distribution_date', date)
        .order('total_tips', { ascending: false });

      if (locationId) {
        q = q.eq('location_id', locationId);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Enrich with stylist names
      const userIds = [...new Set((data || []).map(d => d.stylist_user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', userIds);

        const nameMap = new Map(
          (profiles || []).map(p => [p.user_id, p.display_name || p.full_name || 'Unknown'])
        );

        return (data || []).map(d => ({
          ...d,
          stylist_name: nameMap.get(d.stylist_user_id) || 'Unknown',
        })) as TipDistribution[];
      }

      return (data || []) as TipDistribution[];
    },
    enabled: !!orgId && !!date,
  });
}

export function useMyTipDistributions(dateFrom: string, dateTo: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['my-tip-distributions', orgId, dateFrom, dateTo],
    queryFn: async (): Promise<TipDistribution[]> => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tip_distributions')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('stylist_user_id', userId)
        .gte('distribution_date', dateFrom)
        .lte('distribution_date', dateTo)
        .order('distribution_date', { ascending: false });

      if (error) throw error;
      return (data || []) as TipDistribution[];
    },
    enabled: !!orgId,
  });
}

export function useGenerateTipDistributions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      distribution_date: string;
      location_id?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-tip-distributions', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tip-distributions'] });
      toast.success(`Tip distributions generated: ${data.total_stylists} stylist(s)`);
    },
    onError: (error) => {
      toast.error('Failed to generate distributions: ' + error.message);
    },
  });
}

export function useConfirmTipDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; method?: string; notes?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('tip_distributions')
        .update({
          status: 'confirmed',
          method: params.method || undefined,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
          notes: params.notes || undefined,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tip-distributions'] });
      toast.success('Tip distribution confirmed');
    },
    onError: (error) => {
      toast.error('Failed to confirm: ' + error.message);
    },
  });
}

export function useProcessTipPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { distribution_id: string; organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke('process-tip-payout', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tip-distributions'] });
      toast.success(`Tip payout of $${data.amount} processed successfully`);
    },
    onError: (error) => {
      toast.error('Payout failed: ' + error.message);
    },
  });
}

export function useBulkConfirmTipDistributions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { ids: string[]; method?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('tip_distributions')
        .update({
          status: 'confirmed',
          method: params.method || 'cash',
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        })
        .in('id', params.ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tip-distributions'] });
      toast.success('All tip distributions confirmed');
    },
    onError: (error) => {
      toast.error('Failed to confirm: ' + error.message);
    },
  });
}
