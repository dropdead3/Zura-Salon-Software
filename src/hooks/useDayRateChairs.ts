import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DayRateChair {
  id: string;
  location_id: string;
  chair_number: number;
  name: string | null;
  is_available: boolean;
  daily_rate: number;
  created_at: string;
  updated_at: string;
}

export function useDayRateChairs(locationId?: string) {
  return useQuery({
    queryKey: ['day-rate-chairs', locationId],
    queryFn: async () => {
      let query = supabase
        .from('day_rate_chairs')
        .select('*')
        .order('chair_number', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DayRateChair[];
    },
    enabled: locationId !== undefined || locationId === undefined,
  });
}

export function useAvailableChairs(locationId: string, date: string) {
  return useQuery({
    queryKey: ['day-rate-chairs', 'available', locationId, date],
    queryFn: async () => {
      // Get all chairs for this location
      const { data: chairs, error: chairsError } = await supabase
        .from('day_rate_chairs')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_available', true)
        .order('chair_number', { ascending: true });

      if (chairsError) throw chairsError;

      // Get bookings for this date
      const { data: bookings, error: bookingsError } = await supabase
        .from('day_rate_bookings')
        .select('chair_id')
        .eq('location_id', locationId)
        .eq('booking_date', date)
        .neq('status', 'cancelled');

      if (bookingsError) throw bookingsError;

      const bookedChairIds = new Set(bookings?.map(b => b.chair_id) || []);
      const availableChairs = (chairs || []).filter(c => !bookedChairIds.has(c.id));

      return availableChairs as DayRateChair[];
    },
    enabled: !!locationId && !!date,
  });
}

export function useCreateDayRateChair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chair: Omit<DayRateChair, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('day_rate_chairs')
        .insert(chair)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-chairs'] });
      toast.success('Chair added');
    },
    onError: (error) => {
      toast.error('Failed to add chair', { description: error.message });
    },
  });
}

export function useUpdateDayRateChair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DayRateChair> & { id: string }) => {
      const { data, error } = await supabase
        .from('day_rate_chairs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-chairs'] });
      toast.success('Chair updated');
    },
    onError: (error) => {
      toast.error('Failed to update chair', { description: error.message });
    },
  });
}

export function useDeleteDayRateChair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('day_rate_chairs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-chairs'] });
      toast.success('Chair removed');
    },
    onError: (error) => {
      toast.error('Failed to remove chair', { description: error.message });
    },
  });
}

// Bulk create chairs for a location
export function useBulkCreateChairs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, count, dailyRate }: { locationId: string; count: number; dailyRate: number }) => {
      const chairs = Array.from({ length: count }, (_, i) => ({
        location_id: locationId,
        chair_number: i + 1,
        daily_rate: dailyRate,
        is_available: true,
      }));

      const { data, error } = await supabase
        .from('day_rate_chairs')
        .insert(chairs)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-chairs'] });
      toast.success('Chairs created');
    },
    onError: (error) => {
      toast.error('Failed to create chairs', { description: error.message });
    },
  });
}
