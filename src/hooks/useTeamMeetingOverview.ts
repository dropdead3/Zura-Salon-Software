import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MeetingStatus = 'on-track' | 'due-soon' | 'overdue' | 'never-met';

export interface StaffMeetingInfo {
  userId: string;
  name: string;
  displayName: string | null;
  photoUrl: string | null;
  role: string | null;
  lastMeetingDate: string | null;
  nextMeetingDate: string | null;
  nextMeetingId: string | null;
  daysSinceLastMeeting: number | null;
  cadenceDays: number;
  hasOverride: boolean;
  status: MeetingStatus;
  /** Sort priority: 0=overdue, 1=due-soon, 2=never-met, 3=on-track */
  sortPriority: number;
}

export interface CadenceSettings {
  globalDefault: number;
  overrides: Record<string, number>; // userId -> cadence days
}

export interface TeamMeetingSummary {
  onTrack: number;
  dueSoon: number;
  overdue: number;
  neverMet: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Qualifying meeting types
// ---------------------------------------------------------------------------
const QUALIFYING_TYPES = ['coaching', 'check_in'];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTeamMeetingOverview() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = effectiveOrganization?.id;

  // ── Main query ──
  const query = useQuery({
    queryKey: ['team-meeting-overview', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const today = new Date().toISOString().split('T')[0];

      // 1. Get all active staff in the org
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return { staff: [], summary: emptySummary(), cadence: { globalDefault: 14, overrides: {} } };

      // Get roles for all staff
      const userIds = profiles.map(p => p.user_id);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map<string, string>();
      (rolesData || []).forEach(r => {
        // Keep the "highest" role per user
        const current = rolesMap.get(r.user_id);
        if (!current || roleRank(r.role) > roleRank(current)) {
          rolesMap.set(r.user_id, r.role);
        }
      });

      // 2. Get cadence settings for this org
      const { data: cadenceRows } = await supabase
        .from('meeting_cadence_settings' as any)
        .select('user_id, cadence_days')
        .eq('organization_id', orgId);

      let globalDefault = 14;
      const overrides: Record<string, number> = {};
      (cadenceRows || []).forEach((row: any) => {
        if (row.user_id === null) {
          globalDefault = row.cadence_days;
        } else {
          overrides[row.user_id] = row.cadence_days;
        }
      });

      // 3. Get all qualifying meetings involving these staff as requester_id
      //    Status: completed, OR confirmed + past date
      //    Type: coaching or check_in
      const { data: meetingsData } = await supabase
        .from('one_on_one_meetings')
        .select('requester_id, meeting_date, status, meeting_type')
        .in('requester_id', userIds)
        .in('meeting_type', QUALIFYING_TYPES)
        .or(`status.eq.completed,and(status.eq.confirmed,meeting_date.lt.${today})`)
        .order('meeting_date', { ascending: false });

      // Build map: userId -> most recent qualifying meeting date
      const lastMeetingMap = new Map<string, string>();
      (meetingsData || []).forEach(m => {
        if (!lastMeetingMap.has(m.requester_id)) {
          lastMeetingMap.set(m.requester_id, m.meeting_date);
        }
      });

      // 4. Get upcoming meetings for these staff
      const { data: upcomingData } = await supabase
        .from('one_on_one_meetings')
        .select('id, requester_id, meeting_date')
        .in('requester_id', userIds)
        .in('status', ['pending', 'confirmed'])
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true });

      // Build map: userId -> next upcoming meeting
      const nextMeetingMap = new Map<string, { id: string; date: string }>();
      (upcomingData || []).forEach(m => {
        if (!nextMeetingMap.has(m.requester_id)) {
          nextMeetingMap.set(m.requester_id, { id: m.id, date: m.meeting_date });
        }
      });

      // 5. Compute status for each staff member
      const todayDate = new Date();
      const staff: StaffMeetingInfo[] = profiles.map(p => {
        const cadenceDays = overrides[p.user_id] ?? globalDefault;
        const lastDate = lastMeetingMap.get(p.user_id) || null;
        const nextMeeting = nextMeetingMap.get(p.user_id) || null;
        const daysSince = lastDate ? differenceInDays(todayDate, parseISO(lastDate)) : null;

        let status: MeetingStatus;
        let sortPriority: number;

        if (daysSince === null) {
          status = 'never-met';
          sortPriority = 2;
        } else if (daysSince > cadenceDays) {
          status = 'overdue';
          sortPriority = 0;
        } else if (daysSince >= cadenceDays - 3) {
          status = 'due-soon';
          sortPriority = 1;
        } else {
          status = 'on-track';
          sortPriority = 3;
        }

        return {
          userId: p.user_id,
          name: p.display_name || p.full_name || 'Unknown',
          displayName: p.display_name,
          photoUrl: p.photo_url,
          role: rolesMap.get(p.user_id) || null,
          lastMeetingDate: lastDate,
          nextMeetingDate: nextMeeting?.date || null,
          nextMeetingId: nextMeeting?.id || null,
          daysSinceLastMeeting: daysSince,
          cadenceDays,
          hasOverride: p.user_id in overrides,
          status,
          sortPriority,
        };
      });

      // Sort: overdue first, then due-soon, then never-met, then on-track
      staff.sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        // Within same priority, sort by days since last (desc for urgency)
        return (b.daysSinceLastMeeting ?? 999) - (a.daysSinceLastMeeting ?? 999);
      });

      const summary: TeamMeetingSummary = {
        onTrack: staff.filter(s => s.status === 'on-track').length,
        dueSoon: staff.filter(s => s.status === 'due-soon').length,
        overdue: staff.filter(s => s.status === 'overdue').length,
        neverMet: staff.filter(s => s.status === 'never-met').length,
        total: staff.length,
      };

      return { staff, summary, cadence: { globalDefault, overrides } };
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Update cadence mutation ──
  const updateCadence = useMutation({
    mutationFn: async ({ userId, cadenceDays }: { userId: string | null; cadenceDays: number }) => {
      if (!orgId) throw new Error('No organization');

      const { error } = await supabase
        .from('meeting_cadence_settings' as any)
        .upsert({
          organization_id: orgId,
          user_id: userId,
          cadence_days: cadenceDays,
        }, {
          onConflict: 'organization_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-meeting-overview', orgId] });
      toast.success('Cadence updated');
    },
    onError: (error) => {
      console.error('Error updating cadence:', error);
      toast.error('Failed to update cadence');
    },
  });

  // ── Remove cadence override mutation ──
  const removeCadenceOverride = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!orgId) throw new Error('No organization');

      const { error } = await supabase
        .from('meeting_cadence_settings' as any)
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-meeting-overview', orgId] });
      toast.success('Override removed');
    },
    onError: (error) => {
      console.error('Error removing override:', error);
      toast.error('Failed to remove override');
    },
  });

  return {
    staff: query.data?.staff || [],
    summary: query.data?.summary || emptySummary(),
    cadence: query.data?.cadence || { globalDefault: 14, overrides: {} },
    isLoading: query.isLoading,
    error: query.error,
    updateCadence: updateCadence.mutate,
    removeCadenceOverride: removeCadenceOverride.mutate,
    isUpdating: updateCadence.isPending || removeCadenceOverride.isPending,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySummary(): TeamMeetingSummary {
  return { onTrack: 0, dueSoon: 0, overdue: 0, neverMet: 0, total: 0 };
}

function roleRank(role: string): number {
  switch (role) {
    case 'super_admin': return 4;
    case 'admin': return 3;
    case 'manager': return 2;
    case 'staff': return 1;
    default: return 0;
  }
}
