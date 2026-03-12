import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ProductSupplier {
  id: string;
  product_id: string;
  organization_id: string;
  supplier_name: string;
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_website: string | null;
  reorder_method: string | null;
  reorder_notes: string | null;
  lead_time_days: number | null;
  account_number: string | null;
  avg_delivery_days: number | null;
  delivery_count: number;
  created_at: string;
  updated_at: string;
}

export function useProductSuppliers() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-suppliers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select('*')
        .eq('organization_id', orgId!)
        .order('supplier_name');
      if (error) throw error;
      return data as ProductSupplier[];
    },
    enabled: !!orgId,
  });
}

export function useProductSupplier(productId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-supplier', productId, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select('*')
        .eq('product_id', productId!)
        .eq('organization_id', orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProductSupplier | null;
    },
    enabled: !!productId && !!orgId,
  });
}

export function useUpsertSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplier: Partial<ProductSupplier> & { product_id: string; organization_id: string; supplier_name: string }) => {
      if (supplier.id) {
        const { data, error } = await supabase
          .from('product_suppliers')
          .update({
            supplier_name: supplier.supplier_name,
            supplier_email: supplier.supplier_email,
            supplier_phone: supplier.supplier_phone,
            supplier_website: supplier.supplier_website,
            reorder_method: supplier.reorder_method,
            reorder_notes: supplier.reorder_notes,
            lead_time_days: supplier.lead_time_days,
            account_number: supplier.account_number,
          })
          .eq('id', supplier.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('product_suppliers')
          .insert({
            product_id: supplier.product_id,
            organization_id: supplier.organization_id,
            supplier_name: supplier.supplier_name,
            supplier_email: supplier.supplier_email,
            supplier_phone: supplier.supplier_phone,
            supplier_website: supplier.supplier_website,
            reorder_method: supplier.reorder_method,
            reorder_notes: supplier.reorder_notes,
            lead_time_days: supplier.lead_time_days,
            account_number: supplier.account_number,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['product-supplier'] });
      toast.success('Supplier saved');
    },
    onError: (error) => {
      toast.error('Failed to save supplier: ' + error.message);
    },
  });
}
