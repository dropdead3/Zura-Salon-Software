import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type EventType = 'meeting' | 'training' | 'time_off' | 'holiday' | 'special' | 'reminder';
export type EventVisibility = 'team' | 'leadership' | 'private';

export interface TeamCalendarEvent {
  id: string;
  organization_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  visibility: EventVisibility;
  color: string | null;
  created_by: string | null;
  attendees: Array<{ userId: string; status: 'confirmed' | 'tentative' | 'declined' }>;
  recurring_pattern: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    interval?: number;
    days?: number[];
    until?: string;
  } | null;
  metadata: Record<string, unknown>;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  visibility?: EventVisibility;
  color?: string;
  location_id?: string;
  attendees?: Array<{ userId: string; status: 'confirmed' | 'tentative' | 'declined' }>;
  recurring_pattern?: TeamCalendarEvent['recurring_pattern'];
  metadata?: Record<string, unknown>;
}

export function useTeamCalendarEvents(startDate?: string, endDate?: string) {
  const { effectiveOrganization } = useOrganizationContext();

  return useQuery({
    queryKey: ['team-calendar-events', effectiveOrganization?.id, startDate, endDate],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];

      let query = supabase
        .from('team_calendar_events')
        .select('*')
        .eq('organization_id', effectiveOrganization.id)
        .eq('is_cancelled', false)
        .order('start_date', { ascending: true });

      if (startDate) {
        query = query.gte('start_date', startDate);
      }
      if (endDate) {
        query = query.lte('start_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as TeamCalendarEvent[];
    },
    enabled: !!effectiveOrganization?.id,
  });
}

export function useTeamCalendarEvent(eventId?: string) {
  return useQuery({
    queryKey: ['team-calendar-event', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('team_calendar_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return data as unknown as TeamCalendarEvent;
    },
    enabled: !!eventId,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!effectiveOrganization?.id || !user?.id) {
        throw new Error('Not authenticated');
      }

      const insertData = {
        title: input.title,
        description: input.description || null,
        event_type: input.event_type,
        start_date: input.start_date,
        end_date: input.end_date || null,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        all_day: input.all_day ?? false,
        visibility: input.visibility || 'team',
        color: input.color || null,
        location_id: input.location_id || null,
        attendees: JSON.parse(JSON.stringify(input.attendees || [])),
        recurring_pattern: input.recurring_pattern ? JSON.parse(JSON.stringify(input.recurring_pattern)) : null,
        metadata: JSON.parse(JSON.stringify(input.metadata || {})),
        organization_id: effectiveOrganization.id,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('team_calendar_events')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TeamCalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-calendar-events'] });
      toast.success('Event created');
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
      toast.error('Failed to create event');
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateEventInput> }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.event_type !== undefined) updateData.event_type = updates.event_type;
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
      if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
      if (updates.all_day !== undefined) updateData.all_day = updates.all_day;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.location_id !== undefined) updateData.location_id = updates.location_id;
      if (updates.attendees !== undefined) updateData.attendees = updates.attendees;
      if (updates.recurring_pattern !== undefined) updateData.recurring_pattern = updates.recurring_pattern;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      const { data, error } = await supabase
        .from('team_calendar_events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TeamCalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['team-calendar-event'] });
      toast.success('Event updated');
    },
    onError: (error) => {
      console.error('Failed to update event:', error);
      toast.error('Failed to update event');
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      // Soft delete by marking as cancelled
      const { error } = await supabase
        .from('team_calendar_events')
        .update({ is_cancelled: true })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-calendar-events'] });
      toast.success('Event deleted');
    },
    onError: (error) => {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    },
  });
}

// Event type colors
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  meeting: '#3b82f6', // blue
  training: '#8b5cf6', // purple
  time_off: '#f59e0b', // amber
  holiday: '#10b981', // green
  special: '#ec4899', // pink
  reminder: '#6b7280', // gray
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: 'Meeting',
  training: 'Training',
  time_off: 'Time Off',
  holiday: 'Holiday',
  special: 'Special Event',
  reminder: 'Reminder',
};
