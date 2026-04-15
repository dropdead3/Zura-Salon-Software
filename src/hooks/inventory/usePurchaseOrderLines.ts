import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  product_id: string;
  vendor_product_id: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number | null;
  line_total: number | null;
  notes: string | null;
  created_at: string;
}

export function usePurchaseOrderLines(poId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order-lines', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_lines')
        .select('*')
        .eq('purchase_order_id', poId!)
        .order('created_at');
      if (error) throw error;
      return data as unknown as PurchaseOrderLine[];
    },
    enabled: !!poId,
  });
}

export interface CreateMultiLinePOInput {
  organization_id: string;
  vendor_id?: string;
  supplier_name?: string;
  supplier_email?: string;
  po_number?: string;
  notes?: string;
  expected_delivery_date?: string;
  lines: {
    product_id: string;
    vendor_product_id?: string;
    quantity_ordered: number;
    unit_cost?: number;
    notes?: string;
  }[];
}

export function useCreateMultiLinePO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMultiLinePOInput) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Calculate totals
      let subtotal = 0;
      const lineRows = input.lines.map((line) => {
        const lineTotal = line.unit_cost ? line.unit_cost * line.quantity_ordered : 0;
        subtotal += lineTotal;
        return { ...line, line_total: lineTotal || null };
      });

      // Create PO header
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: input.organization_id,
          vendor_id: input.vendor_id || null,
          supplier_name: input.supplier_name,
          supplier_email: input.supplier_email,
          po_number: input.po_number,
          notes: input.notes,
          expected_delivery_date: input.expected_delivery_date,
          status: 'draft',
          receiving_status: 'not_received',
          line_count: input.lines.length,
          subtotal,
          grand_total: subtotal,
          quantity: input.lines.reduce((s, l) => s + l.quantity_ordered, 0),
          created_by: userId,
        } as any)
        .select('id')
        .single();

      if (poErr) throw poErr;

      // Insert lines
      const { error: linesErr } = await supabase
        .from('purchase_order_lines')
        .insert(
          lineRows.map((line) => ({
            purchase_order_id: po.id,
            product_id: line.product_id,
            vendor_product_id: line.vendor_product_id || null,
            quantity_ordered: line.quantity_ordered,
            unit_cost: line.unit_cost || null,
            line_total: line.line_total,
          }))
        );

      if (linesErr) throw linesErr;

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-lines'] });
      toast.success('Purchase order created');
    },
    onError: (error) => {
      toast.error('Failed to create purchase order: ' + error.message);
    },
  });
}
