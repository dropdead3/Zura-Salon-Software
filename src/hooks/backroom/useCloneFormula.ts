/**
 * useCloneFormula — Clones a saved formula into an active bowl via batch addBowlLine calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';

interface CloneFormulaParams {
  bowlId: string;
  formulaLines: FormulaLine[];
}

export function useCloneFormula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bowlId, formulaLines }: CloneFormulaParams) => {
      // Get current max sequence order
      const { data: maxRow } = await supabase
        .from('mix_bowl_lines')
        .select('sequence_order')
        .eq('bowl_id', bowlId)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .single();

      let nextOrder = ((maxRow as any)?.sequence_order ?? 0) + 1;

      // Insert all lines in batch
      const inserts = formulaLines.map((line) => ({
        bowl_id: bowlId,
        product_id: line.product_id,
        product_name_snapshot: line.product_name,
        brand_snapshot: line.brand,
        dispensed_quantity: line.quantity,
        dispensed_unit: line.unit,
        dispensed_cost_snapshot: 0, // Will be updated if product exists
        captured_via: 'formula_clone',
        sequence_order: nextOrder++,
      }));

      // Look up current cost prices for products
      const productIds = formulaLines
        .map((l) => l.product_id)
        .filter((id): id is string => !!id);

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', productIds);

        const costMap = new Map((products ?? []).map((p: any) => [p.id, p.cost_price ?? 0]));

        for (const insert of inserts) {
          if (insert.product_id && costMap.has(insert.product_id)) {
            insert.dispensed_cost_snapshot = costMap.get(insert.product_id)!;
          }
        }
      }

      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .insert(inserts as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-bowl-lines', vars.bowlId] });
      queryClient.invalidateQueries({ queryKey: ['mix-bowls'] });
      toast.success('Formula cloned into bowl');
    },
    onError: (error) => {
      toast.error('Failed to clone formula: ' + error.message);
    },
  });
}
