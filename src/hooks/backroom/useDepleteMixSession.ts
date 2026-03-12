/**
 * useDepleteMixSession — On session completion, batch-insert stock_movements
 * for all bowl lines and update products.quantity_on_hand.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DepletionParams {
  sessionId: string;
  organizationId: string;
  locationId?: string;
}

export function useDepleteMixSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, organizationId, locationId }: DepletionParams) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // 1. Get all non-discarded bowls for this session
      const { data: bowls, error: bowlErr } = await supabase
        .from('mix_bowls')
        .select('id, status, net_usage_weight, total_dispensed_weight')
        .eq('mix_session_id', sessionId)
        .neq('status', 'discarded');

      if (bowlErr) throw bowlErr;
      if (!bowls?.length) return { movementsInserted: 0 };

      const bowlIds = bowls.map((b: any) => b.id);

      // 2. Get all lines across valid bowls
      const { data: lines, error: lineErr } = await supabase
        .from('mix_bowl_lines')
        .select('product_id, dispensed_quantity, dispensed_unit')
        .in('bowl_id', bowlIds);

      if (lineErr) throw lineErr;
      if (!lines?.length) return { movementsInserted: 0 };

      // 3. Aggregate by product_id
      const productUsage = new Map<string, number>();
      for (const line of lines as any[]) {
        if (!line.product_id) continue;
        const current = productUsage.get(line.product_id) ?? 0;
        productUsage.set(line.product_id, current + line.dispensed_quantity);
      }

      if (productUsage.size === 0) return { movementsInserted: 0 };

      // 4. For each product, get current qty, insert movement, update product
      const productIds = Array.from(productUsage.keys());
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, quantity_on_hand')
        .in('id', productIds);

      if (prodErr) throw prodErr;

      const productMap = new Map((products as any[]).map((p) => [p.id, p.quantity_on_hand ?? 0]));

      const movements: any[] = [];
      

      for (const [productId, usedQty] of productUsage) {
        const currentQty = productMap.get(productId) ?? 0;
        const newQty = Math.max(0, currentQty - usedQty);

        movements.push({
          organization_id: organizationId,
          product_id: productId,
          quantity_change: -usedQty,
          quantity_after: newQty,
          event_type: 'usage',
          reason: 'usage',
          reference_type: 'mix_session',
          reference_id: sessionId,
          location_id: locationId ?? null,
          notes: `Backroom mix session depletion`,
          created_by: userId,
        });
      }

      // 5. Batch insert movements — trigger handles projection + products.quantity_on_hand sync
      const { error: mvErr } = await supabase
        .from('stock_movements')
        .insert(movements);

      if (mvErr) throw mvErr;

      return { movementsInserted: movements.length };
    },
    onSuccess: (result) => {
      if (result.movementsInserted > 0) {
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
    onError: (error) => {
      console.error('Inventory depletion failed:', error);
      toast.error('Failed to deplete inventory — stock not updated');
    },
  });
}
