import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SpecialtyOption {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

// Fetch all active specialty options (for profile editor and homepage)
export function useSpecialtyOptions() {
  return useQuery({
    queryKey: ['specialty-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialty_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as unknown as SpecialtyOption[];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

// Fetch all specialty options for admin (including inactive)
export function useAllSpecialtyOptions() {
  return useQuery({
    queryKey: ['specialty-options-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialty_options')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as unknown as SpecialtyOption[];
    },
  });
}

// Add a new specialty option
export function useAddSpecialtyOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, display_order }: { name: string; display_order?: number }) => {
      // Get max display_order if not provided
      let order = display_order;
      if (order === undefined) {
        const { data: existing } = await supabase
          .from('specialty_options')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);
        order = (existing?.[0]?.display_order ?? 0) + 1;
      }

      const { data, error } = await supabase
        .from('specialty_options')
        .insert({ name, display_order: order })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-options'] });
      queryClient.invalidateQueries({ queryKey: ['specialty-options-all'] });
      toast.success('Specialty added');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('This specialty already exists');
      } else {
        toast.error('Failed to add specialty');
      }
    },
  });
}

// Update a specialty option
export function useUpdateSpecialtyOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, display_order, is_active }: { 
      id: string; 
      name?: string; 
      display_order?: number;
      is_active?: boolean;
    }) => {
      const updates: Partial<SpecialtyOption> = {};
      if (name !== undefined) updates.name = name;
      if (display_order !== undefined) updates.display_order = display_order;
      if (is_active !== undefined) updates.is_active = is_active;

      const { error } = await supabase
        .from('specialty_options')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-options'] });
      queryClient.invalidateQueries({ queryKey: ['specialty-options-all'] });
      toast.success('Specialty updated');
    },
    onError: () => {
      toast.error('Failed to update specialty');
    },
  });
}

// Delete a specialty option
export function useDeleteSpecialtyOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('specialty_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-options'] });
      queryClient.invalidateQueries({ queryKey: ['specialty-options-all'] });
      toast.success('Specialty deleted');
    },
    onError: () => {
      toast.error('Failed to delete specialty');
    },
  });
}

// Reorder specialty options
export function useReorderSpecialtyOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('specialty_options')
          .update({ display_order: index + 1 })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialty-options'] });
      queryClient.invalidateQueries({ queryKey: ['specialty-options-all'] });
      toast.success('Order saved');
    },
    onError: () => {
      toast.error('Failed to save order');
    },
  });
}
