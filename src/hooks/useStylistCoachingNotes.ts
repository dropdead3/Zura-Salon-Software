import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type CoachingCategory =
  | 'general'
  | 'technical'
  | 'consultation'
  | 'tone'
  | 'recovery'
  | 'recognition';

export interface CoachingNote {
  id: string;
  organization_id: string;
  stylist_user_id: string;
  feedback_response_id: string | null;
  note_text: string;
  category: CoachingCategory;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useStylistCoachingNotes(stylistUserId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-coaching-notes', orgId, stylistUserId ?? 'all'],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<CoachingNote[]> => {
      let q = supabase
        .from('stylist_feedback_coaching_notes')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (stylistUserId) q = q.eq('stylist_user_id', stylistUserId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CoachingNote[];
    },
  });
}

export function useCreateCoachingNote() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: {
      stylist_user_id: string;
      note_text: string;
      category?: CoachingCategory;
      feedback_response_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('stylist_feedback_coaching_notes')
        .insert({
          organization_id: orgId,
          stylist_user_id: input.stylist_user_id,
          note_text: input.note_text.trim(),
          category: input.category ?? 'general',
          feedback_response_id: input.feedback_response_id ?? null,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stylist-coaching-notes'] });
      toast.success('Coaching note logged');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not save note'),
  });
}

export function useAcknowledgeCoachingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('stylist_feedback_coaching_notes')
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stylist-coaching-notes'] });
      toast.success('Acknowledged');
    },
  });
}
