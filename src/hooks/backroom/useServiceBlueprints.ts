/**
 * useServiceBlueprints — CRUD hooks for Service Blueprint management.
 *
 * Provides ordered step fetching, upsert, delete, and batch reorder.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { BlueprintStep, BlueprintStepType, StepMetadata } from '@/lib/backroom/blueprint-engine';

// ─── Query: Ordered steps for one service ───────────

export function useServiceBlueprint(serviceId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-blueprint', orgId, serviceId],
    queryFn: async (): Promise<BlueprintStep[]> => {
      const { data, error } = await supabase
        .from('service_blueprints' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .eq('service_id', serviceId!)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data as unknown as BlueprintStep[]) ?? [];
    },
    enabled: !!orgId && !!serviceId,
    staleTime: 2 * 60_000,
  });
}

// ─── Mutation: Upsert a step ────────────────────────

export function useUpsertBlueprintStep() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      service_id: string;
      position: number;
      step_type: BlueprintStepType;
      title: string;
      description?: string | null;
      metadata?: StepMetadata;
    }) => {
      if (!orgId) throw new Error('No organization selected');

      const payload: any = {
        organization_id: orgId,
        service_id: params.service_id,
        position: params.position,
        step_type: params.step_type,
        title: params.title,
        description: params.description ?? null,
        metadata: params.metadata ?? {},
      };

      if (params.id) {
        const { data, error } = await supabase
          .from('service_blueprints' as any)
          .update(payload)
          .eq('id', params.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('service_blueprints' as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['service-blueprint', orgId, vars.service_id] });
      toast.success(vars.id ? 'Step updated' : 'Step added');
    },
    onError: (error) => {
      toast.error('Failed to save blueprint step: ' + error.message);
    },
  });
}

// ─── Mutation: Delete a step ────────────────────────

export function useDeleteBlueprintStep() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: { id: string; service_id: string }) => {
      const { error } = await supabase
        .from('service_blueprints' as any)
        .delete()
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['service-blueprint', orgId, vars.service_id] });
      toast.success('Step removed');
    },
    onError: (error) => {
      toast.error('Failed to remove step: ' + error.message);
    },
  });
}

// ─── Mutation: Reorder steps (batch position update) ─

export function useReorderBlueprintSteps() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: { service_id: string; steps: { id: string; position: number }[] }) => {
      // Delete all existing steps and re-insert with new positions
      // This avoids unique constraint conflicts during reorder
      const updates = params.steps.map((step) =>
        supabase
          .from('service_blueprints' as any)
          .update({ position: step.position } as any)
          .eq('id', step.id)
      );

      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['service-blueprint', orgId, vars.service_id] });
    },
    onError: (error) => {
      toast.error('Failed to reorder steps: ' + error.message);
    },
  });
}
