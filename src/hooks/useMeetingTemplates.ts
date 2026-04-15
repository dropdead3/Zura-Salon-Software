import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { MeetingType, MeetingMode } from '@/hooks/useAdminMeetings';

export interface MeetingTemplate {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  meeting_type: MeetingType;
  title_template: string;
  duration_minutes: number;
  meeting_mode: MeetingMode;
  location_id: string | null;
  video_link: string | null;
  attendee_user_ids: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  meeting_type: MeetingType;
  title_template: string;
  duration_minutes: number;
  meeting_mode: MeetingMode;
  location_id?: string | null;
  video_link?: string | null;
  attendee_user_ids: string[];
  notes?: string | null;
}

export function useMeetingTemplates() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['meeting-templates', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_templates')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as unknown as MeetingTemplate[];
    },
    enabled: !!orgId,
  });
}

export function useCreateMeetingTemplate() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!orgId) throw new Error('No organization context');
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('meeting_templates')
        .insert({
          organization_id: orgId,
          created_by: user.user.id,
          name: input.name,
          meeting_type: input.meeting_type,
          title_template: input.title_template,
          duration_minutes: input.duration_minutes,
          meeting_mode: input.meeting_mode,
          location_id: input.location_id || null,
          video_link: input.video_link || null,
          attendee_user_ids: input.attendee_user_ids,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      toast.success('Template saved');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    },
  });
}

export function useDeleteMeetingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('meeting_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      toast.success('Template removed');
    },
  });
}
