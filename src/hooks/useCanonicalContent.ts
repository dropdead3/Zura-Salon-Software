/**
 * CANONICAL CONTENT HOOKS
 *
 * CRUD operations for the theme-agnostic canonical_content table.
 * This stores brand-level content that doesn't live in dedicated tables.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CanonicalContent } from '@/types/theme-infrastructure';

// ─── Fetch all canonical content for an org ─────────────────

export function useCanonicalContent(orgId: string | undefined) {
  return useQuery({
    queryKey: ['canonical-content', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canonical_content')
        .select('*')
        .eq('organization_id', orgId!)
        .order('content_key');

      if (error) throw error;
      return (data ?? []) as unknown as CanonicalContent[];
    },
  });
}

// ─── Fetch a single content entry by key ────────────────────

export function useCanonicalContentByKey(orgId: string | undefined, contentKey: string) {
  return useQuery({
    queryKey: ['canonical-content', orgId, contentKey],
    enabled: !!orgId && !!contentKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canonical_content')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('content_key', contentKey)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as CanonicalContent | null;
    },
  });
}

// ─── Upsert a content entry ─────────────────────────────────

export function useUpdateCanonicalContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      content_key: string;
      content_type?: string;
      value: Record<string, unknown>;
      source?: string;
    }) => {
      const row = {
        organization_id: params.organization_id,
        content_key: params.content_key,
        content_type: params.content_type ?? 'text',
        value: params.value as unknown as import('@/integrations/supabase/types').Json,
        source: params.source ?? 'manual',
      };
      const { data, error } = await supabase
        .from('canonical_content')
        .upsert(row, { onConflict: 'organization_id,content_key' })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CanonicalContent;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['canonical-content', vars.organization_id] });
    },
  });
}

// ─── Delete a content entry ─────────────────────────────────

export function useDeleteCanonicalContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { organization_id: string; content_key: string }) => {
      const { error } = await supabase
        .from('canonical_content')
        .delete()
        .eq('organization_id', params.organization_id)
        .eq('content_key', params.content_key);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['canonical-content', vars.organization_id] });
    },
  });
}

// ─── Sync canonical content from business data ──────────────

export function useSyncCanonicalContent() {
  const updateContent = useUpdateCanonicalContent();

  return useMutation({
    mutationFn: async (orgId: string) => {
      // Fetch org details to sync brand content
      const { data: org } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .eq('id', orgId)
        .single();

      if (!org) return;

      const syncs: Promise<unknown>[] = [];

      if (org.name) {
        syncs.push(
          updateContent.mutateAsync({
            organization_id: orgId,
            content_key: 'brand.name',
            content_type: 'text',
            value: { text: org.name },
            source: 'synced',
          })
        );
      }

      if (org.logo_url) {
        syncs.push(
          updateContent.mutateAsync({
            organization_id: orgId,
            content_key: 'brand.logo',
            content_type: 'image',
            value: { url: org.logo_url },
            source: 'synced',
          })
        );
      }

      await Promise.all(syncs);
    },
  });
}
