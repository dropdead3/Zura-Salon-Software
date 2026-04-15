import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { postReceiving } from '@/lib/color-bar/services/inventory-ledger-service';

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
      return data as unknown as PurchaseOrder[];
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

/**
 * Mark PO as received: routes through InventoryLedgerService.postReceiving()
 * instead of writing directly to stock_movements.
 */
export function useMarkPurchaseOrderReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poId, productId, quantity, organizationId }: { poId: string; productId: string; quantity: number; organizationId: string }) => {
      const now = new Date().toISOString();

      // Get PO created_at for lead-time calculation
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('created_at, sent_at, supplier_name')
        .eq('id', poId)
        .single();

      // Update PO status (projection)
      const { error: poErr } = await supabase
        .from('purchase_orders')
        .update({ status: 'received', received_at: now })
        .eq('id', poId);
      if (poErr) throw poErr;

      // Route through InventoryLedgerService (source of truth)
      await postReceiving({
        organizationId,
        productId,
        acceptedQty: quantity,
        purchaseOrderId: poId,
        notes: `PO ${poId} received`,
      });

      // Update supplier avg_delivery_days for lead-time tracking
      if (poData) {
        const sentOrCreated = poData.sent_at || poData.created_at;
        const deliveryDays = Math.round(
          (new Date(now).getTime() - new Date(sentOrCreated).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (deliveryDays >= 0) {
          const { data: supplier } = await supabase
            .from('product_suppliers')
            .select('id, avg_delivery_days, delivery_count')
            .eq('product_id', productId)
            .eq('organization_id', organizationId)
            .maybeSingle();

          if (supplier) {
            const oldAvg = supplier.avg_delivery_days || deliveryDays;
            const oldCount = supplier.delivery_count || 0;
            const newCount = oldCount + 1;
            const newAvg = ((oldAvg * oldCount) + deliveryDays) / newCount;

            await supabase
              .from('product_suppliers')
              .update({
                avg_delivery_days: Math.round(newAvg * 10) / 10,
                delivery_count: newCount,
              })
              .eq('id', supplier.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['product-supplier'] });
      toast.success('Order marked as received — stock updated');
    },
    onError: (error) => {
      toast.error('Failed to mark as received: ' + error.message);
    },
  });
}
