/**
 * fetchInventoryForLocation — Standalone fetch for backroom inventory data
 * for a single location. Mirrors useBackroomInventoryTable logic but callable
 * outside React hooks (e.g. for multi-location PDF exports).
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getStockStatus,
  computeChargePerGram,
  type BackroomInventoryRow,
  type StockState,
  type StockSeverity,
} from '@/hooks/backroom/useBackroomInventoryTable';

export async function fetchInventoryForLocation(
  orgId: string,
  locationId: string,
): Promise<BackroomInventoryRow[]> {
  // Fetch supplier data and open PO quantities
  const [suppliersResult, openPOs] = await Promise.all([
    supabase
      .from('product_suppliers')
      .select('product_id, supplier_name, supplier_email')
      .eq('organization_id', orgId),
    supabase
      .from('purchase_orders')
      .select('id, status')
      .eq('organization_id', orgId)
      .in('status', ['draft', 'sent', 'partially_received']),
  ]);

  const supplierMap = new Map((suppliersResult.data || []).map((s: any) => [s.product_id, s]));

  // Open PO quantities
  const qtyMap = new Map<string, number>();
  const statusMap = new Map<string, { draft: number; sent: number; partially_received: number }>();

  if (openPOs.data && openPOs.data.length > 0) {
    const poStatusMap = new Map<string, string>();
    const poIds = openPOs.data.map(po => {
      poStatusMap.set(po.id, po.status);
      return po.id;
    });

    const { data: lines } = await supabase
      .from('purchase_order_lines')
      .select('product_id, quantity_ordered, quantity_received, purchase_order_id')
      .in('purchase_order_id', poIds);

    for (const line of lines || []) {
      const remaining = Math.max(0, (line.quantity_ordered ?? 0) - (line.quantity_received ?? 0));
      qtyMap.set(line.product_id, (qtyMap.get(line.product_id) ?? 0) + remaining);
      const poStatus = poStatusMap.get(line.purchase_order_id) as 'draft' | 'sent' | 'partially_received';
      if (!statusMap.has(line.product_id)) {
        statusMap.set(line.product_id, { draft: 0, sent: 0, partially_received: 0 });
      }
      const counts = statusMap.get(line.product_id)!;
      counts[poStatus] = (counts[poStatus] ?? 0) + 1;
    }
  }

  // Fetch location-tracked products
  const { data: settings, error: settingsErr } = await supabase
    .from('location_product_settings')
    .select('product_id, par_level, reorder_level')
    .eq('organization_id', orgId)
    .eq('location_id', locationId)
    .eq('is_tracked', true);

  if (settingsErr) throw settingsErr;
  if (!settings || settings.length === 0) return [];

  const productIds = settings.map((s: any) => s.product_id);
  const settingsLookup = new Map(settings.map((s: any) => [s.product_id, s]));

  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, sku, category, container_size, quantity_on_hand, cost_per_gram, markup_pct, cost_price')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .in('id', productIds)
    .order('name');

  if (error) throw error;

  return (data || []).map((p: any) => {
    const locSetting = settingsLookup.get(p.id);
    const parLevel = locSetting?.par_level ?? null;
    const reorderLevel = locSetting?.reorder_level ?? null;
    const qty = p.quantity_on_hand ?? 0;
    const status = getStockStatus(qty, reorderLevel, parLevel);
    const openPoQty = qtyMap.get(p.id) ?? 0;
    const openPoStatusCounts = statusMap.get(p.id) ?? { draft: 0, sent: 0, partially_received: 0 };
    const target = parLevel ?? reorderLevel;
    const needsReorder = reorderLevel != null && qty <= reorderLevel;
    const orderQty = target != null && (needsReorder || qty <= 0) ? Math.max(0, target - qty) : 0;
    const recommendedOrderQty = target != null ? Math.max(0, target - qty - openPoQty) : (qty <= 0 ? 1 : 0);
    const effectiveStock = qty + openPoQty;
    const chargePerGram = computeChargePerGram(p.cost_per_gram, p.markup_pct);
    const sup = supplierMap.get(p.id);

    const stock_state: StockState = qty <= 0 ? 'out_of_stock' : 'in_stock';
    let severity: StockSeverity = 'healthy';
    if (qty <= 0 || (reorderLevel != null && qty <= reorderLevel)) severity = 'critical';
    else if (parLevel != null && qty < parLevel) severity = 'low';

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
      open_po_status_counts: openPoStatusCounts,
      effective_stock: effectiveStock,
      recommended_order_qty: recommendedOrderQty,
      status,
      stock_state,
      severity,
      charge_per_gram: chargePerGram,
      supplier_name: sup?.supplier_name ?? null,
      supplier_email: sup?.supplier_email ?? null,
    } satisfies BackroomInventoryRow;
  });
}
