/**
 * Tenant-scoped FAQ items (website_faq_items).
 *
 * Question/answer items rendered by the public FAQSection. All items are
 * organization-scoped via RLS; public consumers see only `enabled = true`
 * rows. Editor mutations are admin-only at the policy level.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { toast } from 'sonner';

export interface FAQItem {
  id: string;
  organization_id: string;
  question: string;
  answer: string;
  category: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const STALE_TIME_MS = 30_000;

/** All FAQ items for the org (editor view — includes disabled rows). */
export function useFAQItems(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);

  return useQuery({
    queryKey: ['website_faq_items', orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_faq_items')
        .select('*')
        .eq('organization_id', orgId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FAQItem[];
    },
  });
}

/** Public consumer — only enabled rows, scoped to the resolved org. */
export function useVisibleFAQItems(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);

  return useQuery({
    queryKey: ['website_faq_items', 'visible', orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_faq_items')
        .select('id, question, answer, category, sort_order')
        .eq('organization_id', orgId!)
        .eq('enabled', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pick<FAQItem, 'id' | 'question' | 'answer' | 'category' | 'sort_order'>[];
    },
  });
}

function useInvalidateFAQ() {
  const qc = useQueryClient();
  const orgId = useSettingsOrgId();
  return () => {
    qc.invalidateQueries({ queryKey: ['website_faq_items', orgId] });
    qc.invalidateQueries({ queryKey: ['website_faq_items', 'visible', orgId] });
  };
}

export function useCreateFAQItem() {
  const orgId = useSettingsOrgId();
  const invalidate = useInvalidateFAQ();

  return useMutation({
    mutationFn: async (input: Pick<FAQItem, 'question' | 'answer'> & Partial<Pick<FAQItem, 'category' | 'sort_order' | 'enabled'>>) => {
      if (!orgId) throw new Error('No organization context');
      const { data, error } = await supabase
        .from('website_faq_items')
        .insert({
          organization_id: orgId,
          question: input.question,
          answer: input.answer,
          category: input.category ?? null,
          sort_order: input.sort_order ?? 0,
          enabled: input.enabled ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FAQItem;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to add FAQ: ' + e.message),
  });
}

export function useUpdateFAQItem() {
  const invalidate = useInvalidateFAQ();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FAQItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('website_faq_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FAQItem;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to update FAQ: ' + e.message),
  });
}

export function useDeleteFAQItem() {
  const invalidate = useInvalidateFAQ();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('website_faq_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to delete FAQ: ' + e.message),
  });
}

export function useReorderFAQItems() {
  const invalidate = useInvalidateFAQ();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('website_faq_items').update({ sort_order: index }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error('Failed to reorder');
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error('Failed to reorder: ' + e.message),
  });
}
