import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMinutes, parseISO, addMinutes, isAfter } from 'date-fns';

interface PhorestAppointment {
  id: string;
  phorest_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string | null;
  client_phone: string | null;
  service_name: string | null;
  service_category: string | null;
  status: string;
  total_price: number | null;
  tip_amount: number | null;
  notes: string | null;
  stylist_user_id: string | null;
  phorest_staff_id: string | null;
  phorest_client_id: string | null;
  location_id: string | null;
  is_new_client: boolean | null;
}

export interface QueueAppointment extends PhorestAppointment {
  waitTimeMinutes: number;
  estimatedCompleteIn: number;
  isLate: boolean;
  stylistName?: string;
}

export interface TodaysQueueData {
  waiting: QueueAppointment[];
  inService: QueueAppointment[];
  completed: QueueAppointment[];
  noShows: QueueAppointment[];
  upcoming: QueueAppointment[];
  stats: {
    waitingCount: number;
    inServiceCount: number;
    completedCount: number;
    noShowCount: number;
    upcomingCount: number;
    totalRevenue: number;
  };
}

function calculateQueueMetrics(
  apt: PhorestAppointment,
  stylistMap: Map<string, string>
): QueueAppointment {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  
  // Parse appointment time
  const [startHour, startMin] = apt.start_time.split(':').map(Number);
  const [endHour, endMin] = apt.end_time.split(':').map(Number);
  
  const appointmentStart = new Date(`${today}T${apt.start_time}:00`);
  const appointmentEnd = new Date(`${today}T${apt.end_time}:00`);
  
  // Calculate wait time (how late they are if past appointment time)
  const waitTimeMinutes = Math.max(0, differenceInMinutes(now, appointmentStart));
  
  // Calculate estimated completion time
  const estimatedCompleteIn = Math.max(0, differenceInMinutes(appointmentEnd, now));
  
  // Check if late (15+ minutes past appointment time without check-in)
  const isLate = apt.status !== 'checked_in' && 
                 apt.status !== 'completed' && 
                 waitTimeMinutes >= 15;

  // Get stylist name
  const stylistName = apt.stylist_user_id 
    ? stylistMap.get(apt.stylist_user_id) 
    : undefined;

  return {
    ...apt,
    waitTimeMinutes,
    estimatedCompleteIn,
    isLate,
    stylistName,
  };
}

export function useTodaysQueue(locationId?: string) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch stylists for name lookup
  const { data: stylists } = useQuery({
    queryKey: ['employee-profiles-basic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const stylistMap = new Map(
    ((stylists || []) as any[]).map((s: any) => [
      s.user_id, 
      formatDisplayName(s.full_name, s.display_name)
    ]) || []
  );

  // Main queue data query
  const query = useQuery({
    queryKey: ['todays-queue', today, locationId],
    queryFn: async (): Promise<TodaysQueueData> => {
      let queryBuilder = supabase
        .from('v_all_appointments' as any)
        .select('*')
        .eq('appointment_date', today)
        .order('start_time', { ascending: true });

      if (locationId && locationId !== 'all') {
        queryBuilder = queryBuilder.eq('location_id', locationId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      const appointments = (data || []) as PhorestAppointment[];
      const now = new Date();
      const currentTime = format(now, 'HH:mm');

      // Process appointments with queue metrics
      const processed = appointments.map(apt => 
        calculateQueueMetrics(apt, stylistMap)
      );

      // Categorize by status
      const waiting: QueueAppointment[] = [];
      const inService: QueueAppointment[] = [];
      const completed: QueueAppointment[] = [];
      const noShows: QueueAppointment[] = [];
      const upcoming: QueueAppointment[] = [];

      for (const apt of processed) {
        switch (apt.status) {
          case 'confirmed':
          case 'booked':
            // If appointment time is in the future, it's upcoming
            if (apt.start_time > currentTime) {
              upcoming.push(apt);
            } else {
              // Past appointment time = waiting
              waiting.push(apt);
            }
            break;
          case 'checked_in':
            inService.push(apt);
            break;
          case 'completed':
            completed.push(apt);
            break;
          case 'no_show':
            noShows.push(apt);
            break;
          default:
            // Handle any other statuses as upcoming
            if (apt.start_time > currentTime) {
              upcoming.push(apt);
            }
        }
      }

      // Calculate revenue from completed appointments (tip-adjusted)
      const totalRevenue = completed.reduce(
        (sum, apt) => sum + ((apt.total_price || 0) - (apt.tip_amount || 0)),
        0
      );

      return {
        waiting,
        inService,
        completed,
        noShows,
        upcoming,
        stats: {
          waitingCount: waiting.length,
          inServiceCount: inService.length,
          completedCount: completed.length,
          noShowCount: noShows.length,
          upcomingCount: upcoming.length,
          totalRevenue,
        },
      };
    },
    staleTime: 30000, // Has realtime subscription, no polling needed
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'phorest_appointments',
          filter: `appointment_date=eq.${today}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['todays-queue', today] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [today, queryClient]);

  return query;
}

// Hook for updating appointment status
export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      const response = await supabase.functions.invoke('update-phorest-appointment', {
        body: { appointment_id: appointmentId, status: status.toUpperCase() },
      });
      
      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Update failed');
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-queue'] });
    },
  });
}
