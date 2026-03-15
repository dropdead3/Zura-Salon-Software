import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WholesalePriceSource {
  id: string;
  brand: string;
  source_type: string;
  api_endpoint: string | null;
  api_key_secret_name: string | null;
  scrape_frequency: string;
  is_active: boolean;
  auto_apply_threshold: number;
  max_auto_delta_pct: number;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWholesalePriceSources() {
  return useQuery({
    queryKey: ['wholesale-price-sources'],
    queryFn: async (): Promise<WholesalePriceSource[]> => {
      const { data, error } = await supabase
        .from('wholesale_price_sources')
        .select('*')
        .order('brand');

      if (error) throw error;
      return (data || []) as unknown as WholesalePriceSource[];
    },
  });
}

export function useCreatePriceSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      brand: string;
      source_type: string;
      api_endpoint?: string;
      api_key_secret_name?: string;
      scrape_frequency?: string;
    }) => {
      const { data, error } = await supabase
        .from('wholesale_price_sources')
        .insert(params as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-sources'] });
    },
  });
}

export function useUpdatePriceSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<Omit<WholesalePriceSource, 'id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('wholesale_price_sources')
        .update(params.updates as any)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-sources'] });
    },
  });
}

export function useDeletePriceSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wholesale_price_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale-price-sources'] });
    },
  });
}
