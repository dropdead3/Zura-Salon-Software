import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TopicCategory = 'performance' | 'goals' | 'feedback' | 'development' | 'personal' | 'other';

export interface MeetingNote {
  id: string;
  meeting_id: string;
  coach_id: string;
  content: string;
  topic_category: TopicCategory;
  is_private: boolean;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export function useMeetingNotes(meetingId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meeting-notes', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as MeetingNote[];
    },
    enabled: !!meetingId && !!user,
  });
}

export function useCreateMeetingNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      meeting_id: string;
      content: string;
      topic_category: TopicCategory;
      is_private?: boolean;
      photo_urls?: string[];
    }) => {
      const { data: note, error } = await supabase
        .from('meeting_notes')
        .insert({
          meeting_id: data.meeting_id,
          coach_id: user!.id,
          content: data.content,
          topic_category: data.topic_category,
          is_private: data.is_private ?? false,
          photo_urls: data.photo_urls || [],
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', variables.meeting_id] });
      toast.success('Note added');
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast.error('Failed to add note');
    },
  });
}

export function useUpdateMeetingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      meeting_id,
      ...updates
    }: {
      id: string;
      meeting_id: string;
      content?: string;
      topic_category?: TopicCategory;
      is_private?: boolean;
      photo_urls?: string[];
    }) => {
      const { error } = await supabase
        .from('meeting_notes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, meeting_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', result.meeting_id] });
      toast.success('Note updated');
    },
    onError: (error) => {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    },
  });
}

export function useDeleteMeetingNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, meeting_id }: { id: string; meeting_id: string }) => {
      const { error } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { meeting_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-notes', result.meeting_id] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });
}
