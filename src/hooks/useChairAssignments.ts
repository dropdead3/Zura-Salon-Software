import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, subWeeks, format, areIntervalsOverlapping } from 'date-fns';

// ── Types ──

export interface ChairAssignment {
  id: string;
  organization_id: string;
  location_id: string;
  chair_id: string;
  stylist_user_id: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableChair {
  id: string;
  station_name: string;
  station_number: number | null;
  station_type: string | null;
  is_available: boolean | null;
  location_id: string;
}

export interface AvailableStylist {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  photo_url: string | null;
}

export interface ExclusionReason {
  stylistId: string;
  stylistName: string;
  reason: string;
  details: string;
}

export interface RandomAssignResult {
  assignments: Array<{ chairId: string; stylistUserId: string }>;
  exclusions: ExclusionReason[];
  unassignedChairs: string[];
}

// ── Helpers ──

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return {
    weekStart: format(start, 'yyyy-MM-dd'),
    weekEnd: format(end, 'yyyy-MM-dd'),
  };
}

/** Fisher-Yates shuffle (in-place, seeded optional) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Hook: Fetch assignments for a week ──

export function useChairAssignments(locationId: string | null, weekDate: Date) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { weekStart, weekEnd } = getWeekRange(weekDate);

  return useQuery({
    queryKey: ['chair-assignments', orgId, locationId, weekStart],
    queryFn: async () => {
      let query = supabase
        .from('salon_chair_assignments')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('week_start_date', weekStart);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ChairAssignment[];
    },
    enabled: !!orgId,
  });
}

// ── Hook: Fetch available chairs ──

export function useAvailableChairs(locationId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['available-chairs', orgId, locationId],
    queryFn: async () => {
      let query = supabase
        .from('rental_stations')
        .select('id, station_name, station_number, station_type, is_available, location_id')
        .eq('organization_id', orgId!)
        .eq('is_available', true);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.order('station_number');
      if (error) throw error;
      return (data ?? []) as AvailableChair[];
    },
    enabled: !!orgId,
  });
}

// ── Hook: Fetch active stylists ──

export function useAvailableStylists(locationId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['available-stylists', orgId, locationId],
    queryFn: async () => {
      let query = supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AvailableStylist[];
    },
    enabled: !!orgId,
  });
}

// ── Hook: Fetch time-off for a week ──

function useTimeOffForWeek(weekDate: Date) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { weekStart, weekEnd } = getWeekRange(weekDate);

  return useQuery({
    queryKey: ['time-off-week', orgId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('user_id, start_date, end_date, reason, status')
        .eq('organization_id', orgId!)
        .eq('status', 'approved')
        .lte('start_date', weekEnd)
        .gte('end_date', weekStart);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
}

// ── Mutation: Save assignments ──

export function useSaveChairAssignments(locationId: string | null, weekDate: Date) {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { weekStart, weekEnd } = getWeekRange(weekDate);

  return useMutation({
    mutationFn: async (assignments: Array<{ chairId: string; stylistUserId: string }>) => {
      // Delete existing assignments for this week/location
      let deleteQuery = supabase
        .from('salon_chair_assignments')
        .delete()
        .eq('organization_id', orgId!)
        .eq('week_start_date', weekStart);

      if (locationId && locationId !== 'all') {
        deleteQuery = deleteQuery.eq('location_id', locationId);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      if (assignments.length === 0) return [];

      const rows = assignments.map(a => ({
        organization_id: orgId!,
        location_id: locationId || 'default',
        chair_id: a.chairId,
        stylist_user_id: a.stylistUserId,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        status: 'active' as const,
      }));

      const { data, error } = await supabase
        .from('salon_chair_assignments')
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chair-assignments'] });
      toast.success('Chair assignments saved');
    },
    onError: (error) => {
      toast.error('Failed to save assignments: ' + error.message);
    },
  });
}

// ── Mutation: Delete single assignment ──

export function useDeleteChairAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salon_chair_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chair-assignments'] });
      toast.success('Assignment removed');
    },
    onError: (error) => {
      toast.error('Failed to remove assignment: ' + error.message);
    },
  });
}

// ── Randomizer logic ──

export function useRandomAssignment(
  locationId: string | null,
  weekDate: Date
) {
  const { data: chairs } = useAvailableChairs(locationId);
  const { data: stylists } = useAvailableStylists(locationId);
  const { data: timeOff } = useTimeOffForWeek(weekDate);
  const { weekStart, weekEnd } = getWeekRange(weekDate);

  const randomize = (excludeIds: string[] = []): RandomAssignResult => {
    if (!chairs || !stylists) {
      return { assignments: [], exclusions: [], unassignedChairs: [] };
    }

    const exclusions: ExclusionReason[] = [];
    const weekInterval = {
      start: new Date(weekStart),
      end: new Date(weekEnd),
    };

    // Find stylists with time-off conflicts
    const timeOffUserIds = new Set<string>();
    (timeOff ?? []).forEach(to => {
      const toInterval = {
        start: new Date(to.start_date),
        end: new Date(to.end_date),
      };
      if (areIntervalsOverlapping(weekInterval, toInterval)) {
        timeOffUserIds.add(to.user_id);
      }
    });

    // Build available stylists list
    const availableStylists = stylists.filter(s => {
      if (excludeIds.includes(s.user_id)) {
        exclusions.push({
          stylistId: s.user_id,
          stylistName: formatDisplayName(s.full_name || '', s.display_name),
          reason: 'Manually excluded',
          details: 'Excluded from randomization by admin',
        });
        return false;
      }
      if (timeOffUserIds.has(s.user_id)) {
        const matchingTimeOff = (timeOff ?? []).find(t => t.user_id === s.user_id);
        exclusions.push({
          stylistId: s.user_id,
          stylistName: formatDisplayName(s.full_name || '', s.display_name),
          reason: matchingTimeOff?.reason ?? 'Time off',
          details: `${matchingTimeOff?.start_date} – ${matchingTimeOff?.end_date}`,
        });
        return false;
      }
      return true;
    });

    // Fisher-Yates shuffle
    const shuffled = shuffle(availableStylists);

    // Assign sequentially to chairs
    const assignments: Array<{ chairId: string; stylistUserId: string }> = [];
    const unassignedChairs: string[] = [];

    chairs.forEach((chair, i) => {
      if (i < shuffled.length) {
        assignments.push({
          chairId: chair.id,
          stylistUserId: shuffled[i].user_id,
        });
      } else {
        unassignedChairs.push(chair.id);
      }
    });

    return { assignments, exclusions, unassignedChairs };
  };

  return { randomize, isReady: !!chairs && !!stylists };
}

// ── Carryover logic ──

export function useCarryoverAssignments(
  locationId: string | null,
  weekDate: Date
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: timeOff } = useTimeOffForWeek(weekDate);
  const { weekStart, weekEnd } = getWeekRange(weekDate);
  const prevWeekDate = subWeeks(weekDate, 1);
  const { weekStart: prevWeekStart } = getWeekRange(prevWeekDate);

  const carryover = async (): Promise<RandomAssignResult | null> => {
    if (!orgId) return null;

    // Fetch previous week assignments
    let query = supabase
      .from('salon_chair_assignments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('week_start_date', prevWeekStart);

    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { data: prevAssignments, error } = await query;
    if (error) throw error;

    if (!prevAssignments || prevAssignments.length === 0) {
      toast.error('No assignments found for previous week');
      return null;
    }

    const weekInterval = { start: new Date(weekStart), end: new Date(weekEnd) };
    const exclusions: ExclusionReason[] = [];
    const assignments: Array<{ chairId: string; stylistUserId: string }> = [];

    // Check each previous assignment for time-off conflicts
    for (const prev of prevAssignments) {
      const hasConflict = (timeOff ?? []).some(to => {
        const toInterval = { start: new Date(to.start_date), end: new Date(to.end_date) };
        return to.user_id === prev.stylist_user_id && areIntervalsOverlapping(weekInterval, toInterval);
      });

      if (hasConflict) {
        const matchingTimeOff = (timeOff ?? []).find(t => t.user_id === prev.stylist_user_id);
        exclusions.push({
          stylistId: prev.stylist_user_id,
          stylistName: prev.stylist_user_id, // Will resolve in UI
          reason: matchingTimeOff?.reason ?? 'Time off',
          details: `${matchingTimeOff?.start_date} – ${matchingTimeOff?.end_date}`,
        });
      } else {
        assignments.push({
          chairId: prev.chair_id,
          stylistUserId: prev.stylist_user_id,
        });
      }
    }

    return { assignments, exclusions, unassignedChairs: [] };
  };

  return { carryover };
}

export { getWeekRange };
