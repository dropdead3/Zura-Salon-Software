import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============= TYPES =============
export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  location_id: string | null;
  preferred_stylist_id: string | null;
  is_vip: boolean;
  is_active: boolean;
  notes: string | null;
  total_spend: number;
  visit_count: number;
  last_visit_date: string | null;
  average_spend: number;
  external_id: string | null;
  import_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price: number | null;
  location_id: string | null;
  requires_qualification: boolean;
  allow_same_day_booking: boolean;
  lead_time_days: number;
  is_active: boolean;
  display_order: number;
  external_id: string | null;
  import_source: string | null;
}

export interface Appointment {
  id: string;
  location_id: string | null;
  staff_user_id: string | null;
  staff_name: string | null;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  service_id: string | null;
  service_name: string | null;
  service_category: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  status: string;
  original_price: number | null;
  total_price: number | null;
  tip_amount: number;
  rebooked_at_checkout: boolean;
  payment_method: string | null;
  notes: string | null;
  client_notes: string | null;
  external_id: string | null;
  import_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

// ============= CLIENTS =============
export function useClients(locationId?: string) {
  return useQuery({
    queryKey: ['clients', locationId],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Client[];
    },
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data as unknown as Client;
    },
    enabled: !!clientId,
  });
}

// ============= SERVICES =============
export function useServices(locationId?: string) {
  return useQuery({
    queryKey: ['services', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('bookable_online', true)
        .order('category')
        .order('display_order')
        .order('name');

      if (locationId) {
        query = query.or(`location_id.eq.${locationId},location_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Service[];
    },
  });
}

export function useServicesByCategory(locationId?: string) {
  const { data: services, ...rest } = useServices(locationId);

  const grouped = services?.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return { data: grouped, services, ...rest };
}

// ============= APPOINTMENTS =============
export function useAppointments(options: {
  locationId?: string;
  staffUserId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { locationId, staffUserId, date, startDate, endDate } = options;

  return useQuery({
    queryKey: ['appointments', locationId, staffUserId, date, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date')
        .order('start_time');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (staffUserId) {
        query = query.eq('staff_user_id', staffUserId);
      }

      if (date) {
        query = query.eq('appointment_date', date);
      } else if (startDate && endDate) {
        query = query.gte('appointment_date', startDate).lte('appointment_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Appointment[];
    },
  });
}

// ============= AVAILABILITY =============
export function useCheckAvailability() {
  return useMutation({
    mutationFn: async (params: {
      staff_user_id: string;
      date: string;
      location_id?: string;
      slot_duration_minutes?: number;
    }) => {
      const response = await supabase.functions.invoke('check-availability', {
        body: params,
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to check availability');

      return {
        availableSlots: response.data.available_slots as AvailableSlot[],
        allSlots: response.data.all_slots as AvailableSlot[],
      };
    },
  });
}

// ============= BOOKING MUTATIONS =============
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      location_id: string;
      staff_user_id: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      client_id?: string;
      client_name?: string;
      client_email?: string;
      client_phone?: string;
      service_id?: string;
      service_name?: string;
      total_price?: number;
      notes?: string;
    }) => {
      const response = await supabase.functions.invoke('create-booking', {
        body: params,
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to create booking');

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appointment_id: string;
      status: 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
      notes?: string;
      tip_amount?: number;
    }) => {
      const response = await supabase.functions.invoke('update-booking', {
        body: {
          action: 'status',
          ...params,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to update booking');

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appointment_id: string;
      new_date: string;
      new_start_time: string;
      new_end_time: string;
      new_staff_user_id?: string;
    }) => {
      const response = await supabase.functions.invoke('update-booking', {
        body: {
          action: 'reschedule',
          ...params,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Failed to reschedule booking');

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// ============= CLIENT MUTATIONS =============
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      first_name: string;
      last_name: string;
      email?: string;
      mobile?: string;
      phone?: string;
      location_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...params,
          import_source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      mobile?: string;
      phone?: string;
      location_id?: string;
      preferred_stylist_id?: string;
      is_vip?: boolean;
      notes?: string;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// SERVICE MUTATIONS removed in Wave 8 — these duplicates dropped Wave 1–5
// fields and skipped organization_id. Use the canonical hooks from
// `@/hooks/useServicesData` instead: `useCreateService`, `useUpdateService`.
