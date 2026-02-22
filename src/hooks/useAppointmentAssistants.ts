import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssistantAssignment {
  id: string;
  appointment_id: string;
  assistant_user_id: string;
  organization_id: string;
  assist_duration_minutes: number | null;
  created_at: string;
  assistant_profile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
}

export function useAppointmentAssistants(appointmentId: string | null) {
  const queryClient = useQueryClient();

  const { data: assistants = [], isLoading } = useQuery({
    queryKey: ['appointment-assistants', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_assistants')
        .select('*')
        .eq('appointment_id', appointmentId!);

      if (error) throw error;

      // Fetch profiles for assistants
      if (data && data.length > 0) {
        const userIds = data.map(a => a.assistant_user_id);
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name, photo_url')
          .in('user_id', userIds);

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        return data.map(a => ({
          ...a,
          assistant_profile: profileMap.get(a.assistant_user_id) || undefined,
        })) as AssistantAssignment[];
      }

      return [] as AssistantAssignment[];
    },
    enabled: !!appointmentId,
  });

  const assignAssistant = useMutation({
    mutationFn: async ({ assistantUserId, organizationId }: { assistantUserId: string; organizationId: string }) => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase
        .from('appointment_assistants')
        .insert({
          appointment_id: appointmentId!,
          assistant_user_id: assistantUserId,
          organization_id: organizationId,
          created_by: currentUser?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-assistants', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['live-session-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['assisted-appointment-ids'] });
      toast.success('Assistant assigned');

      // Send in-app notification to the assigned assistant
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser && data.assistant_user_id !== currentUser.id) {
          await supabase.from('notifications').insert({
            user_id: data.assistant_user_id,
            type: 'assistant_assigned',
            title: 'Assistant Assignment',
            message: `You've been assigned as an assistant on an appointment`,
            metadata: { appointment_id: appointmentId },
          });
        }
      } catch (notifError) {
        console.warn('[AssistantNotification] Failed to send notification:', notifError);
      }
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('This assistant is already assigned');
      } else if (error?.message?.includes('lead stylist')) {
        toast.error('Cannot assign the lead stylist as their own assistant');
      } else {
        toast.error('Failed to assign assistant');
      }
    },
  });

  const removeAssistant = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('appointment_assistants')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-assistants', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['live-session-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['assisted-appointment-ids'] });
      toast.success('Assistant removed');
    },
    onError: () => {
      toast.error('Failed to remove assistant');
    },
  });

  const updateDuration = useMutation({
    mutationFn: async ({ assignmentId, minutes }: { assignmentId: string; minutes: number | null }) => {
      const { error } = await supabase
        .from('appointment_assistants')
        .update({ assist_duration_minutes: minutes })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-assistants', appointmentId] });
    },
    onError: () => {
      toast.error('Failed to update duration');
    },
  });

  return {
    assistants,
    isLoading,
    assignAssistant: assignAssistant.mutate,
    removeAssistant: removeAssistant.mutate,
    updateAssistDuration: updateDuration.mutate,
    isAssigning: assignAssistant.isPending,
    isRemoving: removeAssistant.isPending,
  };
}
