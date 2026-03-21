import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveUserId } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

interface LocationSchedule {
  id: string;
  user_id: string;
  location_id: string;
  work_days: string[];
  created_at: string;
  updated_at: string;
}

interface ScheduleChangeRequest {
  id: string;
  user_id: string;
  location_id: string;
  current_days: string[];
  requested_days: string[];
  reason: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches location schedules for the effective user.
 * When a super admin is impersonating a user, this returns that user's schedules.
 */
export function useLocationSchedules() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ['location-schedules', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_location_schedules')
        .select('*')
        .eq('user_id', effectiveUserId!);

      if (error) throw error;
      return data as LocationSchedule[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useLocationSchedule(locationId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['location-schedule', user?.id, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_location_schedules')
        .select('*')
        .eq('user_id', user!.id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;
      return data as LocationSchedule | null;
    },
    enabled: !!user && !!locationId,
  });
}

export function useUpsertLocationSchedule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ locationId, workDays }: { locationId: string; workDays: string[] }) => {
      const { data, error } = await supabase
        .from('employee_location_schedules')
        .upsert({
          user_id: user!.id,
          location_id: locationId,
          work_days: workDays,
        }, {
          onConflict: 'user_id,location_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['location-schedule'] });
      // Toast removed - will be shown by the parent save operation
    },
    onError: (error) => {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    },
  });
}

export function useMyScheduleChangeRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-schedule-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_change_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScheduleChangeRequest[];
    },
    enabled: !!user,
  });
}

export function usePendingScheduleChangeRequests() {
  return useQuery({
    queryKey: ['pending-schedule-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_change_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ScheduleChangeRequest[];
    },
  });
}

export function useCreateScheduleChangeRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      locationId,
      currentDays,
      requestedDays,
      reason,
    }: {
      locationId: string;
      currentDays: string[];
      requestedDays: string[];
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('schedule_change_requests')
        .insert({
          user_id: user!.id,
          location_id: locationId,
          current_days: currentDays,
          requested_days: requestedDays,
          reason: reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-schedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-schedule-requests'] });
      toast.success('Schedule change request submitted');
    },
    onError: (error) => {
      console.error('Error creating request:', error);
      toast.error('Failed to submit request');
    },
  });
}

export function useReviewScheduleChangeRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      reviewNotes,
    }: {
      requestId: string;
      status: 'approved' | 'denied';
      reviewNotes?: string;
    }) => {
      const { data, error } = await supabase
        .from('schedule_change_requests')
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, update the actual schedule
      if (status === 'approved') {
        const request = data as ScheduleChangeRequest;
        await supabase
          .from('employee_location_schedules')
          .upsert({
            user_id: request.user_id,
            location_id: request.location_id,
            work_days: request.requested_days,
          }, {
            onConflict: 'user_id,location_id',
          });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-schedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-schedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['location-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['location-schedule'] });
      toast.success(`Request ${variables.status === 'approved' ? 'approved' : 'denied'}`);
    },
    onError: (error) => {
      console.error('Error reviewing request:', error);
      toast.error('Failed to process request');
    },
  });
}
