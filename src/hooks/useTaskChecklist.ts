import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export function useTaskChecklist(taskId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-checklist', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*')
        .eq('task_id', taskId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as ChecklistItem[];
    },
    enabled: !!taskId,
  });

  const addItem = useMutation({
    mutationFn: async ({ title, sort_order }: { title: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('task_checklist_items')
        .insert({ task_id: taskId!, title, sort_order: sort_order ?? 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] }),
    onError: () => toast.error('Failed to add checklist item'),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({ is_completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] }),
    onError: () => toast.error('Failed to delete checklist item'),
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    addItem,
    toggleItem,
    deleteItem,
  };
}
