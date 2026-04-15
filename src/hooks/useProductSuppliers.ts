import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ProductSupplier {
  id: string;
  product_id: string;
  organization_id: string;
  supplier_name: string;
  contact_name: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_website: string | null;
  reorder_method: string | null;
  reorder_notes: string | null;
  lead_time_days: number | null;
  account_number: string | null;
  moq: number;
  secondary_contact_name: string | null;
  secondary_contact_email: string | null;
  secondary_contact_phone: string | null;
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
      return data as unknown as ProductSupplier[];
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
      return data as unknown as ProductSupplier | null;
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
            contact_name: supplier.contact_name ?? null,
            supplier_email: supplier.supplier_email,
            supplier_phone: supplier.supplier_phone,
            supplier_website: supplier.supplier_website,
            reorder_method: supplier.reorder_method,
            reorder_notes: supplier.reorder_notes,
            lead_time_days: supplier.lead_time_days,
            account_number: supplier.account_number,
            moq: supplier.moq ?? 1,
            secondary_contact_name: supplier.secondary_contact_name ?? null,
            secondary_contact_email: supplier.secondary_contact_email ?? null,
            secondary_contact_phone: supplier.secondary_contact_phone ?? null,
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
            contact_name: supplier.contact_name ?? null,
            supplier_email: supplier.supplier_email,
            supplier_phone: supplier.supplier_phone,
            supplier_website: supplier.supplier_website,
            reorder_method: supplier.reorder_method,
            reorder_notes: supplier.reorder_notes,
            lead_time_days: supplier.lead_time_days,
            account_number: supplier.account_number,
            moq: supplier.moq ?? 1,
            secondary_contact_name: supplier.secondary_contact_name ?? null,
            secondary_contact_email: supplier.secondary_contact_email ?? null,
            secondary_contact_phone: supplier.secondary_contact_phone ?? null,
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

export function useBatchUpsertSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      product_ids: string[];
      organization_id: string;
      supplier_name: string;
      contact_name?: string | null;
      supplier_email?: string | null;
      supplier_phone?: string | null;
      supplier_website?: string | null;
      account_number?: string | null;
      lead_time_days?: number | null;
      moq?: number;
      secondary_contact_name?: string | null;
      secondary_contact_email?: string | null;
      secondary_contact_phone?: string | null;
    }) => {
      const rows = input.product_ids.map((pid) => ({
        product_id: pid,
        organization_id: input.organization_id,
        supplier_name: input.supplier_name,
        contact_name: input.contact_name || null,
        supplier_email: input.supplier_email || null,
        supplier_phone: input.supplier_phone || null,
        supplier_website: input.supplier_website || null,
        account_number: input.account_number || null,
        lead_time_days: input.lead_time_days ?? null,
        moq: input.moq ?? 1,
        secondary_contact_name: input.secondary_contact_name || null,
        secondary_contact_email: input.secondary_contact_email || null,
        secondary_contact_phone: input.secondary_contact_phone || null,
      }));

      const { error } = await supabase
        .from('product_suppliers')
        .upsert(rows, { onConflict: 'product_id,organization_id', ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['product-supplier'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      toast.success('Supplier saved for all products in brand');
    },
    onError: (error) => {
      toast.error('Failed to save supplier: ' + error.message);
    },
  });
}
