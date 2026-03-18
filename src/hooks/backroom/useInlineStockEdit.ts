/**
 * useInlineStockEdit — Mutations for inline stock/min/max editing in the Stock tab.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { postLedgerEntry } from '@/lib/backroom/services/inventory-ledger-service';
import { toast } from 'sonner';

export function useInlineStockEdit() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
  };

  /** Adjust stock via ledger entry (triggers DB projection update) */
  const adjustStock = useMutation({
    mutationFn: async (params: {
      orgId: string;
      productId: string;
      currentQty: number;
      newQty: number;
      locationId?: string;
    }) => {
      const diff = params.newQty - params.currentQty;
      if (diff === 0) return;
      await postLedgerEntry({
        organization_id: params.orgId,
        product_id: params.productId,
        quantity_change: diff,
        quantity_after: params.newQty,
        event_type: 'count_adjustment' as any,
        reason: 'count_adjustment',
        notes: `Inline edit: ${params.currentQty} → ${params.newQty}`,
        reference_type: null,
        reference_id: null,
        location_id: params.locationId || null,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Stock updated');
    },
    onError: (err) => toast.error('Failed to update stock: ' + (err as Error).message),
  });

  /** Update min (reorder_level) or max (par_level) on products or location_product_settings */
  const updateMinMax = useMutation({
    mutationFn: async (params: {
      orgId: string;
      productId: string;
      field: 'reorder_level' | 'par_level';
      value: number | null;
      locationId?: string;
    }) => {
      if (params.locationId) {
        // Location-scoped: upsert location_product_settings
        const { error } = await supabase
          .from('location_product_settings')
          .upsert(
            {
              organization_id: params.orgId,
              location_id: params.locationId,
              product_id: params.productId,
              [params.field]: params.value,
              is_tracked: true,
            } as any,
            { onConflict: 'location_id,product_id' }
          );
        if (error) throw error;
      } else {
        // Org-wide: update products table directly
        const { error } = await supabase
          .from('products')
          .update({ [params.field]: params.value } as any)
          .eq('id', params.productId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['location-product-settings'] });
      toast.success('Level updated');
    },
    onError: (err) => toast.error('Failed to update level: ' + (err as Error).message),
  });

  return { adjustStock, updateMinMax };
}
