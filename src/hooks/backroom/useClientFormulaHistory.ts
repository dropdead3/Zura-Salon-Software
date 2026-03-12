import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { saveFormula } from '@/lib/backroom/services/formula-service';
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

/**
 * Thin wrapper — delegates to FormulaService.saveFormula().
 */
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
      return saveFormula(params);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['client-formula-history', vars.organization_id, vars.client_id] });
    },
    onError: (error) => {
      toast.error('Failed to save formula: ' + error.message);
    },
  });
}
