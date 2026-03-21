import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DayRateBookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface DayRateBooking {
  id: string;
  chair_id: string | null;
  location_id: string;
  booking_date: string;
  stylist_name: string;
  stylist_email: string;
  stylist_phone: string;
  license_number: string;
  license_state: string;
  business_name: string | null;
  instagram_handle: string | null;
  amount_paid: number | null;
  stripe_payment_id: string | null;
  agreement_signed_at: string | null;
  agreement_version: string | null;
  status: DayRateBookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  chair_id?: string;
  location_id: string;
  booking_date: string;
  stylist_name: string;
  stylist_email: string;
  stylist_phone: string;
  license_number: string;
  license_state: string;
  business_name?: string;
  instagram_handle?: string;
  amount_paid?: number;
  agreement_signed_at?: string;
  agreement_version?: string;
}

export function useDayRateBookings(filters?: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  status?: DayRateBookingStatus;
}) {
  return useQuery({
    queryKey: ['day-rate-bookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('day_rate_bookings')
        .select('*')
        .order('booking_date', { ascending: true });

      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters?.startDate) {
        query = query.gte('booking_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('booking_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DayRateBooking[];
    },
  });
}

export function useDayRateBooking(id: string) {
  return useQuery({
    queryKey: ['day-rate-booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_rate_bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as DayRateBooking;
    },
    enabled: !!id,
  });
}

export function useCreateDayRateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: CreateBookingInput) => {
      const { data, error } = await supabase
        .from('day_rate_bookings')
        .insert({
          ...booking,
          status: 'pending' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DayRateBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['day-rate-chairs'] });
    },
    onError: (error) => {
      toast.error('Failed to create booking', { description: error.message });
    },
  });
}

export function useUpdateDayRateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DayRateBooking> & { id: string }) => {
      const { data, error } = await supabase
        .from('day_rate_bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['day-rate-booking', data.id] });
      toast.success('Booking updated');
    },
    onError: (error) => {
      toast.error('Failed to update booking', { description: error.message });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DayRateBookingStatus }) => {
      const { data, error } = await supabase
        .from('day_rate_bookings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['day-rate-booking', data.id] });
      toast.success(`Booking ${data.status.replace('_', ' ')}`);
    },
    onError: (error) => {
      toast.error('Failed to update status', { description: error.message });
    },
  });
}

export function useDeleteDayRateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('day_rate_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-bookings'] });
      toast.success('Booking deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete booking', { description: error.message });
    },
  });
}

// Get bookings for a specific date range (for calendar view)
export function useBookingsByDateRange(startDate: string, endDate: string, locationId?: string) {
  return useQuery({
    queryKey: ['day-rate-bookings', 'calendar', startDate, endDate, locationId],
    queryFn: async () => {
      let query = supabase
        .from('day_rate_bookings')
        .select('*')
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .order('booking_date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DayRateBooking[];
    },
    enabled: !!startDate && !!endDate,
  });
}
