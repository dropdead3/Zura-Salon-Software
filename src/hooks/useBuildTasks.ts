import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BuildTaskStatus = 'pending' | 'in-progress' | 'blocked' | 'complete';
export type BuildTaskCategory = 'api' | 'enhancement' | 'setup' | 'integration';
export type BuildTaskPriority = 'high' | 'medium' | 'low';

export interface BuildTask {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  status: BuildTaskStatus;
  category: BuildTaskCategory;
  priority: BuildTaskPriority;
  blocked_by: string | null;
  notes: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useBuildTasks() {
  return useQuery({
    queryKey: ['build-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('build_tasks')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as BuildTask[];
    },
  });
}

export function useCreateBuildTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<BuildTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('build_tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-tasks'] });
    },
  });
}

export function useUpdateBuildTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<BuildTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('build_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-tasks'] });
    },
  });
}

export function useDeleteBuildTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('build_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-tasks'] });
    },
  });
}

export function useToggleBuildTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BuildTaskStatus }) => {
      const { data, error } = await supabase
        .from('build_tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['build-tasks'] });
    },
  });
}
