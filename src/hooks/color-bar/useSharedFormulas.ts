/**
 * useSharedFormulas — CRUD operations for formula sharing between stylists.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SharedFormula {
  id: string;
  organization_id: string;
  formula_history_id: string;
  shared_by: string;
  shared_with: string;
  client_id: string;
  notes: string | null;
  created_at: string;
}

export function useSharedFormulasForUser() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['shared-formulas', orgId, user?.id],
    queryFn: async (): Promise<SharedFormula[]> => {
      const { data, error } = await supabase
        .from('shared_formulas')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('shared_with', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SharedFormula[];
    },
    enabled: !!orgId && !!user?.id,
    staleTime: 60_000,
  });
}

export function useShareFormula() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      formulaHistoryId: string;
      sharedWithUserId: string;
      clientId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('shared_formulas')
        .insert({
          organization_id: effectiveOrganization!.id,
          formula_history_id: params.formulaHistoryId,
          shared_by: user!.id,
          shared_with: params.sharedWithUserId,
          client_id: params.clientId,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-formulas'] });
      toast.success('Formula shared successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.info('Formula already shared with this stylist');
      } else {
        toast.error('Failed to share formula: ' + error.message);
      }
    },
  });
}
