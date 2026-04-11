import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export function useExpansionOpportunities() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['expansion-opportunities', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expansion_opportunities')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('roe_score', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateExpansionOpportunity() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      opportunity_type: string;
      location_id?: string;
      city?: string;
      service_category?: string;
      capital_required: number;
      predicted_annual_lift: number;
      confidence?: string;
      risk_factors?: Record<string, unknown>;
      spi_at_creation?: number;
    }) => {
      const roe = input.capital_required > 0
        ? Math.round((input.predicted_annual_lift / input.capital_required) * 100) / 100
        : 0;
      const monthlyLift = input.predicted_annual_lift / 12;
      const confMultiplier = input.confidence === 'high' ? 1.0 : input.confidence === 'low' ? 1.6 : 1.3;
      const breakEven = monthlyLift > 0
        ? Math.round((input.capital_required / monthlyLift) * confMultiplier * 10) / 10
        : null;

      const { data, error } = await supabase
        .from('expansion_opportunities')
        .insert({
          organization_id: orgId!,
          ...input,
          roe_score: roe,
          break_even_months: breakEven,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expansion-opportunities', orgId] });
      toast.success('Expansion opportunity created');
    },
    onError: (err) => toast.error('Failed: ' + (err as Error).message),
  });
}

export function useUpdateExpansionOpportunity() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('expansion_opportunities')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expansion-opportunities', orgId] });
      toast.success('Opportunity updated');
    },
    onError: (err) => toast.error('Failed: ' + (err as Error).message),
  });
}

export function useExpansionScenarios(opportunityId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['expansion-scenarios', orgId, opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expansion_scenarios')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('opportunity_id', opportunityId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!opportunityId,
  });
}

export function useCreateExpansionScenario() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: {
      opportunity_id: string;
      investment_amount: number;
      projected_monthly_lift: number;
      break_even_months: number;
      confidence: string;
      assumptions: Record<string, unknown>;
      result_summary: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('expansion_scenarios')
        .insert({
          organization_id: orgId!,
          created_by: user?.id,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expansion-scenarios', orgId, vars.opportunity_id] });
      toast.success('Scenario saved');
    },
    onError: (err) => toast.error('Failed: ' + (err as Error).message),
  });
}

export function useSalonPerformanceIndex() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['salon-performance-index', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_performance_index')
        .select('*')
        .eq('organization_id', orgId!)
        .order('spi_score', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
