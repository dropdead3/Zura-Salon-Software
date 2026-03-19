import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WasteCategory =
  | 'leftover_bowl_waste'
  | 'overmix_waste'
  | 'spill_waste'
  | 'expired_product_discard'
  | 'contamination_discard'
  | 'wrong_mix'
  | 'client_refusal';

export const WASTE_CATEGORY_LABELS: Record<WasteCategory, string> = {
  leftover_bowl_waste: 'Leftover Bowl Waste',
  overmix_waste: 'Overmix Waste',
  spill_waste: 'Spill',
  expired_product_discard: 'Expired Product',
  contamination_discard: 'Contamination',
};

export function useCreateWasteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mix_session_id: string;
      bowl_id?: string;
      waste_category: WasteCategory;
      quantity: number;
      unit?: string;
      product_id?: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('waste_events')
        .insert({
          mix_session_id: params.mix_session_id,
          bowl_id: params.bowl_id || null,
          waste_category: params.waste_category,
          quantity: params.quantity,
          unit: params.unit || 'g',
          product_id: params.product_id || null,
          notes: params.notes || null,
          recorded_by_staff_id: userId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-events'] });
      toast.success('Waste recorded');
    },
    onError: (error) => {
      toast.error('Failed to record waste: ' + error.message);
    },
  });
}
