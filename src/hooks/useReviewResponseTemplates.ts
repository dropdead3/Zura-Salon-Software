import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type TemplateTone = 'warm' | 'professional' | 'apologetic' | 'celebratory' | 'concise';
export type TemplateAppliesTo = 'all' | 'positive' | 'neutral' | 'negative';

export interface ReviewResponseTemplate {
  id: string;
  organization_id: string;
  name: string;
  body: string;
  tone: TemplateTone;
  applies_to: TemplateAppliesTo;
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export function useReviewResponseTemplates() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['review-response-templates', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<ReviewResponseTemplate[]> => {
      const { data, error } = await supabase
        .from('review_response_templates')
        .select('*')
        .eq('organization_id', orgId!)
        .order('use_count', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewResponseTemplate[];
    },
  });
}

export function useUpsertReviewResponseTemplate() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: Partial<ReviewResponseTemplate> & { name: string; body: string }) => {
      if (!orgId) throw new Error('No organization');
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        id: input.id,
        organization_id: orgId,
        name: input.name.trim(),
        body: input.body,
        tone: input.tone ?? 'warm',
        applies_to: input.applies_to ?? 'all',
        is_active: input.is_active ?? true,
        created_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from('review_response_templates')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-response-templates'] });
      toast.success('Template saved');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not save template'),
  });
}

export function useDeleteReviewResponseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('review_response_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-response-templates'] });
      toast.success('Template deleted');
    },
  });
}

export function useIncrementTemplateUse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch current then update — small table, low contention
      const { data, error } = await supabase
        .from('review_response_templates')
        .select('use_count')
        .eq('id', id)
        .single();
      if (error) throw error;
      const next = (data?.use_count ?? 0) + 1;
      const { error: updErr } = await supabase
        .from('review_response_templates')
        .update({ use_count: next })
        .eq('id', id);
      if (updErr) throw updErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review-response-templates'] }),
  });
}
