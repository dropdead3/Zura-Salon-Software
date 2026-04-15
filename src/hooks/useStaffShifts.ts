import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { addDays, addWeeks, eachDayOfInterval, format, getDay } from 'date-fns';

export type ShiftRoleContext = 'front_desk' | 'receptionist' | 'coordinator' | 'other';
export type ShiftStatus = 'scheduled' | 'swapped' | 'cancelled';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'custom';

export interface StaffShift {
  id: string;
  organization_id: string;
  location_id: string | null;
  user_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_context: ShiftRoleContext;
  status: ShiftStatus;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftInput {
  user_id: string;
  location_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_context: ShiftRoleContext;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  notes?: string | null;
}

export interface RecurringShiftInput {
  user_id: string;
  location_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_context: ShiftRoleContext;
  notes?: string | null;
  pattern: RecurrencePattern;
  customDays?: number[]; // 0=Sun, 1=Mon, ...6=Sat
  untilDate: string; // yyyy-MM-dd
}

// Generate dates for recurring shifts
function generateRecurringDates(
  startDate: string,
  untilDate: string,
  pattern: RecurrencePattern,
  customDays?: number[]
): string[] {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(untilDate + 'T12:00:00');
  const dates: string[] = [];

  if (pattern === 'daily') {
    const allDays = eachDayOfInterval({ start, end });
    return allDays.map(d => format(d, 'yyyy-MM-dd'));
  }

  if (pattern === 'weekly') {
    let current = start;
    while (current <= end) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current = addWeeks(current, 1);
    }
    return dates;
  }

  if (pattern === 'biweekly') {
    let current = start;
    while (current <= end) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current = addWeeks(current, 2);
    }
    return dates;
  }

  if (pattern === 'custom' && customDays?.length) {
    const allDays = eachDayOfInterval({ start, end });
    return allDays
      .filter(d => customDays.includes(getDay(d)))
      .map(d => format(d, 'yyyy-MM-dd'));
  }

  return [startDate];
}

// Check for shift conflicts client-side
export function checkShiftConflict(
  existingShifts: StaffShift[],
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): StaffShift | null {
  return existingShifts.find(s =>
    s.user_id === userId &&
    s.shift_date === date &&
    s.id !== excludeShiftId &&
    s.start_time.slice(0, 5) < endTime &&
    s.end_time.slice(0, 5) > startTime
  ) || null;
}

export function useStaffShifts(startDate: string | null, endDate: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['staff-shifts', orgId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('staff_shifts')
        .select('*')
        .eq('organization_id', orgId!)
        .neq('status', 'cancelled')
        .order('shift_date')
        .order('start_time');

      if (startDate) query = query.gte('shift_date', startDate);
      if (endDate) query = query.lte('shift_date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StaffShift[];
    },
    enabled: !!orgId && !!startDate,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: CreateShiftInput) => {
      if (!orgId) throw new Error('No organization context');
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('staff_shifts')
        .insert({
          organization_id: orgId,
          user_id: input.user_id,
          location_id: input.location_id || null,
          shift_date: input.shift_date,
          start_time: input.start_time,
          end_time: input.end_time,
          role_context: input.role_context,
          is_recurring: input.is_recurring || false,
          recurrence_pattern: input.recurrence_pattern || null,
          notes: input.notes || null,
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success('Shift created');
    },
    onError: (error) => {
      toast.error('Failed to create shift: ' + error.message);
    },
  });
}

export function useCreateRecurringShifts() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: RecurringShiftInput) => {
      if (!orgId) throw new Error('No organization context');
      const { data: user } = await supabase.auth.getUser();

      const dates = generateRecurringDates(input.shift_date, input.untilDate, input.pattern, input.customDays);
      const patternStr = input.pattern === 'custom' && input.customDays?.length
        ? `custom:${input.customDays.map(d => ['sun','mon','tue','wed','thu','fri','sat'][d]).join(',')}`
        : input.pattern;

      const rows = dates.map(date => ({
        organization_id: orgId,
        user_id: input.user_id,
        location_id: input.location_id || null,
        shift_date: date,
        start_time: input.start_time,
        end_time: input.end_time,
        role_context: input.role_context,
        is_recurring: true,
        recurrence_pattern: patternStr,
        notes: input.notes || null,
        created_by: user.user?.id || null,
      }));

      const { data, error } = await supabase
        .from('staff_shifts')
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success(`${data.length} recurring shifts created`);
    },
    onError: (error) => {
      toast.error('Failed to create recurring shifts: ' + error.message);
    },
  });
}

export function useCopyPreviousWeek() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ currentWeekStart }: { currentWeekStart: string }) => {
      if (!orgId) throw new Error('No organization context');
      const { data: user } = await supabase.auth.getUser();

      const prevStart = format(addDays(new Date(currentWeekStart + 'T12:00:00'), -7), 'yyyy-MM-dd');
      const prevEnd = format(addDays(new Date(currentWeekStart + 'T12:00:00'), -1), 'yyyy-MM-dd');

      // Fetch previous week shifts
      const { data: prevShifts, error: fetchError } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'cancelled')
        .gte('shift_date', prevStart)
        .lte('shift_date', prevEnd);

      if (fetchError) throw fetchError;
      if (!prevShifts?.length) throw new Error('No shifts found in the previous week to copy');

      // Fetch current week shifts to avoid duplicates
      const curEnd = format(addDays(new Date(currentWeekStart + 'T12:00:00'), 6), 'yyyy-MM-dd');
      const { data: currentShifts } = await supabase
        .from('staff_shifts')
        .select('user_id, shift_date, start_time, end_time')
        .eq('organization_id', orgId)
        .neq('status', 'cancelled')
        .gte('shift_date', currentWeekStart)
        .lte('shift_date', curEnd);

      const existingKeys = new Set(
        (currentShifts || []).map(s => `${s.user_id}-${s.shift_date}-${s.start_time}-${s.end_time}`)
      );

      const newShifts = prevShifts
        .map(s => {
          const newDate = format(addDays(new Date(s.shift_date + 'T12:00:00'), 7), 'yyyy-MM-dd');
          const key = `${s.user_id}-${newDate}-${s.start_time}-${s.end_time}`;
          if (existingKeys.has(key)) return null;
          return {
            organization_id: orgId,
            user_id: s.user_id,
            location_id: s.location_id,
            shift_date: newDate,
            start_time: s.start_time,
            end_time: s.end_time,
            role_context: s.role_context,
            is_recurring: false,
            recurrence_pattern: null,
            notes: s.notes,
            created_by: user.user?.id || null,
          };
        })
        .filter(Boolean);

      if (!newShifts.length) throw new Error('All shifts from last week already exist this week');

      const { data, error } = await supabase
        .from('staff_shifts')
        .insert(newShifts)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success(`${data.length} shifts copied from last week`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from('staff_shifts')
        .update({ status: 'cancelled' as const })
        .eq('id', shiftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success('Shift cancelled');
    },
  });
}

export function useDeleteRecurringShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shift }: { shift: StaffShift }) => {
      // Cancel this shift and all future shifts with the same pattern, user, time
      const { error } = await supabase
        .from('staff_shifts')
        .update({ status: 'cancelled' as const })
        .eq('user_id', shift.user_id)
        .eq('recurrence_pattern', shift.recurrence_pattern!)
        .eq('start_time', shift.start_time)
        .eq('end_time', shift.end_time)
        .eq('role_context', shift.role_context)
        .gte('shift_date', shift.shift_date)
        .neq('status', 'cancelled');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success('This and all future shifts in this series cancelled');
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, updates }: { shiftId: string; updates: Partial<CreateShiftInput & { status: ShiftStatus }> }) => {
      const { data, error } = await supabase
        .from('staff_shifts')
        .update(updates)
        .eq('id', shiftId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success('Shift updated');
    },
  });
}
