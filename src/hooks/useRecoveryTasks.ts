import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type RecoveryStatus =
  | 'new' | 'contacted' | 'resolved' | 'refunded' | 'redo_booked' | 'closed';
export type RecoveryPriority = 'urgent' | 'high' | 'normal';

export interface RecoveryTask {
  id: string;
  organization_id: string;
  location_id: string | null;
  feedback_response_id: string;
  client_id: string | null;
  appointment_id: string | null;
  staff_user_id: string | null;
  assigned_to: string | null;
  status: RecoveryStatus;
  priority: RecoveryPriority;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryTaskWithFeedback extends RecoveryTask {
  feedback?: {
    overall_rating: number | null;
    nps_score: number | null;
    comments: string | null;
    responded_at: string | null;
  } | null;
}

export function useRecoveryTasks() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['recovery-tasks', orgId],
    queryFn: async (): Promise<RecoveryTaskWithFeedback[]> => {
      const { data, error } = await supabase
        .from('recovery_tasks')
        .select(`
          *,
          feedback:client_feedback_responses!recovery_tasks_feedback_response_id_fkey(
            overall_rating, nps_score, comments, responded_at
          )
        `)
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as RecoveryTaskWithFeedback[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useUpdateRecoveryTask() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status?: RecoveryStatus;
      assigned_to?: string | null;
      resolution_notes?: string | null;
      priority?: RecoveryPriority;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from('recovery_tasks')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recovery-tasks', orgId] });
      toast.success('Recovery task updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export const STATUS_LABELS: Record<RecoveryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  resolved: 'Resolved',
  refunded: 'Refunded',
  redo_booked: 'Redo Booked',
  closed: 'Closed',
};

export const STATUS_GROUPS: Record<'open' | 'inProgress' | 'closed', RecoveryStatus[]> = {
  open: ['new'],
  inProgress: ['contacted'],
  closed: ['resolved', 'refunded', 'redo_booked', 'closed'],
};
