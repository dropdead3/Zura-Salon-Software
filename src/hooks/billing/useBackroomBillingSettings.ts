/**
 * useBackroomBillingSettings — Org-level billing configuration for product cost pass-through.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BackroomBillingSettings {
  id: string;
  organization_id: string;
  default_product_markup_pct: number;
  product_charge_taxable: boolean;
  product_charge_label: string;
  enable_supply_cost_recovery: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useBackroomBillingSettings(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['backroom-billing-settings', organizationId],
    queryFn: async (): Promise<BackroomBillingSettings | null> => {
      const { data, error } = await supabase
        .from('backroom_billing_settings' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as BackroomBillingSettings | null;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

export function useUpsertBackroomBillingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      default_product_markup_pct?: number;
      product_charge_taxable?: boolean;
      product_charge_label?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Check if exists
      const { data: existing } = await supabase
        .from('backroom_billing_settings' as any)
        .select('id')
        .eq('organization_id', params.organization_id)
        .maybeSingle();

      let data, error;
      if ((existing as any)?.id) {
        ({ data, error } = await supabase
          .from('backroom_billing_settings' as any)
          .update({
            ...(params.default_product_markup_pct !== undefined && {
              default_product_markup_pct: params.default_product_markup_pct,
            }),
            ...(params.product_charge_taxable !== undefined && {
              product_charge_taxable: params.product_charge_taxable,
            }),
            ...(params.product_charge_label !== undefined && {
              product_charge_label: params.product_charge_label,
            }),
            updated_by: userId,
          } as any)
          .eq('id', (existing as any).id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('backroom_billing_settings' as any)
          .insert({
            organization_id: params.organization_id,
            default_product_markup_pct: params.default_product_markup_pct ?? 0,
            product_charge_taxable: params.product_charge_taxable ?? true,
            product_charge_label: params.product_charge_label ?? 'Product Usage',
            updated_by: userId,
          } as any)
          .select()
          .single());
      }

      if (error) throw error;
      return data as unknown as BackroomBillingSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-billing-settings'] });
      toast.success('Billing settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save billing settings: ' + error.message);
    },
  });
}
