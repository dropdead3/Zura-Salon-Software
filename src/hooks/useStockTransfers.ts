import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

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
      return data as StockTransfer[];
    },
    enabled: !!orgId,
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
      toast.success('Stock transfer created');
    },
    onError: (error) => {
      toast.error('Failed to create transfer: ' + error.message);
    },
  });
}

export function useCompleteStockTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transferId, productId, quantity, fromLocationId, toLocationId, organizationId }: {
      transferId: string;
      productId: string;
      quantity: number;
      fromLocationId: string;
      toLocationId: string;
      organizationId: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const now = new Date().toISOString();

      // Update transfer status
      const { error: tErr } = await supabase
        .from('stock_transfers')
        .update({ status: 'completed', approved_by: userId, updated_at: now })
        .eq('id', transferId);
      if (tErr) throw tErr;

      // Insert ledger entries — trigger handles projection + products.quantity_on_hand sync
      await supabase.from('stock_movements').insert([
        {
          organization_id: organizationId,
          product_id: productId,
          quantity_change: -quantity,
          quantity_after: 0,
          event_type: 'transfer_out',
          reason: 'transfer_out',
          reference_type: 'stock_transfer',
          reference_id: transferId,
          location_id: fromLocationId,
          notes: `Transfer to location ${toLocationId}`,
          created_by: userId,
        },
        {
          organization_id: organizationId,
          product_id: productId,
          quantity_change: quantity,
          quantity_after: 0,
          event_type: 'transfer_in',
          reason: 'transfer_in',
          reference_type: 'stock_transfer',
          reference_id: transferId,
          location_id: toLocationId,
          notes: `Transfer from location ${fromLocationId}`,
          created_by: userId,
        },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock transfer completed');
    },
    onError: (error) => {
      toast.error('Failed to complete transfer: ' + error.message);
    },
  });
}
