import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface InvoiceInfo {
  id: string;
  number: string | null;
  date: string | null;
  amount: number;
  status: string | null;
  pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
}

interface PaymentInfoResponse {
  payment_method: PaymentMethodInfo | null;
  invoices: InvoiceInfo[];
}

export function useOrgPaymentInfo(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-payment-info', organizationId],
    queryFn: async (): Promise<PaymentInfoResponse> => {
      const { data, error } = await supabase.functions.invoke('org-payment-info', {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      return data as unknown as PaymentInfoResponse;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase.functions.invoke('org-billing-portal', {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
  });
}
