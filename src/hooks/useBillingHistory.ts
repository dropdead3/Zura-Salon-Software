import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type BillingChangeType = 
  | 'plan_upgrade' 
  | 'plan_downgrade' 
  | 'add_locations' 
  | 'add_users' 
  | 'pricing_change' 
  | 'promo_applied' 
  | 'contract_change';

export interface BillingChange {
  id: string;
  organization_id: string;
  change_type: BillingChangeType;
  previous_value: Json | null;
  new_value: Json | null;
  effective_date: string;
  proration_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BillingChangeInsert {
  organization_id: string;
  change_type: BillingChangeType;
  previous_value?: Json | null;
  new_value?: Json | null;
  effective_date?: string;
  proration_amount?: number;
  notes?: string | null;
}

export function useBillingHistory(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['billing-history', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('billing_changes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as BillingChange[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateBillingChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: BillingChangeInsert) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('billing_changes')
        .insert([{
          ...change,
          created_by: user.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BillingChange;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-history', data.organization_id] });
    },
    onError: (error) => {
      toast.error('Failed to log billing change', {
        description: error.message,
      });
    },
  });
}

export function getChangeTypeLabel(type: BillingChangeType): string {
  const labels: Record<BillingChangeType, string> = {
    plan_upgrade: 'Plan Upgrade',
    plan_downgrade: 'Plan Downgrade',
    add_locations: 'Added Locations',
    add_users: 'Added User Seats',
    pricing_change: 'Pricing Change',
    promo_applied: 'Promotion Applied',
    contract_change: 'Contract Change',
  };
  return labels[type];
}

export function getChangeTypeIcon(type: BillingChangeType): string {
  const icons: Record<BillingChangeType, string> = {
    plan_upgrade: '⬆️',
    plan_downgrade: '⬇️',
    add_locations: '📍',
    add_users: '👥',
    pricing_change: '💰',
    promo_applied: '🎁',
    contract_change: '📄',
  };
  return icons[type];
}
