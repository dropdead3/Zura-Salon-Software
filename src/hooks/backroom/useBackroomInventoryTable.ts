/**
 * useBackroomInventoryTable — Joins backroom products with inventory_projections
 * to provide stock levels, status badges, and computed order quantities.
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

export function useBackroomInventoryTable(options?: { enabled?: boolean; locationId?: string }) {
  const orgId = useBackroomOrgId();
  const locationId = options?.locationId;

  return useQuery({
    queryKey: ['backroom-inventory-table', orgId, locationId],
    queryFn: async (): Promise<BackroomInventoryRow[]> => {
      // Fetch all supplier data for the org once
      const { data: suppliersData } = await supabase
        .from('product_suppliers')
        .select('product_id, supplier_name, supplier_email')
        .eq('organization_id', orgId!);
      const supplierMap = new Map((suppliersData || []).map((s: any) => [s.product_id, s]));

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
          const parLevel = locSetting?.par_level ?? null;
          const reorderLevel = locSetting?.reorder_level ?? null;
          const qty = p.quantity_on_hand ?? 0;
          const status = getStockStatus(qty, reorderLevel, parLevel);
          const orderQty = parLevel != null ? Math.max(0, parLevel - qty) : 0;
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
            status,
            charge_per_gram: chargePerGram,
            supplier_name: sup?.supplier_name ?? null,
            supplier_email: sup?.supplier_email ?? null,
          };
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

      return (data || []).map((p: any) => {
        const qty = p.quantity_on_hand ?? 0;
        const status = getStockStatus(qty, p.reorder_level, p.par_level);
        const orderQty = p.par_level != null ? Math.max(0, p.par_level - qty) : 0;
        const chargePerGram = computeChargePerGram(p.cost_per_gram, p.markup_pct);

        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          sku: p.sku,
          category: p.category,
          container_size: p.container_size,
          quantity_on_hand: qty,
          reorder_level: p.reorder_level,
          par_level: p.par_level,
          cost_per_gram: p.cost_per_gram,
          markup_pct: p.markup_pct,
          cost_price: p.cost_price,
          order_qty: orderQty,
          status,
          charge_per_gram: chargePerGram,
        };
      });
    },
    enabled: !!orgId && (options?.enabled !== false),
    staleTime: 30_000,
  });
}
