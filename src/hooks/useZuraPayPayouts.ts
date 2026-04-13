import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BalanceAmount {
  amount: number;
  currency: string;
  source_types?: Record<string, number>;
}

interface PayoutItem {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'in_transit' | 'canceled' | 'failed';
  arrival_date: number;
  created: number;
  method: string;
  type: string;
  description: string | null;
}

export interface PayoutSchedule {
  interval: 'daily' | 'weekly' | 'monthly' | 'manual';
  weekly_anchor?: string;
  monthly_anchor?: number;
  delay_days?: number;
}

export interface ZuraPayPayoutsData {
  balance: {
    available: BalanceAmount[];
    pending: BalanceAmount[];
  };
  payouts: PayoutItem[];
  payout_schedule: PayoutSchedule | null;
}

export function useZuraPayPayouts(orgId: string | undefined) {
  return useQuery<ZuraPayPayoutsData>({
    queryKey: ['zura-pay-payouts', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('zura-pay-payouts', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as ZuraPayPayoutsData;
    },
    enabled: !!orgId,
    staleTime: 60000,
  });
}
