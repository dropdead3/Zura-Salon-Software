import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveUserContext } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

export type TaskType = 'growth' | 'protection' | 'acceleration' | 'unlock';
export type RevenueType = 'generated' | 'protected';
export type TaskStatus = 'created' | 'active' | 'in_progress' | 'completed' | 'expired' | 'missed';

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
  // Task Engine 2.0 fields
  opportunity_id: string | null;
  revenue_type: RevenueType | null;
  priority_score: number | null;
  execution_time_minutes: number | null;
  difficulty_score: number | null;
  task_type: TaskType | null;
  enforcement_level: number;
  decay_days: number | null;
  missed_revenue_cents: number | null;
  status: TaskStatus;
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

      // Sort by priority_score descending when available, then fallback order
      const tasks = (data as Task[]).sort((a, b) => {
        // Completed always last
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        // Priority score (higher first)
        const aScore = a.priority_score ?? -1;
        const bScore = b.priority_score ?? -1;
        if (aScore !== bScore) return bScore - aScore;
        return 0; // preserve DB order for ties
      });

      return tasks;
    },
    enabled: !!effectiveUserId,
  });

  const createTask = useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      due_date?: string;
      priority?: 'low' | 'normal' | 'high';
      source?: string;
      recurrence_pattern?: string | null;
      estimated_revenue_impact_cents?: number | null;
      expires_at?: string | null;
      // Task Engine 2.0 fields
      task_type?: TaskType | null;
      revenue_type?: RevenueType | null;
      execution_time_minutes?: number | null;
      opportunity_id?: string | null;
      priority_score?: number | null;
      enforcement_level?: number;
      decay_days?: number | null;
    }) => {
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
          task_type: task.task_type || null,
          revenue_type: task.revenue_type || null,
          execution_time_minutes: task.execution_time_minutes || null,
          opportunity_id: task.opportunity_id || null,
          priority_score: task.priority_score || null,
          enforcement_level: task.enforcement_level ?? 1,
          decay_days: task.decay_days || null,
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
          status: is_completed ? 'completed' : 'active',
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
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: {
        title?: string;
        description?: string | null;
        due_date?: string | null;
        priority?: 'low' | 'normal' | 'high';
        notes?: string | null;
        recurrence_pattern?: string | null;
        estimated_revenue_impact_cents?: number | null;
        expires_at?: string | null;
        // Task Engine 2.0 fields
        task_type?: TaskType | null;
        revenue_type?: RevenueType | null;
        execution_time_minutes?: number | null;
        opportunity_id?: string | null;
        priority_score?: number | null;
        enforcement_level?: number;
        decay_days?: number | null;
        missed_revenue_cents?: number | null;
        status?: TaskStatus;
      }
    }) => {
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

  // Detect expired tasks and mark missed revenue (one-time write)
  const markExpiredTasks = useMutation({
    mutationFn: async (expiredTasks: Task[]) => {
      for (const task of expiredTasks) {
        if (task.missed_revenue_cents != null) continue; // already marked
        await supabase
          .from('tasks')
          .update({
            status: 'expired',
            missed_revenue_cents: task.estimated_revenue_impact_cents || 0,
          })
          .eq('id', task.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    markExpiredTasks,
  };
}
