import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  product_id: string;
  supplier_name: string | null;
  supplier_email: string | null;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  sent_at: string | null;
  expected_delivery_date: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePurchaseOrders(filters?: { status?: string; productId?: string }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['purchase-orders', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!orgId,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (po: {
      organization_id: string;
      product_id: string;
      supplier_name?: string;
      supplier_email?: string;
      quantity: number;
      unit_cost?: number;
      notes?: string;
      expected_delivery_date?: string;
      send_email?: boolean;
    }) => {
      const totalCost = po.unit_cost ? po.unit_cost * po.quantity : undefined;
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: po.organization_id,
          product_id: po.product_id,
          supplier_name: po.supplier_name,
          supplier_email: po.supplier_email,
          quantity: po.quantity,
          unit_cost: po.unit_cost,
          total_cost: totalCost,
          status: po.send_email ? 'draft' : 'draft',
          notes: po.notes,
          expected_delivery_date: po.expected_delivery_date,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // If send_email requested, call the edge function
      if (po.send_email && po.supplier_email) {
        const { error: sendErr } = await supabase.functions.invoke('send-reorder-email', {
          body: { purchase_order_id: data.id },
        });
        if (sendErr) {
          console.error('Failed to send reorder email:', sendErr);
          toast.error('Purchase order created but email failed to send');
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success(variables.send_email ? 'Purchase order sent to supplier' : 'Purchase order created as draft');
    },
    onError: (error) => {
      toast.error('Failed to create purchase order: ' + error.message);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PurchaseOrder> }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      toast.error('Failed to update purchase order: ' + error.message);
    },
  });
}

export function useMarkPurchaseOrderReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poId, productId, quantity }: { poId: string; productId: string; quantity: number }) => {
      // Update PO status
      const { error: poErr } = await supabase
        .from('purchase_orders')
        .update({ status: 'received', received_at: new Date().toISOString() })
        .eq('id', poId);
      if (poErr) throw poErr;

      // Update product stock
      const { data: product } = await supabase
        .from('products')
        .select('quantity_on_hand')
        .eq('id', productId)
        .single();

      const newQty = (product?.quantity_on_hand || 0) + quantity;
      const { error: prodErr } = await supabase
        .from('products')
        .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (prodErr) throw prodErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Order marked as received — stock updated');
    },
    onError: (error) => {
      toast.error('Failed to mark as received: ' + error.message);
    },
  });
}
