import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type MeetingType = 'one_on_one' | 'interview' | 'manager_meeting' | 'training' | 'other';
export type MeetingMode = 'in_person' | 'video' | 'hybrid';
export type MeetingStatus = 'scheduled' | 'cancelled' | 'completed';
export type RsvpStatus = 'pending' | 'accepted' | 'declined';

export interface AdminMeeting {
  id: string;
  organization_id: string;
  location_id: string | null;
  organizer_user_id: string;
  title: string;
  meeting_type: MeetingType;
  start_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  meeting_mode: MeetingMode;
  video_link: string | null;
  notes: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string;
  rsvp_status: RsvpStatus;
  notified_at: string | null;
  created_at: string;
}

export interface CreateMeetingInput {
  title: string;
  meeting_type: MeetingType;
  start_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  meeting_mode: MeetingMode;
  location_id?: string | null;
  video_link?: string | null;
  notes?: string | null;
  attendee_user_ids: string[];
}

export function useAdminMeetings(dateRange?: { start: string; end: string }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['admin-meetings', orgId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('admin_meetings')
        .select('*')
        .eq('organization_id', orgId!)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (dateRange) {
        query = query.gte('start_date', dateRange.start).lte('start_date', dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AdminMeeting[];
    },
    enabled: !!orgId,
  });
}

export function useAdminMeetingsForDate(date: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['admin-meetings', orgId, 'date', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_meetings')
        .select('*, admin_meeting_attendees(user_id, rsvp_status)')
        .eq('organization_id', orgId!)
        .eq('start_date', date!)
        .neq('status', 'cancelled');

      if (error) throw error;
      return data as (AdminMeeting & { admin_meeting_attendees: MeetingAttendee[] })[];
    },
    enabled: !!orgId && !!date,
    staleTime: 30000,
  });
}

export function useMeetingAttendees(meetingId: string | null) {
  return useQuery({
    queryKey: ['meeting-attendees', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_meeting_attendees')
        .select('*')
        .eq('meeting_id', meetingId!);

      if (error) throw error;
      return data as unknown as MeetingAttendee[];
    },
    enabled: !!meetingId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      if (!orgId) throw new Error('No organization context');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create the meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('admin_meetings')
        .insert({
          organization_id: orgId,
          organizer_user_id: user.user.id,
          title: input.title,
          meeting_type: input.meeting_type,
          start_date: input.start_date,
          start_time: input.start_time,
          end_time: input.end_time,
          duration_minutes: input.duration_minutes,
          meeting_mode: input.meeting_mode,
          location_id: input.location_id || null,
          video_link: input.video_link || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Add attendees
      if (input.attendee_user_ids.length > 0) {
        const attendeeRows = input.attendee_user_ids.map(uid => ({
          meeting_id: meeting.id,
          user_id: uid,
          rsvp_status: 'pending' as const,
        }));

        const { error: attendeeError } = await supabase
          .from('admin_meeting_attendees')
          .insert(attendeeRows);

        if (attendeeError) throw attendeeError;

        // Create in-app notifications for attendees
        const { data: organizerProfile } = await supabase
          .from('employee_profiles')
          .select('display_name, full_name')
          .eq('user_id', user.user.id)
          .maybeSingle();

        const organizerName = organizerProfile ? formatDisplayName(organizerProfile.full_name, organizerProfile.display_name) : 'Someone';
        const dateLabel = input.start_date;

        for (const uid of input.attendee_user_ids) {
          await supabase.from('notifications').insert({
            user_id: uid,
            type: 'meeting_invite',
            title: `Meeting Invite: ${input.title}`,
            message: `${organizerName} invited you to "${input.title}" on ${dateLabel} at ${input.start_time}.`,
            metadata: {
              meeting_id: meeting.id,
              organizer_user_id: user.user.id,
              meeting_type: input.meeting_type,
            },
          }).then(() => {});
        }
      }

      // Send email invites via edge function (fire-and-forget)
      try {
        await supabase.functions.invoke('send-meeting-invite', {
          body: { meetingId: meeting.id },
        });
      } catch (emailErr) {
        console.warn('Meeting email invite failed:', emailErr);
      }

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
      toast.success('Meeting scheduled');
    },
    onError: (error) => {
      toast.error('Failed to schedule meeting: ' + error.message);
    },
  });
}

export function useUpdateMeetingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: MeetingStatus }) => {
      const { data, error } = await supabase
        .from('admin_meetings')
        .update({ status })
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
      toast.success('Meeting updated');
    },
  });
}

export function useUpdateRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, rsvpStatus }: { meetingId: string; rsvpStatus: RsvpStatus }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_meeting_attendees')
        .update({ rsvp_status: rsvpStatus })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-attendees'] });
      toast.success('RSVP updated');
    },
  });
}
