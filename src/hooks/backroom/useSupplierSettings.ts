/**
 * useSupplierSettings — Supplier-centric aggregation of product_suppliers data.
 * Groups by supplier_name, computes unlinked products, provides link/unlink mutations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { toast } from 'sonner';

export interface SupplierGroup {
  supplier_name: string;
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_website: string | null;
  account_number: string | null;
  lead_time_days: number | null;
  moq: number;
  product_ids: string[];
  /** One representative row id for updates */
  rows: { id: string; product_id: string }[];
}

export interface UnlinkedProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
}

export function useSupplierGroups() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['supplier-groups', orgId],
    queryFn: async (): Promise<SupplierGroup[]> => {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select('id, product_id, supplier_name, supplier_email, supplier_phone, supplier_website, account_number, lead_time_days, moq')
        .eq('organization_id', orgId!)
        .order('supplier_name');

      if (error) throw error;

      const map = new Map<string, SupplierGroup>();
      for (const row of data || []) {
        const key = row.supplier_name;
        if (!map.has(key)) {
          map.set(key, {
            supplier_name: row.supplier_name,
            supplier_email: row.supplier_email,
            supplier_phone: row.supplier_phone,
            supplier_website: row.supplier_website,
            account_number: row.account_number,
            lead_time_days: row.lead_time_days,
            moq: row.moq,
            product_ids: [],
            rows: [],
          });
        }
        const group = map.get(key)!;
        group.product_ids.push(row.product_id);
        group.rows.push({ id: row.id, product_id: row.product_id });
      }
      return Array.from(map.values());
    },
    enabled: !!orgId,
  });
}

export function useUnlinkedProducts() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['unlinked-products', orgId],
    queryFn: async (): Promise<UnlinkedProduct[]> => {
      // Get all active products for the org
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, brand, category')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('brand')
        .order('name');

      if (pErr) throw pErr;

      // Get all product_ids that already have suppliers
      const { data: linked, error: lErr } = await supabase
        .from('product_suppliers')
        .select('product_id')
        .eq('organization_id', orgId!);

      if (lErr) throw lErr;

      const linkedSet = new Set((linked || []).map(r => r.product_id));
      return (products || []).filter(p => !linkedSet.has(p.id));
    },
    enabled: !!orgId,
  });
}

/** Batch-update contact info for all rows sharing a supplier_name */
export function useUpdateSupplierContact() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (params: {
      supplier_name: string;
      supplier_email?: string | null;
      supplier_phone?: string | null;
      supplier_website?: string | null;
      account_number?: string | null;
      lead_time_days?: number | null;
      moq?: number;
    }) => {
      const { error } = await supabase
        .from('product_suppliers')
        .update({
          supplier_email: params.supplier_email ?? null,
          supplier_phone: params.supplier_phone ?? null,
          supplier_website: params.supplier_website ?? null,
          account_number: params.account_number ?? null,
          lead_time_days: params.lead_time_days ?? null,
          moq: params.moq ?? 1,
        })
        .eq('organization_id', orgId!)
        .eq('supplier_name', params.supplier_name);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      toast.success('Supplier updated');
    },
    onError: (e) => toast.error('Failed to update supplier: ' + e.message),
  });
}

/** Link products to an existing or new supplier */
export function useLinkProducts() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (params: { supplier_name: string; product_ids: string[] }) => {
      const rows = params.product_ids.map(pid => ({
        product_id: pid,
        organization_id: orgId!,
        supplier_name: params.supplier_name,
      }));

      const { error } = await supabase
        .from('product_suppliers')
        .upsert(rows, { onConflict: 'product_id,organization_id', ignoreDuplicates: false });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      toast.success('Products linked to supplier');
    },
    onError: (e) => toast.error('Failed to link products: ' + e.message),
  });
}

/** Unlink a single product from its supplier */
export function useUnlinkProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase
        .from('product_suppliers')
        .delete()
        .eq('id', rowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      toast.success('Product unlinked from supplier');
    },
    onError: (e) => toast.error('Failed to unlink product: ' + e.message),
  });
}
