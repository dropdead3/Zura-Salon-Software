import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrgStripeMapping {
  orgId: string;
  stripeCustomerId: string;
}

export interface PaymentMethodInfo {
  brand: string;
  last4: string;
}

export function useBatchPaymentMethods(mappings: OrgStripeMapping[]) {
  const customerIds = mappings.map((m) => m.stripeCustomerId).filter(Boolean);

  const query = useQuery({
    queryKey: ['batch-payment-methods', customerIds.sort().join(',')],
    queryFn: async (): Promise<Map<string, PaymentMethodInfo | null>> => {
      const { data, error } = await supabase.functions.invoke('batch-payment-methods', {
        body: { stripe_customer_ids: customerIds },
      });

      if (error) throw error;

      const pmMap = (data?.payment_methods ?? {}) as Record<string, PaymentMethodInfo | null>;

      // Build orgId → PaymentMethodInfo map
      const result = new Map<string, PaymentMethodInfo | null>();
      for (const mapping of mappings) {
        if (mapping.stripeCustomerId && pmMap[mapping.stripeCustomerId] !== undefined) {
          result.set(mapping.orgId, pmMap[mapping.stripeCustomerId]);
        }
      }
      return result;
    },
    enabled: customerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    paymentMethods: query.data ?? new Map<string, PaymentMethodInfo | null>(),
    isLoading: query.isLoading,
  };
}
