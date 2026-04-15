import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  account_number: string | null;
  payment_terms: string | null;
  default_lead_time_days: number | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useVendors(activeOnly = true) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['vendors', orgId, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', orgId!)
        .order('name');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Vendor[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useVendor(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId!)
        .single();
      if (error) throw error;
      return data as unknown as Vendor;
    },
    enabled: !!vendorId,
  });
}

export function useUpsertVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendor: Partial<Vendor> & { organization_id: string; name: string }) => {
      if (vendor.id) {
        const { data, error } = await supabase
          .from('vendors')
          .update({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
            account_number: vendor.account_number,
            payment_terms: vendor.payment_terms,
            default_lead_time_days: vendor.default_lead_time_days,
            notes: vendor.notes,
            is_active: vendor.is_active ?? true,
          })
          .eq('id', vendor.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { data, error } = await supabase
          .from('vendors')
          .insert({
            organization_id: vendor.organization_id,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
            account_number: vendor.account_number,
            payment_terms: vendor.payment_terms,
            default_lead_time_days: vendor.default_lead_time_days,
            notes: vendor.notes,
            is_active: vendor.is_active ?? true,
            created_by: userId,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      toast.success('Vendor saved');
    },
    onError: (error) => {
      toast.error('Failed to save vendor: ' + error.message);
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete vendor: ' + error.message);
    },
  });
}
