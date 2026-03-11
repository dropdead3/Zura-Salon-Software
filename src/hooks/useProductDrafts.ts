import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductDraft {
  id: string;
  user_id: string;
  form_data: Record<string, any>;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export function useProductDrafts() {
  return useQuery({
    queryKey: ['product-drafts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('product_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ProductDraft[];
    },
  });
}

export function useSaveProductDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, formData, currentStep }: { id?: string; formData: Record<string, any>; currentStep: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (id) {
        const { data, error } = await supabase
          .from('product_drafts')
          .update({ form_data: formData as any, current_step: currentStep })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('product_drafts')
          .insert({ user_id: user.id, form_data: formData as any, current_step: currentStep })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-drafts'] });
      toast.success('Draft saved');
    },
    onError: (error) => {
      toast.error('Failed to save draft: ' + error.message);
    },
  });
}

export function useDeleteProductDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_drafts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-drafts'] });
    },
  });
}
