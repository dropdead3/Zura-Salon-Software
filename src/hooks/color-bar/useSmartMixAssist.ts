/**
 * useSmartMixAssist — React hooks for Smart Mix Assist feature.
 *
 * Provides settings management, formula suggestion fetching,
 * and command mutations for applying/dismissing suggestions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import {
  generateSuggestion,
  type FormulaSuggestion,
  type SuggestionRequest,
} from '@/lib/backroom/services/smart-mix-assist-service';
import {
  executeApplySuggestedFormula,
  executeDismissSuggestedFormula,
  type ApplySuggestedFormulaCommand,
  type DismissSuggestedFormulaCommand,
} from '@/lib/backroom/commands/mixing-commands';
import { buildCommandMeta } from '@/lib/backroom/commands/types';

// ─── Settings ────────────────────────────────────────

export interface SmartMixAssistSettings {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  ratio_lock_enabled: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

export function useSmartMixAssistSettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['smart-mix-assist-settings', orgId],
    queryFn: async (): Promise<SmartMixAssistSettings | null> => {
      const { data, error } = await supabase
        .from('smart_mix_assist_settings' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as SmartMixAssistSettings | null;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpdateSmartMixAssistSettings() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: {
      is_enabled?: boolean;
      ratio_lock_enabled?: boolean;
      acknowledged_by?: string;
      acknowledged_at?: string;
    }) => {
      if (!orgId) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('smart_mix_assist_settings' as any)
        .upsert(
          {
            organization_id: orgId,
            ...params,
          } as any,
          { onConflict: 'organization_id' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-mix-assist-settings', orgId] });
    },
    onError: (error) => {
      toast.error('Failed to update Smart Mix Assist settings: ' + error.message);
    },
  });
}

// ─── Formula Suggestion ─────────────────────────────

export function useFormulaSuggestion(params: {
  organization_id?: string;
  client_id?: string | null;
  staff_id?: string | null;
  service_name?: string | null;
  enabled?: boolean;
}) {
  const { organization_id, client_id, staff_id, service_name, enabled = true } = params;

  return useQuery({
    queryKey: ['formula-suggestion', organization_id, client_id, staff_id, service_name],
    queryFn: async (): Promise<FormulaSuggestion | null> => {
      return generateSuggestion({
        organization_id: organization_id!,
        client_id,
        staff_id,
        service_name,
      });
    },
    enabled: !!organization_id && !!service_name && enabled,
    staleTime: Infinity, // Suggestion doesn't change mid-bowl
    gcTime: 5 * 60_000,
  });
}

// ─── Apply Suggestion Command ───────────────────────

export function useApplySuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      mix_session_id: string;
      bowl_id: string;
      suggestion: FormulaSuggestion;
      client_id?: string;
      staff_id?: string;
      service_type?: string;
    }) => {
      const meta = await buildCommandMeta('ui');
      const cmd: ApplySuggestedFormulaCommand = {
        meta,
        organization_id: params.organization_id,
        mix_session_id: params.mix_session_id,
        bowl_id: params.bowl_id,
        suggestion_source: params.suggestion.source,
        reference_formula_id: params.suggestion.referenceId || undefined,
        formula_data: params.suggestion.lines,
        client_id: params.client_id,
        staff_id: params.staff_id,
        service_type: params.service_type,
      };
      return executeApplySuggestedFormula(cmd);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-session-events', vars.mix_session_id] });
      queryClient.invalidateQueries({ queryKey: ['mix-session-projection', vars.mix_session_id] });
    },
    onError: (error) => {
      toast.error('Failed to apply suggestion: ' + error.message);
    },
  });
}

// ─── Dismiss Suggestion Command ─────────────────────

export function useDismissSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      mix_session_id: string;
      bowl_id: string;
      suggestion_source?: string;
    }) => {
      const meta = await buildCommandMeta('ui');
      const cmd: DismissSuggestedFormulaCommand = {
        meta,
        organization_id: params.organization_id,
        mix_session_id: params.mix_session_id,
        bowl_id: params.bowl_id,
        suggestion_source: params.suggestion_source,
      };
      return executeDismissSuggestedFormula(cmd);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mix-session-events', vars.mix_session_id] });
    },
    onError: (error) => {
      toast.error('Failed to dismiss suggestion: ' + error.message);
    },
  });
}
