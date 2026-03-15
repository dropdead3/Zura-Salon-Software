import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSendPaymentSetupLink() {
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase.functions.invoke('send-payment-setup-link', {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; email: string; emailSent: boolean };
    },
    onSuccess: (data) => {
      toast.success(`Payment setup link sent to ${data.email}`);
    },
    onError: (error) => {
      toast.error('Failed to send setup link: ' + error.message);
    },
  });
}
