import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface VendorProduct {
  id: string;
  vendor_id: string;
  product_id: string;
  organization_id: string;
  vendor_sku: string | null;
  unit_cost: number | null;
  moq: number;
  pack_size: number | null;
  lead_time_days: number | null;
  is_preferred: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useVendorProducts(vendorId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['vendor-products', orgId, vendorId],
    queryFn: async () => {
      let query = supabase
        .from('vendor_products')
        .select('*')
        .eq('organization_id', orgId!);
      if (vendorId) query = query.eq('vendor_id', vendorId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as VendorProduct[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePreferredVendor(productId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['preferred-vendor', productId, orgId],
    queryFn: async () => {
      // Preferred first, then cheapest fallback
      const { data, error } = await supabase
        .from('vendor_products')
        .select('*, vendors!inner(name, email, phone)')
        .eq('product_id', productId!)
        .eq('organization_id', orgId!)
        .order('is_preferred', { ascending: false })
        .order('unit_cost', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (VendorProduct & { vendors: { name: string; email: string | null; phone: string | null } }) | null;
    },
    enabled: !!productId && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpsertVendorProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vp: Partial<VendorProduct> & { vendor_id: string; product_id: string; organization_id: string }) => {
      if (vp.id) {
        const { data, error } = await supabase
          .from('vendor_products')
          .update({
            vendor_sku: vp.vendor_sku,
            unit_cost: vp.unit_cost,
            moq: vp.moq ?? 1,
            pack_size: vp.pack_size ?? 1,
            lead_time_days: vp.lead_time_days,
            is_preferred: vp.is_preferred ?? false,
            notes: vp.notes,
          })
          .eq('id', vp.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('vendor_products')
          .insert({
            vendor_id: vp.vendor_id,
            product_id: vp.product_id,
            organization_id: vp.organization_id,
            vendor_sku: vp.vendor_sku,
            unit_cost: vp.unit_cost,
            moq: vp.moq ?? 1,
            pack_size: vp.pack_size ?? 1,
            lead_time_days: vp.lead_time_days,
            is_preferred: vp.is_preferred ?? false,
            notes: vp.notes,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['preferred-vendor'] });
      toast.success('Vendor product saved');
    },
    onError: (error) => {
      toast.error('Failed to save vendor product: ' + error.message);
    },
  });
}

export function useDeleteVendorProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendor_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['preferred-vendor'] });
      toast.success('Vendor product removed');
    },
    onError: (error) => {
      toast.error('Failed to remove vendor product: ' + error.message);
    },
  });
}
