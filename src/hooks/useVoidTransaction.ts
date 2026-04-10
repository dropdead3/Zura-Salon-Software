import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface VoidParams {
  transactionId: string;
  reason: string;
}

export function useVoidTransaction() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ transactionId, reason }: VoidParams) => {
      if (!orgId) throw new Error('No organization context');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('voided_transactions')
        .insert({
          organization_id: orgId,
          transaction_id: transactionId,
          void_reason: reason,
          voided_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grouped-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction voided successfully');
    },
    onError: (error) => {
      toast.error('Failed to void transaction: ' + error.message);
    },
  });
}
