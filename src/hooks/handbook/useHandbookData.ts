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

/**
 * Returns a Map<roleKey, handbook> for role-first dashboard rendering.
 * Only includes handbooks with primary_role set (legacy multi-role handbooks excluded).
 */
export function useHandbooksByRole() {
  const { data: handbooks = [], isLoading } = useHandbooks();
  const byRole = new Map<string, any>();
  for (const h of handbooks as any[]) {
    if (h.primary_role) {
      // 1:1 enforced — last wins if duplicates somehow exist
      byRole.set(h.primary_role, h);
    }
  }
  return { byRole, allHandbooks: handbooks as any[], isLoading };
}

export function useCreateHandbook() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; primaryRole?: string }) => {
      if (!orgId) throw new Error('No organization');
      const { data: handbook, error: hbErr } = await (supabase as any)
        .from(HANDBOOKS)
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description,
          created_by: user?.id,
          primary_role: input.primaryRole || null,
        })
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
      // Seed org setup. If primaryRole provided, lock roles_enabled to it.
      const setupSeed: Record<string, any> = {
        handbook_version_id: version.id,
        organization_id: orgId,
      };
      if (input.primaryRole) {
        setupSeed.roles_enabled = [input.primaryRole];
      }
      await (supabase as any).from(ORG_SETUP).insert(setupSeed);
      return { handbook, version };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['handbooks', orgId] });
      toast.success('Handbook created');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create handbook'),
  });
}

/**
 * Convenience: create a handbook scoped to a single role.
 * Enforces 1:1 — if a handbook for this role already exists, returns it instead.
 */
export function useCreateHandbookForRole() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (input: { primaryRole: string; roleLabel: string }) => {
      if (!orgId) throw new Error('No organization');
      // 1:1 guard — return existing if present
      const { data: existing } = await (supabase as any)
        .from(HANDBOOKS)
        .select('*')
        .eq('organization_id', orgId)
        .eq('primary_role', input.primaryRole)
        .maybeSingle();
      if (existing) return { handbook: existing, version: null, existed: true };

      const { data: handbook, error: hbErr } = await (supabase as any)
        .from(HANDBOOKS)
        .insert({
          organization_id: orgId,
          name: `${input.roleLabel} Handbook`,
          description: `Scoped to ${input.roleLabel}.`,
          created_by: user?.id,
          primary_role: input.primaryRole,
        })
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
      await (supabase as any).from(ORG_SETUP).insert({
        handbook_version_id: version.id,
        organization_id: orgId,
        roles_enabled: [input.primaryRole],
      });
      return { handbook, version, existed: false };
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['handbooks', orgId] });
      if (!res.existed) toast.success('Role handbook created');
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

/**
 * Acknowledgment counts for handbooks linked via legacy_handbook_id.
 * Denominator is role-scoped: counts only active+approved staff whose
 * user_roles include the handbook's primary_role. Falls back to all-staff
 * for legacy multi-role handbooks where primary_role is null.
 *
 * Returns Map<handbookId, { acknowledged, total, role }>.
 */
export function useHandbookAckCounts() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['handbook-ack-counts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: handbooks } = await (supabase as any)
        .from(HANDBOOKS)
        .select('id, legacy_handbook_id, primary_role')
        .eq('organization_id', orgId);

      // Pull active+approved staff with their roles (one query, joined)
      const { data: staff } = await (supabase as any)
        .from('employee_profiles')
        .select('user_id, user_roles(role)')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_approved', true);

      const allStaffCount = (staff || []).length;

      // role -> count of staff with that role
      const roleCounts = new Map<string, number>();
      for (const s of staff || []) {
        const userRoles: string[] = (s.user_roles || []).map((r: any) => r.role);
        for (const r of userRoles) {
          roleCounts.set(r, (roleCounts.get(r) || 0) + 1);
        }
      }

      const legacyIds = (handbooks || [])
        .map((h: any) => h.legacy_handbook_id)
        .filter(Boolean);

      const ackByLegacy = new Map<string, Set<string>>();
      if (legacyIds.length > 0) {
        const { data: acks } = await (supabase as any)
          .from('handbook_acknowledgments')
          .select('handbook_id, user_id')
          .in('handbook_id', legacyIds);
        for (const a of acks || []) {
          if (!ackByLegacy.has(a.handbook_id)) ackByLegacy.set(a.handbook_id, new Set());
          ackByLegacy.get(a.handbook_id)!.add(a.user_id);
        }
      }

      const result = new Map<
        string,
        { acknowledged: number; total: number; role: string | null }
      >();
      for (const h of handbooks || []) {
        const legacy = h.legacy_handbook_id;
        const acked = legacy ? ackByLegacy.get(legacy)?.size || 0 : 0;
        const total = h.primary_role
          ? roleCounts.get(h.primary_role) || 0
          : allStaffCount;
        result.set(h.id, { acknowledged: acked, total, role: h.primary_role });
      }
      return result;
    },
  });
}
