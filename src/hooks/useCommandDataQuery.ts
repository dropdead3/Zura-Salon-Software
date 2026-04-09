import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { AnalyticsHintType } from '@/components/command-surface/CommandInlineAnalyticsCard';

export interface CommandDataResult {
  value: number;
  label: string;
  breakdown: { label: string; value: string }[];
  isLoading: boolean;
  error: string | null;
}

interface UseCommandDataQueryParams {
  hint: AnalyticsHintType;
  dateFrom?: string;
  dateTo?: string;
}

export function useCommandDataQuery({ hint, dateFrom, dateTo }: UseCommandDataQueryParams): CommandDataResult {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const enabled = !!hint && !!dateFrom && !!dateTo && !!orgId && (hint === 'retail' || hint === 'revenue');

  const { data, isLoading, error } = useQuery({
    queryKey: ['command-data-query', hint, dateFrom, dateTo, orgId],
    queryFn: async () => {
      if (!dateFrom || !dateTo || !orgId) throw new Error('Missing params');

      // Query the union view for detach-safety
      let query = supabase
        .from('v_all_transaction_items' as any)
        .select('total_amount, tax_amount, tip_amount, item_type, quantity')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      if (hint === 'retail') {
        query = query.eq('item_type', 'product');
      }

      const { data: rows, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const items = (rows || []) as { total_amount: number; tax_amount: number; tip_amount: number; item_type: string; quantity: number }[];

      const totalRevenue = items.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
      const totalTax = items.reduce((sum, r) => sum + (Number(r.tax_amount) || 0), 0);
      const totalTips = items.reduce((sum, r) => sum + (Number(r.tip_amount) || 0), 0);
      const txnCount = items.length;

      if (hint === 'retail') {
        return {
          value: totalRevenue,
          label: 'Retail Revenue',
          breakdown: [
            { label: 'Product transactions', value: String(txnCount) },
          ],
        };
      }

      // Revenue: split by service vs product
      const serviceItems = items.filter(r => r.item_type !== 'product');
      const productItems = items.filter(r => r.item_type === 'product');
      const serviceRev = serviceItems.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
      const productRev = productItems.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

      return {
        value: totalRevenue,
        label: 'Total Revenue',
        breakdown: [
          { label: 'Services', value: `$${serviceRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Retail', value: `$${productRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Transactions', value: String(txnCount) },
        ],
      };
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    value: data?.value ?? 0,
    label: data?.label ?? '',
    breakdown: data?.breakdown ?? [],
    isLoading: enabled && isLoading,
    error: error?.message ?? null,
  };
}
