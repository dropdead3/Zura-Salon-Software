import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface PricingDisplayRule {
  id: string;
  organization_id: string;
  service_id: string;
  display_mode: string;
  label_override: string | null;
  show_to_staff: boolean;
  show_to_client: boolean;
  auto_insert_on_checkout: boolean;
  allow_waive: boolean;
  allow_edit: boolean;
  apply_tax: boolean;
  created_at: string;
  updated_at: string;
}

export function usePricingDisplayRules(serviceId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['pricing-display-rules', orgId, serviceId],
    queryFn: async (): Promise<PricingDisplayRule[]> => {
      let query = supabase
        .from('backroom_pricing_display_rules')
        .select('*')
        .eq('organization_id', orgId!);

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PricingDisplayRule[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertPricingDisplayRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Partial<PricingDisplayRule> & { organization_id: string; service_id: string }) => {
      const { id, created_at, updated_at, ...rest } = rule as any;

      if (id) {
        const { data, error } = await supabase
          .from('backroom_pricing_display_rules')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('backroom_pricing_display_rules')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-display-rules'] });
      toast.success('Display rule saved');
    },
    onError: (error) => {
      toast.error('Failed to save display rule: ' + error.message);
    },
  });
}
