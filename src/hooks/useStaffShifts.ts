import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type ShiftRoleContext = 'front_desk' | 'receptionist' | 'coordinator' | 'other';
export type ShiftStatus = 'scheduled' | 'swapped' | 'cancelled';

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
      return data as StaffShift[];
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
