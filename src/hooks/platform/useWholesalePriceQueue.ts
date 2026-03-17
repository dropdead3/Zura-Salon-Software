import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PriceQueueStatus = 'pending' | 'approved' | 'rejected' | 'auto_applied';

export interface WholesalePriceQueueItem {
  id: string;
  product_id: string | null;
  product_name: string;
  brand: string;
  sku: string | null;
  source_id: string | null;
  wholesale_price: number;
  recommended_retail: number | null;
  currency: string;
  fetched_at: string;
  status: PriceQueueStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  confidence_score: number;
  previous_price: number | null;
  price_delta_pct: number | null;
  notes: string | null;
  created_at: string;
}

export function useWholesalePriceQueue(filters?: {
  status?: PriceQueueStatus;
  brand?: string;
}) {
  return useQuery({
    queryKey: ['wholesale-price-queue', filters],
    queryFn: async (): Promise<WholesalePriceQueueItem[]> => {
      let query = supabase
        .from('wholesale_price_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.brand) query = query.eq('brand', filters.brand);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as WholesalePriceQueueItem[];
    },
  });
}

export function useApprovePriceUpdate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      queueItemId: string;
      productId: string | null;
      wholesalePrice: number;
    }) => {
      // Update the queue item status
      const { error: queueErr } = await supabase
        .from('wholesale_price_queue')
        .update({
          status: 'approved' as any,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.queueItemId);

      if (queueErr) throw queueErr;

      // If matched to a product, update the product's cost_price
      if (params.productId) {
        const { error: prodErr } = await supabase
          .from('products')
          .update({
            cost_price: params.wholesalePrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.productId);

        if (prodErr) throw prodErr;
      }

      // Also update matching supply library product (by brand + name)
      if (params.brand && params.productName) {
        await supabase
          .from('supply_library_products')
          .update({
            wholesale_price: params.wholesalePrice,
            price_source_id: params.sourceId || null,
            price_updated_at: new Date().toISOString(),
          } as any)
          .eq('brand', params.brand)
          .eq('name', params.productName);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-queue'] });
    },
  });
}

export function useRejectPriceUpdate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { queueItemId: string; notes?: string }) => {
      const { error } = await supabase
        .from('wholesale_price_queue')
        .update({
          status: 'rejected' as any,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notes: params.notes || null,
        })
        .eq('id', params.queueItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-queue'] });
    },
  });
}

export function useBatchApprovePriceUpdates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { queueItemId: string; productId: string | null; wholesalePrice: number }[]) => {
      for (const item of items) {
        await supabase
          .from('wholesale_price_queue')
          .update({
            status: 'approved' as any,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', item.queueItemId);

        if (item.productId) {
          await supabase
            .from('products')
            .update({ cost_price: item.wholesalePrice, updated_at: new Date().toISOString() })
            .eq('id', item.productId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-queue'] });
    },
  });
}

export function useTriggerPriceSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId?: string) => {
      const { data, error } = await supabase.functions.invoke('wholesale-price-sync', {
        body: sourceId ? { source_id: sourceId } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-queue'] });
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-sources'] });
    },
  });
}
