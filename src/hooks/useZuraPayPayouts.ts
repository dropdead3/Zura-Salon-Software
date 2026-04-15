import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface BankAccountInfo {
  bank_name: string | null;
  last4: string | null;
  routing_last4: string | null;
  currency: string | null;
  status: 'new' | 'verified' | 'errored';
}

export interface ZuraPayPayoutsData {
  balance: {
    available: BalanceAmount[];
    pending: BalanceAmount[];
  };
  payouts: PayoutItem[];
  has_more?: boolean;
  payout_schedule: PayoutSchedule | null;
  bank_account: BankAccountInfo | null;
}

export function useZuraPayPayouts(orgId: string | undefined, locationId?: string | null) {
  return useQuery<ZuraPayPayoutsData>({
    queryKey: ['zura-pay-payouts', orgId, locationId],
    queryFn: async () => {
      const body: Record<string, unknown> = { organization_id: orgId };
      if (locationId) body.location_id = locationId;
      const { data, error } = await supabase.functions.invoke('zura-pay-payouts', {
        body,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as unknown as ZuraPayPayoutsData;
    },
    enabled: !!orgId,
    staleTime: 60000,
  });
}

export function useLoadMorePayouts(orgId: string | undefined, locationId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (startingAfter: string) => {
      const body: Record<string, unknown> = {
        organization_id: orgId,
        starting_after: startingAfter,
      };
      if (locationId) body.location_id = locationId;
      const { data, error } = await supabase.functions.invoke('zura-pay-payouts', {
        body,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as unknown as ZuraPayPayoutsData;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData<ZuraPayPayoutsData>(
        ['zura-pay-payouts', orgId, locationId],
        (old) => {
          if (!old) return newData;
          return {
            ...old,
            payouts: [...old.payouts, ...newData.payouts],
            has_more: newData.has_more,
          };
        }
      );
    },
    onError: (err: Error) => {
      toast.error('Failed to load more payouts', { description: err.message });
    },
  });
}

export function useUpdatePayoutSchedule(orgId: string | undefined, locationId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Partial<PayoutSchedule>) => {
      const body: Record<string, unknown> = {
        organization_id: orgId,
        action: 'update_schedule',
        schedule,
      };
      if (locationId) body.location_id = locationId;
      const { data, error } = await supabase.functions.invoke('zura-pay-payouts', {
        body,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Payout schedule updated');
      queryClient.invalidateQueries({ queryKey: ['zura-pay-payouts', orgId, locationId] });
    },
    onError: (err: Error) => {
      toast.error('Failed to update schedule', { description: err.message });
    },
  });
}
