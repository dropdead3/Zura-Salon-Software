import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ----- Types -----

export type ArchiveBucketKey =
  | 'appointments'
  | 'service_assignments'
  | 'appointment_assistants'
  | 'assistant_requests'
  | 'operational_tasks'
  | 'seo_tasks'
  | 'shift_swaps'
  | 'meeting_requests'
  | 'employee_location_schedules'
  | 'client_preferences'
  | 'walk_in_queue';

export type ArchiveAction = 'reassign' | 'cancel' | 'drop' | 'end_date';

export type DestinationRole = 'stylist' | 'stylist_assistant' | 'manager' | 'any';

export interface DependencyBucket {
  key: ArchiveBucketKey;
  label: string;
  count: number;
  items: Array<Record<string, unknown>>;
  destinationRole: DestinationRole;
  actions: ArchiveAction[];
}

export interface ServiceRef {
  id: string | null;
  name: string;
}

export interface EligibleStylist {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  stylist_level: string | null;
  location_id: string | null;
  hire_date: string | null;
  /** 14-element array, daily appointment counts starting today. */
  daily_load: number[];
  qualified_service_ids: string[];
}

export interface DependencyScan {
  userId: string;
  organizationId: string;
  scannedAt: string;
  totalBlocking: number;
  /** Stylist level of the archived user, used to recommend same-level successors. */
  stylistLevelOfArchived?: string | null;
  /** Server-computed roster with capacity + skills baked in. */
  eligibleStylists?: EligibleStylist[];
  buckets: DependencyBucket[];
}

/** Shape of an item inside the `client_preferences` bucket. */
export interface ClientPreferenceItem {
  id: string;
  first_name: string;
  last_name: string;
  last_visit_date: string | null;
  last_visit_with_stylist: string | null;
  visit_count: number;
  avg_ticket: number;
  /** Top 3 service refs for this client with the archived stylist (id may be null
   *  when the historical service_name no longer maps to a current `services` row). */
  top_services: Array<ServiceRef | string>;
  location_id: string | null;
  /** Reachability flags for Step 4 client soft-notify triage. */
  has_email?: boolean;
  has_phone?: boolean;
  recommended_user_id: string | null;
  recommendation_reason: string;
}

export interface Reassignment {
  bucket: ArchiveBucketKey;
  itemId: string;
  destinationUserId: string | null;
  action: ArchiveAction;
}

// ----- Hooks -----

export function useScanTeamMemberDependencies(
  organizationId: string | undefined,
  userId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['team-member-archive-scan', organizationId, userId],
    queryFn: async (): Promise<DependencyScan> => {
      const { data, error } = await supabase.functions.invoke(
        'scan-team-member-dependencies',
        { body: { organizationId, userId } },
      );
      if (error) throw error;
      return data as DependencyScan;
    },
    enabled: enabled && !!organizationId && !!userId,
    staleTime: 30_000,
  });
}

export function useArchiveTeamMember(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      reason: string;
      effectiveDate?: string;
      reassignments: Reassignment[];
      notifyReassignedClients?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'archive-team-member',
        { body: { organizationId, ...input } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization-users', organizationId] });
      qc.invalidateQueries({ queryKey: ['team-member-archive-log', organizationId] });
      toast.success('Team member archived');
    },
    onError: (err: Error) => {
      toast.error('Archive failed', { description: err.message });
    },
  });
}

export function useUnarchiveTeamMember(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke(
        'unarchive-team-member',
        { body: { organizationId, userId } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization-users', organizationId] });
      qc.invalidateQueries({ queryKey: ['team-member-archive-log', organizationId] });
      toast.success('Team member un-archived');
    },
    onError: (err: Error) => {
      toast.error('Un-archive failed', { description: err.message });
    },
  });
}

export function useArchiveLogEntry(
  organizationId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['team-member-archive-log', organizationId, userId],
    queryFn: async () => {
      if (!organizationId || !userId) return null;
      const { data, error } = await supabase
        .from('team_member_archive_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('archived_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && !!userId,
  });
}
