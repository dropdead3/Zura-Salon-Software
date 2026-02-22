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
    onSuccess: (data) => {
      // Invalidate calendar queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      
      if (data.phorest_updated) {
        toast.success('Appointment rescheduled and synced to Phorest');
      } else {
        toast.success('Appointment rescheduled locally');
      }
    },
    onError: (error: any) => {
      toast.error('Failed to reschedule: ' + error.message);
    },
  });
}
