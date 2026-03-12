import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!effectiveOrganization?.id) throw new Error('No organization');
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ organization_id: effectiveOrganization.id, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-category-summaries'] });
      toast.success(`Category "${name}" created`);
    },
    onError: (error) => {
      if (error.message?.includes('duplicate key')) {
        toast.error('A category with that name already exists');
      } else {
        toast.error('Failed to create category: ' + error.message);
      }
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryName: string) => {
      // Bulk-update all products in this category to uncategorized
      const { error: updateError } = await supabase
        .from('products')
        .update({ category: null, updated_at: new Date().toISOString() })
        .eq('category', categoryName)
        .eq('is_active', true);

      if (updateError) throw updateError;

      // Remove from product_categories table if it exists there
      const { error: deleteError } = await supabase
        .from('product_categories')
        .delete()
        .eq('name', categoryName);

      if (deleteError) throw deleteError;
    },
    onSuccess: (_, categoryName) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-category-summaries'] });
      toast.success(`Category "${categoryName}" deleted — products moved to Uncategorized`);
    },
    onError: (error) => {
      toast.error('Failed to delete category: ' + error.message);
    },
  });
}
