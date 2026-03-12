/**
 * useOperationalTasks — Query hook for operational tasks.
 * useOperationalTaskMutations — Command-backed mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { buildCommandMeta } from '@/lib/backroom/commands/types';
import {
  executeAssignOperationalTask,
  executeUpdateOperationalTaskStatus,
  executeResolveOperationalTask,
  executeEscalateOperationalTask,
} from '@/lib/backroom/commands/task-commands';
import type { TaskStatus, TaskPriority, ResolutionAction, OperationalTask } from '@/lib/backroom/services/operational-task-service';

// ─── Filters ─────────────────────────────────────────

export interface OperationalTaskFilters {
  status?: TaskStatus | TaskStatus[];
  taskType?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  assignedRole?: string;
  locationId?: string;
  sourceType?: string;
  sourceId?: string;
}

// ─── Query Hook ──────────────────────────────────────

export function useOperationalTasks(filters?: OperationalTaskFilters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['operational-tasks', orgId, filters],
    queryFn: async (): Promise<OperationalTask[]> => {
      let query = supabase
        .from('operational_tasks' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters?.taskType) query = query.eq('task_type', filters.taskType);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      if (filters?.assignedRole) query = query.eq('assigned_role', filters.assignedRole);
      if (filters?.locationId) query = query.eq('location_id', filters.locationId);
      if (filters?.sourceType) query = query.eq('source_type', filters.sourceType);
      if (filters?.sourceId) query = query.eq('source_id', filters.sourceId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as OperationalTask[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

// ─── Active Tasks (inbox view) ───────────────────────

export function useActiveOperationalTasks(locationId?: string) {
  return useOperationalTasks({
    status: ['open', 'assigned', 'in_progress', 'blocked'],
    locationId,
  });
}

// ─── Mutation Hooks ──────────────────────────────────

export function useOperationalTaskMutations() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['operational-tasks'] });

  const assign = useMutation({
    mutationFn: async (params: { taskId: string; userId: string }) => {
      const meta = await buildCommandMeta('ui');
      const result = await executeAssignOperationalTask({
        task_id: params.taskId,
        user_id: params.userId,
        organization_id: orgId!,
        meta,
      });
      if (!result.success) throw new Error(result.errors?.[0]?.message ?? 'Assignment failed');
    },
    onSuccess: () => { invalidate(); toast.success('Task assigned'); },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (params: { taskId: string; newStatus: TaskStatus; notes?: string }) => {
      const meta = await buildCommandMeta('ui');
      const result = await executeUpdateOperationalTaskStatus({
        task_id: params.taskId,
        new_status: params.newStatus,
        notes: params.notes,
        organization_id: orgId!,
        meta,
      });
      if (!result.success) throw new Error(result.errors?.[0]?.message ?? 'Status update failed');
    },
    onSuccess: () => { invalidate(); toast.success('Task updated'); },
    onError: (err) => toast.error(err.message),
  });

  const resolve = useMutation({
    mutationFn: async (params: { taskId: string; action: ResolutionAction; notes?: string }) => {
      const meta = await buildCommandMeta('ui');
      const result = await executeResolveOperationalTask({
        task_id: params.taskId,
        action: params.action,
        notes: params.notes,
        organization_id: orgId!,
        meta,
      });
      if (!result.success) throw new Error(result.errors?.[0]?.message ?? 'Resolution failed');
    },
    onSuccess: () => { invalidate(); toast.success('Task resolved'); },
    onError: (err) => toast.error(err.message),
  });

  const escalate = useMutation({
    mutationFn: async (params: { taskId: string; newAssignedTo?: string }) => {
      const meta = await buildCommandMeta('ui');
      const result = await executeEscalateOperationalTask({
        task_id: params.taskId,
        new_assigned_to: params.newAssignedTo,
        organization_id: orgId!,
        meta,
      });
      if (!result.success) throw new Error(result.errors?.[0]?.message ?? 'Escalation failed');
    },
    onSuccess: () => { invalidate(); toast.success('Task escalated'); },
    onError: (err) => toast.error(err.message),
  });

  return { assign, updateStatus, resolve, escalate };
}
