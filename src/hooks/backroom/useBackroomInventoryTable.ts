/**
 * useBackroomInventoryTable — Joins backroom products with inventory_projections
 * to provide stock levels, status badges, and computed order quantities.
 * Factors in open PO quantities to prevent double-ordering.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export type StockStatus = 'in_stock' | 'replenish' | 'urgent_reorder' | 'out_of_stock' | 'not_stocked';

export interface BackroomInventoryRow {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category: string | null;
  container_size: string | null;
  quantity_on_hand: number;
  reorder_level: number | null;
  par_level: number | null;
  cost_per_gram: number | null;
  markup_pct: number | null;
  cost_price: number | null;
  order_qty: number;
  open_po_qty: number;
  effective_stock: number;
  recommended_order_qty: number;
  status: StockStatus;
  charge_per_gram: number | null;
  supplier_name: string | null;
  supplier_email: string | null;
}

export function getStockStatus(qty: number | null, reorderLevel: number | null, parLevel: number | null): StockStatus {
  const q = qty ?? 0;
  if (q <= 0) return 'out_of_stock';
  if (reorderLevel != null && q <= reorderLevel) return 'urgent_reorder';
  if (parLevel != null && q < parLevel) return 'replenish';
  if (parLevel != null && q >= parLevel) return 'in_stock';
  // No par/reorder set and has stock
  return q > 0 ? 'in_stock' : 'not_stocked';
}

export function computeChargePerGram(costPerGram: number | null, markupPct: number | null): number | null {
  if (costPerGram == null) return null;
  if (markupPct == null) return costPerGram;
  return costPerGram * (1 + markupPct / 100);
}

export const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: 'In Stock', className: 'bg-success/10 text-success border-success/20' },
  replenish: { label: 'Replenish', className: 'bg-warning/10 text-warning border-warning/20' },
  urgent_reorder: { label: 'Urgent Reorder', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  out_of_stock: { label: 'Out of Stock', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  not_stocked: { label: 'Not Stocked', className: 'bg-muted text-muted-foreground border-border/40' },
};

/**
 * Fetch open PO line quantities grouped by product_id.
 * Only considers POs in draft, sent, or partially_received status.
 */
async function fetchOpenPoQuantities(orgId: string): Promise<Map<string, number>> {
  const { data: openPOs } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('organization_id', orgId)
    .in('status', ['draft', 'sent', 'partially_received']);

  if (!openPOs || openPOs.length === 0) return new Map();

  const poIds = openPOs.map(po => po.id);
  const { data: lines } = await supabase
    .from('purchase_order_lines')
    .select('product_id, quantity_ordered, quantity_received')
    .in('purchase_order_id', poIds);

  const map = new Map<string, number>();
  for (const line of lines || []) {
    const remaining = Math.max(0, (line.quantity_ordered ?? 0) - (line.quantity_received ?? 0));
    map.set(line.product_id, (map.get(line.product_id) ?? 0) + remaining);
  }
  return map;
}

function computeReorderFields(qty: number, parLevel: number | null, reorderLevel: number | null, openPoQty: number) {
  const needsReorder = reorderLevel != null && qty <= reorderLevel;
  const target = parLevel ?? reorderLevel;
  const orderQty = target != null && (needsReorder || qty <= 0) ? Math.max(0, target - qty) : 0;
  const recommendedOrderQty = target != null ? Math.max(0, target - qty - openPoQty) : 0;
  return { orderQty, recommendedOrderQty };
}

export function useBackroomInventoryTable(options?: { enabled?: boolean; locationId?: string }) {
  const orgId = useBackroomOrgId();
  const locationId = options?.locationId;

  return useQuery({
    queryKey: ['backroom-inventory-table', orgId, locationId],
    queryFn: async (): Promise<BackroomInventoryRow[]> => {
      // Fetch supplier data and open PO quantities in parallel
      const [suppliersResult, openPoMap] = await Promise.all([
        supabase
          .from('product_suppliers')
          .select('product_id, supplier_name, supplier_email')
          .eq('organization_id', orgId!),
        fetchOpenPoQuantities(orgId!),
      ]);
      const supplierMap = new Map((suppliersResult.data || []).map((s: any) => [s.product_id, s]));

      function buildRow(p: any, parLevel: number | null, reorderLevel: number | null): BackroomInventoryRow {
        const qty = p.quantity_on_hand ?? 0;
        const status = getStockStatus(qty, reorderLevel, parLevel);
        const openPoQty = openPoMap.get(p.id) ?? 0;
        const { orderQty, recommendedOrderQty } = computeReorderFields(qty, parLevel, reorderLevel, openPoQty);
        const chargePerGram = computeChargePerGram(p.cost_per_gram, p.markup_pct);
        const sup = supplierMap.get(p.id);

        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          sku: p.sku,
          category: p.category,
          container_size: p.container_size,
          quantity_on_hand: qty,
          reorder_level: reorderLevel,
          par_level: parLevel,
          cost_per_gram: p.cost_per_gram,
          markup_pct: p.markup_pct,
          cost_price: p.cost_price,
          order_qty: orderQty,
          open_po_qty: openPoQty,
          recommended_order_qty: recommendedOrderQty,
          status,
          charge_per_gram: chargePerGram,
          supplier_name: sup?.supplier_name ?? null,
          supplier_email: sup?.supplier_email ?? null,
        };
      }

      // If a location is selected, join with location_product_settings for tracking
      if (locationId) {
        const { data: settings, error: settingsErr } = await supabase
          .from('location_product_settings')
          .select('product_id, par_level, reorder_level')
          .eq('organization_id', orgId!)
          .eq('location_id', locationId)
          .eq('is_tracked', true);
        if (settingsErr) throw settingsErr;
        if (!settings || settings.length === 0) return [];

        const productIds = settings.map((s: any) => s.product_id);
        const settingsMap = new Map(settings.map((s: any) => [s.product_id, s]));

        const { data, error } = await supabase
          .from('products')
          .select('id, name, brand, sku, category, container_size, quantity_on_hand, cost_per_gram, markup_pct, cost_price')
          .eq('organization_id', orgId!)
          .eq('is_active', true)
          .in('id', productIds)
          .order('name');
        if (error) throw error;

        return (data || []).map((p: any) => {
          const locSetting = settingsMap.get(p.id);
          return buildRow(p, locSetting?.par_level ?? null, locSetting?.reorder_level ?? null);
        });
      }

      // Fallback: org-wide (legacy behavior)
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, sku, category, container_size, quantity_on_hand, reorder_level, par_level, cost_per_gram, markup_pct, cost_price')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .eq('is_backroom_tracked', true)
        .order('name');

      if (error) throw error;

      return (data || []).map((p: any) => buildRow(p, p.par_level, p.reorder_level));
    },
    enabled: !!orgId && (options?.enabled !== false),
    staleTime: 30_000,
  });
}
