import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useReceiveShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReceiveShipmentInput) => {
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

      // 3. For each line: update PO line quantity_received, update product stock, log stock movement
      for (const line of input.lines) {
        const acceptedQty = line.quantity_received - (line.quantity_damaged ?? 0) - (line.quantity_rejected ?? 0);
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

        // Update product stock
        const { data: product } = await supabase
          .from('products')
          .select('quantity_on_hand')
          .eq('id', line.product_id)
          .single();

        const oldQty = product?.quantity_on_hand ?? 0;
        const newQty = oldQty + acceptedQty;

        await supabase
          .from('products')
          .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
          .eq('id', line.product_id);

        // Log stock movement
        await supabase.from('stock_movements').insert({
          organization_id: input.organization_id,
          product_id: line.product_id,
          quantity_change: acceptedQty,
          quantity_after: newQty,
          reason: 'receiving',
          reference_type: 'purchase_order',
          reference_id: input.purchase_order_id,
          notes: `Received via PO ${input.purchase_order_id}`,
          created_by: userId,
        });
      }

      // 4. Determine PO receiving status
      const { data: allLines } = await supabase
        .from('purchase_order_lines')
        .select('quantity_ordered, quantity_received')
        .eq('purchase_order_id', input.purchase_order_id);

      const allFullyReceived = allLines?.every((l) => l.quantity_received >= l.quantity_ordered) ?? false;
      const anyReceived = allLines?.some((l) => l.quantity_received > 0) ?? false;

      const receivingStatus = allFullyReceived ? 'complete' : anyReceived ? 'partial' : 'not_received';
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
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-lines'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-records'] });
      const msg = result.receivingStatus === 'complete'
        ? 'Shipment fully received — stock updated'
        : 'Partial shipment received — stock updated';
      toast.success(msg);
    },
    onError: (error) => {
      toast.error('Failed to receive shipment: ' + error.message);
    },
  });
}
