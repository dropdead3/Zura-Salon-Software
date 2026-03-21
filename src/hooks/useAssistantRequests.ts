import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths, format, parseISO, isBefore } from 'date-fns';

export interface SalonService {
  id: string;
  name: string;
  duration_minutes: number;
  category: string | null;
}

export interface AssistantRequest {
  id: string;
  stylist_id: string;
  assistant_id: string | null;
  service_id: string;
  client_name: string;
  request_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  created_at: string;
  location_id: string | null;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrence_end_date: string | null;
  parent_request_id: string | null;
  accepted_at: string | null;
  declined_by: string[] | null;
  assigned_at: string | null;
  response_deadline_hours: number | null;
  response_time_seconds: number | null;
  salon_services?: SalonService;
  stylist_profile?: { full_name: string; display_name: string | null } | null;
  assistant_profile?: { full_name: string; display_name: string | null } | null;
  locations?: { name: string } | null;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export function useSalonServices() {
  return useQuery({
    queryKey: ['salon-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as SalonService[];
    },
  });
}

export function useAssistantRequests(filter: 'stylist' | 'assistant' | 'all' = 'all', locationId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['assistant-requests', filter, user?.id, locationId],
    queryFn: async () => {
      let query = supabase
        .from('assistant_requests')
        .select(`
          *,
          salon_services (id, name, duration_minutes, category),
          locations (name)
        `)
        .order('request_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Filter based on role
      if (filter === 'stylist' && user) {
        query = query.eq('stylist_id', user.id);
      } else if (filter === 'assistant' && user) {
        query = query.eq('assistant_id', user.id);
      }

      // Filter by location
      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Cast and return with type assertion
      return (data || []) as AssistantRequest[];
    },
    enabled: !!user,
  });
}

// Helper function to generate recurring dates
function generateRecurringDates(
  startDate: Date,
  recurrenceType: RecurrenceType,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  let currentDate = startDate;

  while (isBefore(currentDate, endDate) || format(currentDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
    dates.push(currentDate);
    
    switch (recurrenceType) {
      case 'daily':
        currentDate = addDays(currentDate, 1);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'biweekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      default:
        return dates;
    }
  }

  return dates;
}

export function useCreateAssistantRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      service_id: string;
      client_name: string;
      request_date: string;
      start_time: string;
      notes?: string;
      location_id?: string;
      recurrence_type?: RecurrenceType;
      recurrence_end_date?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get service duration
      const { data: service, error: serviceError } = await supabase
        .from('salon_services')
        .select('duration_minutes')
        .eq('id', data.service_id)
        .single();

      if (serviceError) throw serviceError;

      // Calculate end time based on service duration
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + service.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const end_time = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      const recurrenceType = data.recurrence_type || 'none';
      const hasRecurrence = recurrenceType !== 'none' && data.recurrence_end_date;

      // Create the first/main request
      const { data: request, error: insertError } = await supabase
        .from('assistant_requests')
        .insert({
          stylist_id: user.id,
          service_id: data.service_id,
          client_name: data.client_name,
          request_date: data.request_date,
          start_time: `${data.start_time}:00`,
          end_time,
          notes: data.notes || null,
          location_id: data.location_id || null,
          recurrence_type: recurrenceType,
          recurrence_end_date: data.recurrence_end_date || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call edge function to auto-assign first request
      const { data: assignResult, error: assignError } = await supabase.functions.invoke('assign-assistant', {
        body: { request_id: request.id }
      });

      if (assignError) {
        console.error('Assignment error:', assignError);
      }

      // If recurring, create additional requests
      let recurringCount = 0;
      if (hasRecurrence) {
        const startDate = parseISO(data.request_date);
        const endDate = parseISO(data.recurrence_end_date!);
        const dates = generateRecurringDates(startDate, recurrenceType, endDate);

        // Skip the first date (already created) and create the rest
        const recurringDates = dates.slice(1);
        recurringCount = recurringDates.length;

        for (const date of recurringDates) {
          const { data: recurringRequest, error: recurringError } = await supabase
            .from('assistant_requests')
            .insert({
              stylist_id: user.id,
              service_id: data.service_id,
              client_name: data.client_name,
              request_date: format(date, 'yyyy-MM-dd'),
              start_time: `${data.start_time}:00`,
              end_time,
              notes: data.notes || null,
              location_id: data.location_id || null,
              recurrence_type: 'none',
              parent_request_id: request.id,
            })
            .select()
            .single();

          if (!recurringError && recurringRequest) {
            // Auto-assign each recurring request
            await supabase.functions.invoke('assign-assistant', {
              body: { request_id: recurringRequest.id }
            });
          }
        }
      }

      return { request, assignResult, recurringCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      if (result.recurringCount > 0) {
        toast.success(`Request submitted with ${result.recurringCount} recurring appointments!`);
      } else if (result.assignResult?.assigned) {
        toast.success(`Request submitted and assigned to ${result.assignResult.assistant_name || 'an assistant'}!`);
      } else {
        toast.success('Request submitted! Awaiting assistant assignment.');
      }
    },
    onError: (error) => {
      console.error('Failed to create request:', error);
      toast.error('Failed to submit request');
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'completed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('assistant_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      toast.success('Request updated');
    },
    onError: () => {
      toast.error('Failed to update request');
    },
  });
}

export function useAcceptAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assistant_requests')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Send notification email to stylist
      await supabase.functions.invoke('notify-assignment-response', {
        body: { request_id: id, action: 'accepted', assistant_id: user.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      toast.success('Assignment accepted!');
    },
    onError: () => {
      toast.error('Failed to accept assignment');
    },
  });
}

export function useDeclineAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      // Send notification email to stylist about decline
      await supabase.functions.invoke('notify-assignment-response', {
        body: { request_id: id, action: 'declined', assistant_id: user.id }
      });

      // Call edge function to decline and reassign
      const { data, error } = await supabase.functions.invoke('reassign-assistant', {
        body: { request_id: id, declined_by: user.id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assistant-requests'] });
      if (data?.reassigned) {
        toast.success('Assignment declined and reassigned');
      } else {
        toast.success('Assignment declined');
      }
    },
    onError: () => {
      toast.error('Failed to decline assignment');
    },
  });
}