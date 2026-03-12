import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ field, oldValue, newValue }: { field: 'brand' | 'category'; oldValue: string; newValue: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ [field]: newValue, updated_at: new Date().toISOString() })
        .eq(field, oldValue)
        .eq('is_active', true)
        .select('id');

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-category-summaries'] });
      toast.success(`Renamed ${variables.field} "${variables.oldValue}" to "${variables.newValue}" across ${data?.length || 0} products`);
    },
    onError: (error) => {
      toast.error('Failed to rename: ' + error.message);
    },
  });
}

export function useBulkUpdateProductTypeByCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, newType }: { category: string; newType: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ product_type: newType, updated_at: new Date().toISOString() })
        .eq('category', category)
        .eq('is_active', true)
        .select('id');

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-category-summaries'] });
      toast.success(`Updated ${data?.length || 0} products in "${variables.category}" to type "${variables.newType}"`);
    },
    onError: (error) => {
      toast.error('Failed to update type: ' + error.message);
    },
  });
}

export function useBulkToggleProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      queryClient.invalidateQueries({ queryKey: ['product-category-summaries'] });
      toast.success(`${variables.ids.length} product(s) ${variables.isActive ? 'activated' : 'deactivated'}`);
    },
    onError: (error) => {
      toast.error('Failed to update products: ' + error.message);
    },
  });
}
