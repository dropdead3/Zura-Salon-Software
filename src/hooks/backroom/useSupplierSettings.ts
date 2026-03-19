/**
 * useSupplierSettings — Supplier-centric aggregation of product_suppliers data.
 * Groups by supplier_name, computes unlinked products, provides link/unlink/rename/delete mutations.
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
  reorder_method: string | null;
  reorder_method_other: string | null;
  reorder_notes: string | null;
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

export interface AllProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  current_supplier: string | null;
}

export interface SupplierStats {
  po_count: number;
  last_order_date: string | null;
  total_spend: number;
  total_units: number;
}

export function useSupplierGroups() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['supplier-groups', orgId],
    queryFn: async (): Promise<SupplierGroup[]> => {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select('id, product_id, supplier_name, supplier_email, supplier_phone, supplier_website, account_number, lead_time_days, moq, reorder_method, reorder_notes')
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
            reorder_method: row.reorder_method,
            reorder_notes: row.reorder_notes,
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
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, brand, category')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('brand')
        .order('name');

      if (pErr) throw pErr;

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

/** All products with their current supplier name (for reassignment dialog) */
export function useAllProductsWithSupplier() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['all-products-with-supplier', orgId],
    queryFn: async (): Promise<AllProduct[]> => {
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, brand, category')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('brand')
        .order('name');

      if (pErr) throw pErr;

      const { data: suppliers, error: sErr } = await supabase
        .from('product_suppliers')
        .select('product_id, supplier_name')
        .eq('organization_id', orgId!);

      if (sErr) throw sErr;

      const supplierMap = new Map<string, string>();
      for (const s of suppliers || []) {
        supplierMap.set(s.product_id, s.supplier_name);
      }

      return (products || []).map(p => ({
        ...p,
        current_supplier: supplierMap.get(p.id) || null,
      }));
    },
    enabled: !!orgId,
  });
}

/** Supplier stats from purchase_orders */
export function useSupplierStats(supplierName: string | null) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['supplier-stats', orgId, supplierName],
    queryFn: async (): Promise<SupplierStats> => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, created_at, grand_total, quantity')
        .eq('organization_id', orgId!)
        .eq('supplier_name', supplierName!);

      if (error) throw error;

      const rows = data || [];
      return {
        po_count: rows.length,
        last_order_date: rows.length > 0
          ? rows.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
          : null,
        total_spend: rows.reduce((sum, r) => sum + (r.grand_total || 0), 0),
        total_units: rows.reduce((sum, r) => sum + (r.quantity || 0), 0),
      };
    },
    enabled: !!orgId && !!supplierName,
  });
}

const SUPPLIER_INVALIDATION_KEYS = ['supplier-groups', 'unlinked-products', 'product-suppliers', 'all-products-with-supplier'];

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  for (const key of SUPPLIER_INVALIDATION_KEYS) {
    qc.invalidateQueries({ queryKey: [key] });
  }
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
      reorder_method?: string | null;
      reorder_method_other?: string | null;
      reorder_notes?: string | null;
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
          reorder_method: params.reorder_method ?? null,
          reorder_method_other: params.reorder_method === 'other' ? (params.reorder_method_other ?? null) : null,
          reorder_notes: params.reorder_notes ?? null,
        })
        .eq('organization_id', orgId!)
        .eq('supplier_name', params.supplier_name);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
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
      invalidateAll(queryClient);
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
      invalidateAll(queryClient);
      toast.success('Product unlinked from supplier');
    },
    onError: (e) => toast.error('Failed to unlink product: ' + e.message),
  });
}

/** Rename a supplier across all product_suppliers rows */
export function useRenameSupplier() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (params: { old_name: string; new_name: string }) => {
      const { error } = await supabase
        .from('product_suppliers')
        .update({ supplier_name: params.new_name })
        .eq('organization_id', orgId!)
        .eq('supplier_name', params.old_name);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      toast.success(`Supplier renamed to "${params.new_name}"`);
    },
    onError: (e) => toast.error('Failed to rename supplier: ' + e.message),
  });
}

export interface SupplierSpendSummary {
  inventoryValueAtCost: number;
  inventoryValueAtRetail: number;
  impliedMarginPct: number | null;
  productCount: number;
  missingCostCount: number;
}

/** Compute inventory value, retail value, and implied margin for a supplier's linked products */
export function useSupplierSpendSummary(supplierName: string | null) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['supplier-spend-summary', orgId, supplierName],
    queryFn: async (): Promise<SupplierSpendSummary> => {
      // Get product IDs linked to this supplier
      const { data: links, error: lErr } = await supabase
        .from('product_suppliers')
        .select('product_id')
        .eq('organization_id', orgId!)
        .eq('supplier_name', supplierName!);

      if (lErr) throw lErr;
      const productIds = (links || []).map(l => l.product_id);
      if (productIds.length === 0) {
        return { inventoryValueAtCost: 0, inventoryValueAtRetail: 0, impliedMarginPct: null, productCount: 0, missingCostCount: 0 };
      }

      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, cost_price, retail_price, quantity_on_hand')
        .eq('organization_id', orgId!)
        .in('id', productIds);

      if (pErr) throw pErr;

      let costTotal = 0;
      let retailTotal = 0;
      let missingCost = 0;

      for (const p of products || []) {
        const qty = p.quantity_on_hand ?? 0;
        if (p.cost_price != null) {
          costTotal += p.cost_price * qty;
        } else {
          missingCost++;
        }
        if (p.retail_price != null) {
          retailTotal += p.retail_price * qty;
        }
      }

      const margin = retailTotal > 0 ? ((retailTotal - costTotal) / retailTotal) * 100 : null;

      return {
        inventoryValueAtCost: costTotal,
        inventoryValueAtRetail: retailTotal,
        impliedMarginPct: margin,
        productCount: (products || []).length,
        missingCostCount: missingCost,
      };
    },
    enabled: !!orgId && !!supplierName,
  });
}

/** Delete all product_suppliers rows for a given supplier name */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (supplierName: string) => {
      const { error } = await supabase
        .from('product_suppliers')
        .delete()
        .eq('organization_id', orgId!)
        .eq('supplier_name', supplierName);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success('Supplier deleted');
    },
    onError: (e) => toast.error('Failed to delete supplier: ' + e.message),
  });
}
