/**
 * THEME SWITCHING ENGINE
 *
 * Orchestrates theme transitions with content preservation,
 * snapshot creation, and reversible operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ThemeEntity,
  ThemeBlueprint,
  ThemeMigrationReport,
  MigrationMapping,
  ThemeActivation,
  EMPTY_BLUEPRINT,
} from '@/types/theme-infrastructure';
import type { WebsitePagesConfig } from '@/hooks/useWebsitePages';

// ─── Fetch Current Activation ───────────────────────────────

export function useCurrentActivation(orgId: string | undefined) {
  return useQuery({
    queryKey: ['theme-activation', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_activations')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_current', true)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ThemeActivation | null;
    },
  });
}

// ─── Activation History ─────────────────────────────────────

export function useActivationHistory(orgId: string | undefined) {
  return useQuery({
    queryKey: ['theme-activation-history', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_activations')
        .select('*')
        .eq('organization_id', orgId!)
        .order('activated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as unknown as ThemeActivation[];
    },
  });
}

// ─── Pre-Switch Analysis ────────────────────────────────────

interface SectionInfo {
  type: string;
  pageId: string;
  semanticCategory?: string;
}

export function analyzeThemeSwitch(
  currentSections: SectionInfo[],
  targetBlueprint: ThemeBlueprint,
  sectionTypeMap: Record<string, string> // sectionType -> semanticCategory
): ThemeMigrationReport {
  const mapped: MigrationMapping[] = [];
  const transformed: MigrationMapping[] = [];
  const attention: MigrationMapping[] = [];

  const allowedSet = new Set(targetBlueprint.allowed_section_types);

  for (const section of currentSections) {
    const category = sectionTypeMap[section.type] ?? 'unknown';

    if (allowedSet.has(section.type)) {
      // Direct match — perfectly compatible
      mapped.push({
        sectionType: section.type,
        sourcePageId: section.pageId,
        targetPageId: section.pageId,
        status: 'mapped',
      });
    } else if (allowedSet.size === 0) {
      // No restrictions — treat as mapped
      mapped.push({
        sectionType: section.type,
        sourcePageId: section.pageId,
        targetPageId: section.pageId,
        status: 'mapped',
      });
    } else {
      // Check if another section of same semantic category exists in target
      const sameCategory = targetBlueprint.allowed_section_types.find(
        t => sectionTypeMap[t] === category
      );

      if (sameCategory) {
        transformed.push({
          sectionType: section.type,
          sourcePageId: section.pageId,
          targetPageId: section.pageId,
          status: 'transformed',
          notes: `Will map to "${sameCategory}" (same category: ${category})`,
        });
      } else {
        attention.push({
          sectionType: section.type,
          sourcePageId: section.pageId,
          targetPageId: section.pageId,
          status: 'unmapped',
          notes: `Section type "${section.type}" not supported in target theme`,
        });
      }
    }
  }

  return {
    mapped,
    transformed,
    attention,
    timestamp: new Date().toISOString(),
  };
}

// ─── Execute Theme Switch ───────────────────────────────────

export function useExecuteThemeSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      targetThemeId: string;
      targetThemeVersion: string;
      currentPagesSnapshot: WebsitePagesConfig;
      migrationReport: ThemeMigrationReport;
      userId: string;
    }) => {
      // 1. Mark previous activation as not current
      await supabase
        .from('theme_activations')
        .update({ is_current: false })
        .eq('organization_id', params.organizationId)
        .eq('is_current', true);

      // 2. Create new activation with snapshot
      type Json = import('@/integrations/supabase/types').Json;
      const { data, error } = await supabase
        .from('theme_activations')
        .insert({
          organization_id: params.organizationId,
          theme_id: params.targetThemeId,
          theme_version: params.targetThemeVersion,
          pre_switch_snapshot: params.currentPagesSnapshot as unknown as Json,
          migration_report: params.migrationReport as unknown as Json,
          activated_by: params.userId,
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ThemeActivation;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['theme-activation', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['theme-activation-history', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['site-settings', 'website_active_theme'] });
    },
  });
}

// ─── Revert Theme Switch ────────────────────────────────────

export function useRevertThemeSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      activationId: string;
    }) => {
      // Fetch the activation to get snapshot
      const { data: activation, error: fetchError } = await supabase
        .from('theme_activations')
        .select('*')
        .eq('id', params.activationId)
        .single();

      if (fetchError) throw fetchError;
      if (!activation?.pre_switch_snapshot) {
        throw new Error('No snapshot available for this activation');
      }

      // Mark current as not current
      await supabase
        .from('theme_activations')
        .update({ is_current: false })
        .eq('organization_id', params.organizationId)
        .eq('is_current', true);

      // Find the activation before this one and mark it current
      const { data: previousActivations } = await supabase
        .from('theme_activations')
        .select('*')
        .eq('organization_id', params.organizationId)
        .lt('activated_at', activation.activated_at)
        .order('activated_at', { ascending: false })
        .limit(1);

      if (previousActivations && previousActivations.length > 0) {
        await supabase
          .from('theme_activations')
          .update({ is_current: true })
          .eq('id', previousActivations[0].id);
      }

      return activation.pre_switch_snapshot as unknown as WebsitePagesConfig;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['theme-activation', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['theme-activation-history', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
}
