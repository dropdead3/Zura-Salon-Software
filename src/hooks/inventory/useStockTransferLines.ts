/**
 * useStockTransferLines — CRUD for multi-product transfer lines.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StockTransferLine {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  created_at: string;
}

export function useStockTransferLines(transferId: string | null) {
  return useQuery({
    queryKey: ['stock-transfer-lines', transferId],
    queryFn: async (): Promise<StockTransferLine[]> => {
      const { data, error } = await supabase
        .from('stock_transfer_lines')
        .select('*')
        .eq('transfer_id', transferId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as StockTransferLine[];
    },
    enabled: !!transferId,
    staleTime: 30_000,
  });
}

export function useAddTransferLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transfer_id: string;
      product_id: string;
      quantity: number;
      unit?: string;
    }) => {
      const { data, error } = await supabase
        .from('stock_transfer_lines')
        .insert({
          transfer_id: params.transfer_id,
          product_id: params.product_id,
          quantity: params.quantity,
          unit: params.unit || 'units',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StockTransferLine;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer-lines', vars.transfer_id] });
    },
    onError: (error) => {
      toast.error('Failed to add transfer line: ' + error.message);
    },
  });
}

export function useDeleteTransferLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, transferId }: { id: string; transferId: string }) => {
      const { error } = await supabase
        .from('stock_transfer_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return transferId;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer-lines', vars.transferId] });
    },
    onError: (error) => {
      toast.error('Failed to remove transfer line: ' + error.message);
    },
  });
}
