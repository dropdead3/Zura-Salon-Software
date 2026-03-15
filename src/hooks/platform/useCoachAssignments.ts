import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CoachAssignment {
  id: string;
  coach_user_id: string;
  organization_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  coach_name?: string;
  coach_email?: string;
  coach_photo_url?: string | null;
  org_name?: string;
}

export function useCoachAssignments() {
  return useQuery({
    queryKey: ['coach-assignments'],
    queryFn: async (): Promise<CoachAssignment[]> => {
      const { data, error } = await supabase
        .from('backroom_coach_assignments')
        .select('*')
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      // Enrich with coach names from employee_profiles
      const coachIds = [...new Set((data || []).map(a => a.coach_user_id))];
      const orgIds = [...new Set((data || []).map(a => a.organization_id))];

      const [profilesRes, orgsRes] = await Promise.all([
        coachIds.length > 0
          ? supabase.from('employee_profiles').select('user_id, full_name, email, photo_url').in('user_id', coachIds)
          : { data: [] },
        orgIds.length > 0
          ? supabase.from('organizations').select('id, name').in('id', orgIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const orgMap = new Map((orgsRes.data || []).map(o => [o.id, o]));

      return (data || []).map(a => ({
        ...a,
        coach_name: profileMap.get(a.coach_user_id)?.full_name ?? undefined,
        coach_email: profileMap.get(a.coach_user_id)?.email ?? undefined,
        coach_photo_url: profileMap.get(a.coach_user_id)?.photo_url ?? undefined,
        org_name: orgMap.get(a.organization_id)?.name ?? undefined,
      }));
    },
  });
}

export function useMyCoachAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-coach-assignments', user?.id],
    queryFn: async (): Promise<CoachAssignment[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('backroom_coach_assignments')
        .select('*')
        .eq('coach_user_id', user.id)
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      // Enrich with org names
      const orgIds = (data || []).map(a => a.organization_id);
      if (orgIds.length === 0) return [];

      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);

      const orgMap = new Map((orgs || []).map(o => [o.id, o]));

      return (data || []).map(a => ({
        ...a,
        org_name: orgMap.get(a.organization_id)?.name ?? undefined,
      }));
    },
    enabled: !!user?.id,
  });
}

export function useAssignCoach() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ coachUserId, organizationId }: { coachUserId: string; organizationId: string }) => {
      const { data, error } = await supabase
        .from('backroom_coach_assignments')
        .insert({
          coach_user_id: coachUserId,
          organization_id: organizationId,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-coach-assignments'] });
      toast.success('Coach assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign coach: ' + error.message);
    },
  });
}

export function useUnassignCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ coachUserId, organizationId }: { coachUserId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('backroom_coach_assignments')
        .delete()
        .eq('coach_user_id', coachUserId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-coach-assignments'] });
      toast.success('Coach unassigned');
    },
    onError: (error) => {
      toast.error('Failed to unassign coach: ' + error.message);
    },
  });
}
