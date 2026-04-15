import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceDiscount {
  id: string;
  organization_id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to: string;
  applicable_service_ids: string[] | null;
  applicable_categories: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceDiscountInsert = {
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to?: string;
  applicable_service_ids?: string[];
  applicable_categories?: string[];
  is_active?: boolean;
};

export function useServiceDiscounts(organizationId?: string) {
  return useQuery({
    queryKey: ['service-discounts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_discounts')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ServiceDiscount[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateServiceDiscount(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ServiceDiscountInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('service_discounts')
        .insert({
          ...input,
          organization_id: organizationId!,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-discounts'] });
      toast.success('Discount created');
    },
    onError: (error) => {
      toast.error('Failed to create discount: ' + error.message);
    },
  });
}

export function useUpdateServiceDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceDiscountInsert> }) => {
      const { data, error } = await supabase
        .from('service_discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-discounts'] });
      toast.success('Discount updated');
    },
    onError: (error) => {
      toast.error('Failed to update discount: ' + error.message);
    },
  });
}

export function useDeleteServiceDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_discounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-discounts'] });
      toast.success('Discount deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete discount: ' + error.message);
    },
  });
}

export function useToggleServiceDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('service_discounts')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-discounts'] });
    },
    onError: (error) => {
      toast.error('Failed to update discount: ' + error.message);
    },
  });
}
