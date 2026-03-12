/**
 * useStaffPinnedProducts — Per-user quick product buttons for fast mixing.
 * Fetch, pin, unpin, and reorder pinned products.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PinnedProduct {
  id: string;
  product_id: string;
  display_order: number;
  product_name: string;
  brand: string | null;
  cost_price: number | null;
}

export function useStaffPinnedProducts() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;
  const userId = user?.id;

  return useQuery({
    queryKey: ['staff-pinned-products', orgId, userId],
    queryFn: async (): Promise<PinnedProduct[]> => {
      const { data, error } = await supabase
        .from('staff_pinned_products')
        .select('id, product_id, display_order, products:product_id(name, brand, cost_price)')
        .eq('organization_id', orgId!)
        .eq('user_id', userId!)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        display_order: row.display_order,
        product_name: row.products?.name ?? 'Unknown',
        brand: row.products?.brand ?? null,
        cost_price: row.products?.cost_price ?? null,
      }));
    },
    enabled: !!orgId && !!userId,
    staleTime: 60_000,
  });
}

export function useTogglePinnedProduct() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ productId, isPinned }: { productId: string; isPinned: boolean }) => {
      if (isPinned) {
        // Unpin
        const { error } = await supabase
          .from('staff_pinned_products')
          .delete()
          .eq('user_id', userId!)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        // Pin — get next display_order
        const { data: maxRow } = await supabase
          .from('staff_pinned_products')
          .select('display_order')
          .eq('user_id', userId!)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        const nextOrder = ((maxRow as any)?.display_order ?? 0) + 1;

        const { error } = await supabase
          .from('staff_pinned_products')
          .insert({
            organization_id: orgId!,
            user_id: userId!,
            product_id: productId,
            display_order: nextOrder,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-pinned-products', orgId, userId] });
    },
    onError: (error) => {
      toast.error('Failed to update pinned products: ' + error.message);
    },
  });
}
