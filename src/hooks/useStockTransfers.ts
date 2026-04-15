import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { postTransfer } from '@/lib/color-bar/services/inventory-ledger-service';

export interface StockTransfer {
  id: string;
  organization_id: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useStockTransfers(filters?: { status?: string }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stock-transfers', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('stock_transfers')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockTransfer[];
    },
    enabled: !!orgId,
  });
}

/**
 * Sum pending outbound quantities per product at a given location.
 * Used to prevent over-transferring.
 */
export function usePendingOutboundQuantities(fromLocationId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['pending-outbound-quantities', orgId, fromLocationId],
    queryFn: async (): Promise<Record<string, number>> => {
      // Get pending/in_transit transfers from this location
      const { data: transfers, error } = await supabase
        .from('stock_transfers')
        .select('id, product_id, quantity')
        .eq('organization_id', orgId!)
        .eq('from_location_id', fromLocationId!)
        .in('status', ['pending', 'in_transit']);
      if (error) throw error;

      const transferIds = (transfers || []).map(t => t.id);
      const committed: Record<string, number> = {};

      if (transferIds.length > 0) {
        // Check for multi-product lines
        const { data: lines } = await supabase
          .from('stock_transfer_lines')
          .select('transfer_id, product_id, quantity')
          .in('transfer_id', transferIds);

        const transfersWithLines = new Set<string>();
        (lines || []).forEach((l: any) => {
          transfersWithLines.add(l.transfer_id);
          committed[l.product_id] = (committed[l.product_id] || 0) + l.quantity;
        });

        // Fallback: transfers without lines use parent row
        (transfers || []).forEach(t => {
          if (!transfersWithLines.has(t.id)) {
            committed[t.product_id] = (committed[t.product_id] || 0) + t.quantity;
          }
        });
      }

      return committed;
    },
    enabled: !!orgId && !!fromLocationId,
    staleTime: 30_000,
  });
}

export function useCreateStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: {
      organization_id: string;
      product_id: string;
      from_location_id: string;
      to_location_id: string;
      quantity: number;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('stock_transfers')
        .insert({
          ...transfer,
          status: 'pending',
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-outbound-quantities'] });
      toast.success('Stock transfer created');
    },
    onError: (error) => {
      toast.error('Failed to create transfer: ' + error.message);
    },
  });
}

export function useCancelStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-outbound-quantities'] });
      toast.success('Transfer cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel transfer: ' + error.message);
    },
  });
}

/**
 * Dispatch: move transfer from pending → in_transit.
 */
export function useDispatchTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'in_transit', approved_by: userId, updated_at: new Date().toISOString() })
        .eq('id', transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast.success('Transfer dispatched');
    },
    onError: (error) => {
      toast.error('Failed to dispatch transfer: ' + error.message);
    },
  });
}

/**
 * Complete with receive & verify — accepts per-line received quantities.
 */
export function useCompleteStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, productId, quantity, fromLocationId, toLocationId, organizationId, receivedLines }: {
      transferId: string;
      productId: string;
      quantity: number;
      fromLocationId: string;
      toLocationId: string;
      organizationId: string;
      receivedLines?: { lineId: string; productId: string; expectedQty: number; receivedQty: number; notes?: string }[];
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const now = new Date().toISOString();

      // Update transfer status
      const { error: tErr } = await supabase
        .from('stock_transfers')
        .update({ status: 'completed', approved_by: userId, updated_at: now })
        .eq('id', transferId);
      if (tErr) throw tErr;

      // If receivedLines provided (Receive & Verify flow)
      if (receivedLines && receivedLines.length > 0) {
        for (const rl of receivedLines) {
          // Update line with received data (cast through unknown for new columns)
          await (supabase
            .from('stock_transfer_lines')
            .update({
              received_quantity: rl.receivedQty,
              received_at: now,
              discrepancy_notes: rl.receivedQty !== rl.expectedQty
                ? (rl.notes || `Expected ${rl.expectedQty}, received ${rl.receivedQty}`)
                : null,
            } as any)
            .eq('id', rl.lineId));

          // Post ledger using RECEIVED quantities
          await postTransfer({
            organizationId,
            productId: rl.productId,
            quantity: rl.receivedQty,
            fromLocationId,
            toLocationId,
            transferId,
          });
        }
      } else {
        // Legacy flow: check for multi-product lines
        const { data: lines } = await supabase
          .from('stock_transfer_lines')
          .select('product_id, quantity')
          .eq('transfer_id', transferId);

        if (lines && lines.length > 0) {
          for (const line of lines) {
            await postTransfer({
              organizationId,
              productId: line.product_id,
              quantity: line.quantity,
              fromLocationId,
              toLocationId,
              transferId,
            });
          }
        } else {
          await postTransfer({
            organizationId,
            productId,
            quantity,
            fromLocationId,
            toLocationId,
            transferId,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-outbound-quantities'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock transfer completed');
    },
    onError: (error) => {
      toast.error('Failed to complete transfer: ' + error.message);
    },
  });
}
