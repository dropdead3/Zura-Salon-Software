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
      if (data?.cooldown) {
        const err = new Error(data.error) as any;
        err.cooldown = true;
        err.last_sent_at = data.last_sent_at;
        throw err;
      }
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; email: string; emailSent: boolean };
    },
    onSuccess: (data) => {
      toast.success(`Payment setup link sent to ${data.email}`);
    },
    onError: (error: any) => {
      if (error.cooldown) {
        toast.info('Setup link was sent recently — please wait before sending again.');
      } else {
        toast.error('Failed to send setup link: ' + error.message);
      }
    },
  });
}
