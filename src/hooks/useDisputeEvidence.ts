import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubmitEvidenceParams {
  dispute_id: string;
  organization_id: string;
  cancellation_policy_disclosure?: string;
  cancellation_rebuttal?: string;
  uncategorized_text?: string;
  submit?: boolean;
}

export function useSubmitDisputeEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitEvidenceParams) => {
      const { data, error } = await supabase.functions.invoke('submit-dispute-evidence', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute-active-count'] });
      toast.success('Evidence submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit evidence', { description: error.message });
    },
  });
}
