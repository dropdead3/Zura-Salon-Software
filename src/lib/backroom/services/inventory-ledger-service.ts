/**
 * InventoryLedgerService — Sole owner of stock_movements writes.
 *
 * All inventory mutations flow through this service.
 * The DB trigger on stock_movements handles:
 *   - inventory_projections upsert
 *   - products.quantity_on_hand sync
 *
 * Callers: useDepleteMixSession, useReceiveShipment, useStockTransfers,
 *          useStockMovements, PurchasingService
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────

export type LedgerEventType =
  | 'usage'
  | 'receiving'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'count'
  | 'waste'
  | 'return'
  | 'shrinkage';

export interface LedgerEntry {
  organization_id: string;
  product_id: string;
  quantity_change: number;
  quantity_after: number;
  event_type: LedgerEventType;
  reason: string;
  reference_type?: string | null;
  reference_id?: string | null;
  location_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

// ─── Private helpers ─────────────────────────────────

async function getCurrentUserId(): Promise<string | undefined> {
  return (await supabase.auth.getUser()).data.user?.id;
}

// ─── Core write operations ───────────────────────────

/**
 * Post a single ledger entry to stock_movements.
 * The DB trigger handles projection + products.quantity_on_hand sync.
 */
export async function postLedgerEntry(entry: LedgerEntry): Promise<void> {
  const userId = entry.created_by ?? (await getCurrentUserId());

  const { error } = await supabase
    .from('stock_movements')
    .insert({
      organization_id: entry.organization_id,
      product_id: entry.product_id,
      quantity_change: entry.quantity_change,
      quantity_after: entry.quantity_after,
      event_type: entry.event_type,
      reason: entry.reason,
      reference_type: entry.reference_type ?? null,
      reference_id: entry.reference_id ?? null,
      location_id: entry.location_id ?? null,
      notes: entry.notes ?? null,
      created_by: userId,
    });

  if (error) throw error;
}

/**
 * Post multiple ledger entries atomically.
 * Used for batch operations like session depletion or transfers.
 */
export async function postLedgerEntries(entries: LedgerEntry[]): Promise<void> {
  if (entries.length === 0) return;

  const userId = await getCurrentUserId();

  const rows = entries.map((e) => ({
    organization_id: e.organization_id,
    product_id: e.product_id,
    quantity_change: e.quantity_change,
    quantity_after: e.quantity_after,
    event_type: e.event_type,
    reason: e.reason,
    reference_type: e.reference_type ?? null,
    reference_id: e.reference_id ?? null,
    location_id: e.location_id ?? null,
    notes: e.notes ?? null,
    created_by: e.created_by ?? userId,
  }));

  const { error } = await supabase.from('stock_movements').insert(rows);
  if (error) throw error;
}

// ─── Domain-specific write helpers ───────────────────

/**
 * Post usage depletion from a completed mix session.
 * Aggregates bowl lines by product and posts negative ledger entries.
 */
export async function postUsageFromSession(params: {
  sessionId: string;
  organizationId: string;
  locationId?: string;
}): Promise<{ movementsInserted: number }> {
  const userId = await getCurrentUserId();

  // 1. Get all non-discarded bowls
  const { data: bowls, error: bowlErr } = await supabase
    .from('mix_bowls')
    .select('id, status, net_usage_weight, total_dispensed_weight')
    .eq('mix_session_id', params.sessionId)
    .neq('status', 'discarded');

  if (bowlErr) throw bowlErr;
  if (!bowls?.length) return { movementsInserted: 0 };

  const bowlIds = bowls.map((b: any) => b.id);

  // 2. Get all lines across valid bowls
  const { data: lines, error: lineErr } = await supabase
    .from('mix_bowl_lines')
    .select('product_id, dispensed_quantity, dispensed_unit')
    .in('bowl_id', bowlIds);

  if (lineErr) throw lineErr;
  if (!lines?.length) return { movementsInserted: 0 };

  // 3. Aggregate by product_id
  const productUsage = new Map<string, number>();
  for (const line of lines as any[]) {
    if (!line.product_id) continue;
    const current = productUsage.get(line.product_id) ?? 0;
    productUsage.set(line.product_id, current + line.dispensed_quantity);
  }

  if (productUsage.size === 0) return { movementsInserted: 0 };

  // 4. Get current quantities
  const productIds = Array.from(productUsage.keys());
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, quantity_on_hand')
    .in('id', productIds);

  if (prodErr) throw prodErr;

  const productMap = new Map(
    (products as any[]).map((p) => [p.id, p.quantity_on_hand ?? 0])
  );

  // 5. Build ledger entries
  const entries: LedgerEntry[] = [];
  for (const [productId, usedQty] of productUsage) {
    const currentQty = productMap.get(productId) ?? 0;
    const newQty = Math.max(0, currentQty - usedQty);

    entries.push({
      organization_id: params.organizationId,
      product_id: productId,
      quantity_change: -usedQty,
      quantity_after: newQty,
      event_type: 'usage',
      reason: 'usage',
      reference_type: 'mix_session',
      reference_id: params.sessionId,
      location_id: params.locationId ?? null,
      notes: 'Backroom mix session depletion',
      created_by: userId,
    });
  }

  await postLedgerEntries(entries);
  return { movementsInserted: entries.length };
}

/**
 * Post a transfer pair (out from source, in to destination).
 */
export async function postTransfer(params: {
  organizationId: string;
  productId: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  transferId: string;
}): Promise<void> {
  const userId = await getCurrentUserId();

  await postLedgerEntries([
    {
      organization_id: params.organizationId,
      product_id: params.productId,
      quantity_change: -params.quantity,
      quantity_after: 0, // trigger recalculates via projection
      event_type: 'transfer_out',
      reason: 'transfer_out',
      reference_type: 'stock_transfer',
      reference_id: params.transferId,
      location_id: params.fromLocationId,
      notes: `Transfer to location ${params.toLocationId}`,
      created_by: userId,
    },
    {
      organization_id: params.organizationId,
      product_id: params.productId,
      quantity_change: params.quantity,
      quantity_after: 0,
      event_type: 'transfer_in',
      reason: 'transfer_in',
      reference_type: 'stock_transfer',
      reference_id: params.transferId,
      location_id: params.toLocationId,
      notes: `Transfer from location ${params.fromLocationId}`,
      created_by: userId,
    },
  ]);
}

/**
 * Post a receiving entry for a purchase order line.
 */
export async function postReceiving(params: {
  organizationId: string;
  productId: string;
  acceptedQty: number;
  purchaseOrderId: string;
  notes?: string;
}): Promise<void> {
  const userId = await getCurrentUserId();

  await postLedgerEntry({
    organization_id: params.organizationId,
    product_id: params.productId,
    quantity_change: params.acceptedQty,
    quantity_after: 0, // trigger recalculates
    event_type: 'receiving',
    reason: 'receiving',
    reference_type: 'purchase_order',
    reference_id: params.purchaseOrderId,
    notes: params.notes ?? `Received via PO ${params.purchaseOrderId}`,
    created_by: userId,
  });
}
