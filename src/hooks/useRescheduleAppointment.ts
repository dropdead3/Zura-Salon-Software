import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RescheduleParams {
  appointmentId: string;
  newDate: string;
  newTime: string;
  newStaffId?: string;
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, newDate, newTime, newStaffId }: RescheduleParams) => {
      const { data, error } = await supabase.functions.invoke('update-phorest-appointment-time', {
        body: {
          appointment_id: appointmentId,
          new_date: newDate,
          new_time: newTime,
          new_staff_id: newStaffId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to reschedule');
      
      return data;
    },
    onMutate: async ({ appointmentId, newTime, newStaffId }) => {
      // Cancel in-flight fetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['phorest-appointments'] });

      // Snapshot all matching caches for rollback
      const previousCaches: [readonly unknown[], unknown][] = [];
      queryClient.getQueriesData({ queryKey: ['phorest-appointments'] }).forEach(([key, data]) => {
        previousCaches.push([key, data]);
      });

      // Optimistically update the appointment in all matching caches
      queryClient.setQueriesData({ queryKey: ['phorest-appointments'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((appt: any) => {
          if (appt.id !== appointmentId) return appt;
          return {
            ...appt,
            start_time: newTime,
            ...(newStaffId ? { stylist_user_id: newStaffId } : {}),
          };
        });
      });

      return { previousCaches };
    },
    onSuccess: () => {
      // Refetch to confirm server state
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      // Toast is handled by the caller (DayView) for better UX with Undo
    },
    onError: (error: any, _variables, context) => {
      // Rollback all caches
      if (context?.previousCaches) {
        context.previousCaches.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error('Failed to reschedule: ' + error.message);
    },
  });
}
