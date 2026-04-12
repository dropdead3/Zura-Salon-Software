import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveUserContext } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  completed_at: string | null;
  recurrence_pattern: string | null;
  recurrence_parent_id: string | null;
  snoozed_until: string | null;
  estimated_revenue_impact_cents: number | null;
  expires_at: string | null;
}

/**
 * Fetches and manages tasks for the effective user.
 * When a super admin is impersonating a user, this shows that user's tasks.
 * God Mode (platform) users have full read/write access.
 */
export function useTasks() {
  const { user } = useAuth();
  const { effectiveUserId, actualUserId, isImpersonating } = useEffectiveUserContext();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .order('is_completed', { ascending: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!effectiveUserId,
  });

  const createTask = useMutation({
    mutationFn: async (task: { title: string; description?: string; due_date?: string; priority?: 'low' | 'normal' | 'high'; source?: string; recurrence_pattern?: string | null; estimated_revenue_impact_cents?: number | null; expires_at?: string | null }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: actualUserId!,
          title: task.title,
          description: task.description || null,
          due_date: task.due_date || null,
          priority: task.priority || 'normal',
          source: task.source || 'manual',
          recurrence_pattern: task.recurrence_pattern || null,
          estimated_revenue_impact_cents: task.estimated_revenue_impact_cents || null,
          expires_at: task.expires_at || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const snoozeTask = useMutation({
    mutationFn: async ({ id, snoozed_until }: { id: string; snoozed_until: string | null }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ snoozed_until })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task snoozed');
    },
    onError: () => {
      toast.error('Failed to snooze task');
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; description?: string | null; due_date?: string | null; priority?: 'low' | 'normal' | 'high'; notes?: string | null; recurrence_pattern?: string | null; estimated_revenue_impact_cents?: number | null; expires_at?: string | null } }) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    isImpersonating,
    createTask,
    toggleTask,
    deleteTask,
    updateTask,
    snoozeTask,
  };
}
