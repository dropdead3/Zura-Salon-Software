import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MixBowlLine {
  id: string;
  bowl_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  brand_snapshot: string | null;
  dispensed_quantity: number;
  dispensed_unit: string;
  dispensed_cost_snapshot: number;
  captured_via: string;
  sequence_order: number;
  created_at: string;
}

export function useMixBowlLines(bowlId: string | null) {
  return useQuery({
    queryKey: ['mix-bowl-lines', bowlId],
    queryFn: async (): Promise<MixBowlLine[]> => {
      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .select('*')
        .eq('bowl_id', bowlId!)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      return data as unknown as MixBowlLine[];
    },
    enabled: !!bowlId,
    staleTime: 30_000,
  });
}

export function useAddBowlLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bowl_id: string;
      product_id?: string;
      product_name_snapshot: string;
      brand_snapshot?: string;
      dispensed_quantity: number;
      dispensed_unit?: string;
      dispensed_cost_snapshot: number;
      captured_via?: string;
      sequence_order: number;
    }) => {
      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .insert({
          bowl_id: params.bowl_id,
          product_id: params.product_id || null,
          product_name_snapshot: params.product_name_snapshot,
          brand_snapshot: params.brand_snapshot || null,
          dispensed_quantity: params.dispensed_quantity,
          dispensed_unit: params.dispensed_unit || 'g',
          dispensed_cost_snapshot: params.dispensed_cost_snapshot,
          captured_via: params.captured_via || 'manual',
          sequence_order: params.sequence_order,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixBowlLine;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowl_id] });
    },
    onError: (error) => {
      toast.error('Failed to add product: ' + error.message);
    },
  });
}

export function useUpdateBowlLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bowlId, updates }: {
      id: string;
      bowlId: string;
      updates: Partial<Pick<MixBowlLine, 'dispensed_quantity' | 'dispensed_cost_snapshot'>>;
    }) => {
      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MixBowlLine;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowlId] });
    },
    onError: (error) => {
      toast.error('Failed to update line: ' + error.message);
    },
  });
}

export function useDeleteBowlLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bowlId }: { id: string; bowlId: string }) => {
      const { error } = await supabase
        .from('mix_bowl_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowlId] });
    },
    onError: (error) => {
      toast.error('Failed to remove product: ' + error.message);
    },
  });
}
