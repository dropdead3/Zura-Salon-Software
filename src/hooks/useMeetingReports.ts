import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MeetingReport {
  id: string;
  meeting_id: string;
  coach_id: string;
  team_member_id: string;
  report_content: string;
  included_notes: string[];
  included_items: string[];
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  coach?: {
    full_name: string;
    display_name: string | null;
  };
  team_member?: {
    full_name: string;
    display_name: string | null;
    email: string;
  };
}

export function useMeetingReports(meetingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meeting-reports', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_reports')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as MeetingReport[];
    },
    enabled: !!meetingId && !!user,
  });
}

// Reports received by current user
export function useMyReceivedReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meeting-reports', 'received', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_reports')
        .select('*')
        .eq('team_member_id', user!.id)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Fetch coach profiles
      const coachIds = [...new Set(data?.map(r => r.coach_id) || [])];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', coachIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(report => ({
        ...report,
        coach: profileMap.get(report.coach_id),
      })) as MeetingReport[];
    },
    enabled: !!user,
  });
}

export function useCreateMeetingReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      meeting_id: string;
      team_member_id: string;
      report_content: string;
      included_notes?: string[];
      included_items?: string[];
    }) => {
      const { data: report, error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: data.meeting_id,
          coach_id: user!.id,
          team_member_id: data.team_member_id,
          report_content: data.report_content,
          included_notes: data.included_notes || [],
          included_items: data.included_items || [],
        })
        .select()
        .single();

      if (error) throw error;
      return report;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports', variables.meeting_id] });
      toast.success('Report created');
    },
    onError: (error) => {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    },
  });
}

export function useSendMeetingReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      // Call edge function to send email
      const { data, error } = await supabase.functions.invoke('send-meeting-report', {
        body: { reportId },
      });

      if (error) throw error;

      // Update sent_at timestamp
      const { error: updateError } = await supabase
        .from('meeting_reports')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', reportId);

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports'] });
      toast.success('Report sent to team member!');
    },
    onError: (error) => {
      console.error('Error sending report:', error);
      toast.error('Failed to send report');
    },
  });
}

export function useAcknowledgeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('meeting_reports')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports'] });
      toast.success('Report acknowledged');
    },
    onError: (error) => {
      console.error('Error acknowledging report:', error);
      toast.error('Failed to acknowledge report');
    },
  });
}
