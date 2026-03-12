import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';

export interface ClientFormula {
  id: string;
  organization_id: string;
  client_id: string | null;
  appointment_id: string | null;
  appointment_service_id: string | null;
  mix_session_id: string | null;
  service_name: string | null;
  formula_type: 'actual' | 'refined';
  formula_data: FormulaLine[];
  staff_id: string | null;
  staff_name: string | null;
  notes: string | null;
  version_number: number;
  created_at: string;
}

export function useClientFormulaHistory(clientId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['client-formula-history', orgId, clientId],
    queryFn: async (): Promise<ClientFormula[]> => {
      const { data, error } = await supabase
        .from('client_formula_history')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ClientFormula[];
    },
    enabled: !!orgId && !!clientId,
    staleTime: 60_000,
  });
}

export function useSaveFormulaHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      client_id: string;
      appointment_id?: string;
      appointment_service_id?: string;
      mix_session_id?: string;
      service_name?: string;
      formula_type: 'actual' | 'refined';
      formula_data: FormulaLine[];
      staff_id?: string;
      staff_name?: string;
      notes?: string;
    }) => {
      // Determine version number
      const { count } = await supabase
        .from('client_formula_history')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', params.organization_id)
        .eq('client_id', params.client_id)
        .eq('formula_type', params.formula_type);

      const versionNumber = (count ?? 0) + 1;

      const { data, error } = await supabase
        .from('client_formula_history')
        .insert({
          organization_id: params.organization_id,
          client_id: params.client_id,
          appointment_id: params.appointment_id || null,
          appointment_service_id: params.appointment_service_id || null,
          mix_session_id: params.mix_session_id || null,
          service_name: params.service_name || null,
          formula_type: params.formula_type,
          formula_data: params.formula_data as unknown as Record<string, unknown>[],
          staff_id: params.staff_id || null,
          staff_name: params.staff_name || null,
          notes: params.notes || null,
          version_number: versionNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ClientFormula;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-formula-history', vars.organization_id, vars.client_id] });
    },
    onError: (error) => {
      toast.error('Failed to save formula: ' + error.message);
    },
  });
}
