import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MeetingRequest {
  id: string;
  manager_id: string;
  team_member_id: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'scheduled' | 'cancelled' | 'expired';
  linked_meeting_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  manager?: {
    full_name: string;
    display_name: string | null;
    photo_url: string | null;
  };
  team_member?: {
    full_name: string;
    display_name: string | null;
    photo_url: string | null;
  };
}

// Fetch meeting requests for current user (as manager or team member)
export function useMeetingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meeting-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for managers and team members
      const managerIds = [...new Set(data?.map(r => r.manager_id) || [])];
      const teamMemberIds = [...new Set(data?.map(r => r.team_member_id) || [])];
      const allUserIds = [...new Set([...managerIds, ...teamMemberIds])];

      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(request => ({
        ...request,
        manager: profileMap.get(request.manager_id),
        team_member: profileMap.get(request.team_member_id),
      })) as MeetingRequest[];
    },
    enabled: !!user,
  });
}

// Create a meeting request (manager initiates)
export function useCreateMeetingRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      team_member_id: string;
      reason: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      expires_at?: string;
    }) => {
      const { data: request, error } = await supabase
        .from('meeting_requests')
        .insert({
          manager_id: user!.id,
          team_member_id: data.team_member_id,
          reason: data.reason,
          priority: data.priority || 'medium',
          expires_at: data.expires_at || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for team member
      const { data: managerProfile } = await supabase
        .from('employee_profiles')
        .select('full_name, display_name')
        .eq('user_id', user!.id)
        .single();

      const managerName = managerProfile ? formatDisplayName(managerProfile.full_name, managerProfile.display_name) : 'Your manager';

      await supabase.from('notifications').insert({
        user_id: data.team_member_id,
        type: 'meeting_request',
        title: `${managerName} has requested a meeting`,
        message: data.reason,
        link: '/dashboard/schedule-meeting?tab=meeting-requests',
      });

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-requests'] });
      toast.success('Meeting request sent!');
    },
    onError: (error) => {
      console.error('Error creating meeting request:', error);
      toast.error('Failed to send meeting request');
    },
  });
}

// Update meeting request status
export function useUpdateMeetingRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      linked_meeting_id 
    }: { 
      id: string; 
      status: 'pending' | 'scheduled' | 'cancelled' | 'expired';
      linked_meeting_id?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (linked_meeting_id) {
        updates.linked_meeting_id = linked_meeting_id;
      }

      const { error } = await supabase
        .from('meeting_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-requests'] });
      toast.success('Request updated');
    },
    onError: (error) => {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    },
  });
}

// Link a meeting to a request (when stylist schedules in response)
export function useLinkMeetingToRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, meetingId }: { requestId: string; meetingId: string }) => {
      const { error } = await supabase
        .from('meeting_requests')
        .update({ 
          status: 'scheduled',
          linked_meeting_id: meetingId,
        })
        .eq('id', requestId);

      if (error) throw error;
      return { requestId, meetingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-requests'] });
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings'] });
      toast.success('Meeting scheduled successfully!');
    },
    onError: (error) => {
      console.error('Error linking meeting:', error);
      toast.error('Failed to link meeting to request');
    },
  });
}
