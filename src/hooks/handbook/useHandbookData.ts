import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const HANDBOOKS = 'org_handbooks' as const;
const VERSIONS = 'org_handbook_versions' as const;
const ORG_SETUP = 'org_handbook_org_setup' as const;
const LIBRARY = 'org_handbook_section_library' as const;
const SECTIONS = 'org_handbook_sections' as const;

export function useHandbooks() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['handbooks', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(HANDBOOKS)
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateHandbook() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!orgId) throw new Error('No organization');
      const { data: handbook, error: hbErr } = await (supabase as any)
        .from(HANDBOOKS)
        .insert({ organization_id: orgId, name: input.name, description: input.description, created_by: user?.id })
        .select()
        .single();
      if (hbErr) throw hbErr;
      const { data: version, error: vErr } = await (supabase as any)
        .from(VERSIONS)
        .insert({ handbook_id: handbook.id, organization_id: orgId, created_by: user?.id })
        .select()
        .single();
      if (vErr) throw vErr;
      await (supabase as any)
        .from(HANDBOOKS)
        .update({ current_version_id: version.id })
        .eq('id', handbook.id);
      await (supabase as any)
        .from(ORG_SETUP)
        .insert({ handbook_version_id: version.id, organization_id: orgId });
      return { handbook, version };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['handbooks', orgId] });
      toast.success('Handbook created');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create handbook'),
  });
}

export function useHandbookWithVersion(handbookId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['handbook', handbookId, orgId],
    enabled: !!orgId && !!handbookId,
    queryFn: async () => {
      const { data: handbook, error: hErr } = await (supabase as any)
        .from(HANDBOOKS)
        .select('*')
        .eq('id', handbookId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (hErr) throw hErr;
      if (!handbook) return null;
      const versionId = handbook.current_version_id;
      const [{ data: version }, { data: setup }, { data: sections }] = await Promise.all([
        (supabase as any).from(VERSIONS).select('*').eq('id', versionId).maybeSingle(),
        (supabase as any).from(ORG_SETUP).select('*').eq('handbook_version_id', versionId).maybeSingle(),
        (supabase as any).from(SECTIONS).select('*').eq('handbook_version_id', versionId).order('display_order'),
      ]);
      return { handbook, version, setup, sections: sections || [] };
    },
  });
}

export function useSectionLibrary() {
  return useQuery({
    queryKey: ['handbook-section-library'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(LIBRARY)
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrgSetup(versionId?: string) {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!versionId) throw new Error('No version');
      const { error } = await (supabase as any)
        .from(ORG_SETUP)
        .update(patch)
        .eq('handbook_version_id', versionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['handbook'] }),
  });
}

export function useUpdateVersion(versionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!versionId) throw new Error('No version');
      const { error } = await (supabase as any)
        .from(VERSIONS)
        .update(patch)
        .eq('id', versionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['handbook'] }),
  });
}

export function useUpsertSelectedSections(versionId?: string) {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (libraryEntries: any[]) => {
      if (!versionId || !orgId) throw new Error('No version');
      // Delete existing then insert (simple, atomic enough for small counts)
      await (supabase as any).from(SECTIONS).delete().eq('handbook_version_id', versionId);
      if (libraryEntries.length === 0) return;
      const rows = libraryEntries.map((entry, idx) => ({
        handbook_version_id: versionId,
        organization_id: orgId,
        library_section_key: entry.key,
        title: entry.title,
        display_order: entry.display_order ?? idx * 10,
        applies_to: {
          employment_types: entry.default_employment_types || [],
          roles: entry.default_roles || [],
          locations: [],
        },
      }));
      const { error } = await (supabase as any).from(SECTIONS).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['handbook'] });
      toast.success('Sections saved');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save sections'),
  });
}
