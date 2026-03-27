import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface AllowanceBucket {
  id: string;
  organization_id: string;
  policy_id: string;
  bucket_name: string;
  billing_label: string;
  included_quantity: number;
  included_unit: string;
  overage_rate: number;
  overage_rate_type: string;
  overage_cap: number | null;
  mapped_product_categories: string[];
  mapped_product_ids: string[];
  is_taxable: boolean;
  requires_manager_override: boolean;
  min_charge_threshold: number;
  rounding_rule: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useAllowanceBuckets(policyId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['allowance-buckets', orgId, policyId],
    queryFn: async (): Promise<AllowanceBucket[]> => {
      let query = supabase
        .from('allowance_buckets')
        .select('*')
        .eq('organization_id', orgId!)
        .order('display_order');

      if (policyId) {
        query = query.eq('policy_id', policyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AllowanceBucket[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertAllowanceBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bucket: Partial<AllowanceBucket> & { organization_id: string; policy_id: string; bucket_name: string }) => {
      const { id, created_at, updated_at, ...rest } = bucket as any;

      if (id) {
        const { data, error } = await supabase
          .from('allowance_buckets')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('allowance_buckets')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowance-buckets'] });
      toast.success('Bucket saved');
    },
    onError: (error) => {
      toast.error('Failed to save bucket: ' + error.message);
    },
  });
}

export function useDeleteAllowanceBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bucketId: string) => {
      const { error } = await supabase
        .from('allowance_buckets')
        .delete()
        .eq('id', bucketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowance-buckets'] });
      toast.success('Bucket removed');
    },
    onError: (error) => {
      toast.error('Failed to remove bucket: ' + error.message);
    },
  });
}
