/**
 * PurchasingService — Owns purchase_orders, purchase_order_lines writes.
 *
 * Delegates inventory posting to InventoryLedgerService.
 * Does not directly write to stock_movements.
 */

import { supabase } from '@/integrations/supabase/client';
import { postReceiving } from './inventory-ledger-service';

export interface ReceivingLineInput {
  po_line_id: string;
  product_id: string;
  quantity_received: number;
  quantity_damaged?: number;
  quantity_rejected?: number;
  lot_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface ReceiveShipmentInput {
  organization_id: string;
  purchase_order_id: string;
  notes?: string;
  lines: ReceivingLineInput[];
}

/**
 * Receive a shipment against a purchase order.
 * Creates receiving_record + lines, updates PO status,
 * delegates inventory posting to InventoryLedgerService.
 */
export async function receiveShipment(input: ReceiveShipmentInput): Promise<{
  receivingRecordId: string;
  receivingStatus: string;
}> {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // 1. Create receiving record
  const { data: record, error: recErr } = await supabase
    .from('receiving_records')
    .insert({
      organization_id: input.organization_id,
      purchase_order_id: input.purchase_order_id,
      received_by: userId,
      notes: input.notes,
      status: 'complete',
    })
    .select('id')
    .single();

  if (recErr) throw recErr;

  // 2. Insert receiving_record_lines
  const { error: rlErr } = await supabase
    .from('receiving_record_lines')
    .insert(
      input.lines.map((line) => ({
        receiving_record_id: record.id,
        po_line_id: line.po_line_id,
        product_id: line.product_id,
        quantity_received: line.quantity_received,
        quantity_damaged: line.quantity_damaged ?? 0,
        quantity_rejected: line.quantity_rejected ?? 0,
        lot_number: line.lot_number || null,
        expiry_date: line.expiry_date || null,
        notes: line.notes || null,
      }))
    );

  if (rlErr) throw rlErr;

  // 3. For each line: update PO line, delegate inventory posting
  for (const line of input.lines) {
    const acceptedQty =
      line.quantity_received -
      (line.quantity_damaged ?? 0) -
      (line.quantity_rejected ?? 0);

    if (acceptedQty <= 0) continue;

    // Update PO line cumulative received
    const { data: poLine } = await supabase
      .from('purchase_order_lines')
      .select('quantity_received')
      .eq('id', line.po_line_id)
      .single();

    const newLineReceived = (poLine?.quantity_received ?? 0) + line.quantity_received;
    await supabase
      .from('purchase_order_lines')
      .update({ quantity_received: newLineReceived })
      .eq('id', line.po_line_id);

    // Delegate to InventoryLedgerService
    await postReceiving({
      organizationId: input.organization_id,
      productId: line.product_id,
      acceptedQty,
      purchaseOrderId: input.purchase_order_id,
      notes: `Received via PO ${input.purchase_order_id}`,
    });
  }

  // 4. Determine PO receiving status
  const { data: allLines } = await supabase
    .from('purchase_order_lines')
    .select('quantity_ordered, quantity_received')
    .eq('purchase_order_id', input.purchase_order_id);

  const allFullyReceived =
    allLines?.every((l) => l.quantity_received >= l.quantity_ordered) ?? false;
  const anyReceived = allLines?.some((l) => l.quantity_received > 0) ?? false;

  const receivingStatus = allFullyReceived
    ? 'complete'
    : anyReceived
      ? 'partial'
      : 'not_received';
  const poStatus = allFullyReceived ? 'received' : 'partially_received';

  await supabase
    .from('purchase_orders')
    .update({
      receiving_status: receivingStatus,
      status: poStatus,
      received_at: allFullyReceived ? new Date().toISOString() : null,
    } as any)
    .eq('id', input.purchase_order_id);

  return { receivingRecordId: record.id, receivingStatus };
}
