import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StylistCommissionOverride {
  id: string;
  organization_id: string;
  user_id: string;
  service_commission_rate: number | null;
  retail_commission_rate: number | null;
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useStylistCommissionOverrides(orgId: string | undefined) {
  return useQuery({
    queryKey: ['stylist-commission-overrides', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('stylist_commission_overrides')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as StylistCommissionOverride[];
    },
  });
}

export function useUpsertCommissionOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      organization_id: string;
      user_id: string;
      service_commission_rate?: number | null;
      retail_commission_rate?: number | null;
      reason: string;
      expires_at?: string | null;
    }) => {
      const { data: existing } = await supabase
        .from('stylist_commission_overrides')
        .select('id')
        .eq('organization_id', data.organization_id)
        .eq('user_id', data.user_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('stylist_commission_overrides')
          .update({
            service_commission_rate: data.service_commission_rate ?? null,
            retail_commission_rate: data.retail_commission_rate ?? null,
            reason: data.reason,
            expires_at: data.expires_at ?? null,
            is_active: true,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stylist_commission_overrides')
          .insert({
            organization_id: data.organization_id,
            user_id: data.user_id,
            service_commission_rate: data.service_commission_rate ?? null,
            retail_commission_rate: data.retail_commission_rate ?? null,
            reason: data.reason,
            expires_at: data.expires_at ?? null,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-commission-overrides'] });
      toast({ title: 'Commission override saved' });
    },
    onError: (error) => {
      console.error('Error saving override:', error);
      toast({ title: 'Error', description: 'Failed to save override.', variant: 'destructive' });
    },
  });
}

export function useDeleteCommissionOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stylist_commission_overrides')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-commission-overrides'] });
      toast({ title: 'Override removed' });
    },
    onError: (error) => {
      console.error('Error deleting override:', error);
      toast({ title: 'Error', description: 'Failed to remove override.', variant: 'destructive' });
    },
  });
}
