/**
 * useInventoryLedger — Enhanced stock_movements query with reference_type filtering.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface LedgerEntry {
  id: string;
  organization_id: string;
  product_id: string;
  quantity_change: number;
  quantity_after: number;
  reason: string;
  notes: string | null;
  reference_type: string | null;
  reference_id: string | null;
  location_id: string | null;
  created_by: string | null;
  created_at: string;
}

export function useInventoryLedger(
  productId: string | null,
  filters?: {
    referenceType?: string;
    reason?: string;
    limit?: number;
  }
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const limit = filters?.limit ?? 50;

  return useQuery({
    queryKey: ['inventory-ledger', orgId, productId, filters],
    queryFn: async (): Promise<LedgerEntry[]> => {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('product_id', productId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.referenceType) {
        query = query.eq('reference_type', filters.referenceType);
      }
      if (filters?.reason) {
        query = query.eq('reason', filters.reason);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as LedgerEntry[];
    },
    enabled: !!orgId && !!productId,
    staleTime: 30_000,
  });
}

/**
 * Compute theoretical balance from ledger events over a date range.
 */
export function useTheoreticalBalance(
  productId: string | null,
  dateRange?: { from: string; to: string }
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['theoretical-balance', orgId, productId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('quantity_change, reason')
        .eq('organization_id', orgId!)
        .eq('product_id', productId!);

      if (dateRange) {
        query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to);
      }

      const { data, error } = await query;
      if (error) throw error;

      const movements = (data ?? []) as unknown as Array<{
        quantity_change: number;
        reason: string;
      }>;

      const receipts = movements
        .filter((m) => ['receiving', 'po_received'].includes(m.reason))
        .reduce((s, m) => s + m.quantity_change, 0);

      const transfersIn = movements
        .filter((m) => m.reason === 'transfer_in')
        .reduce((s, m) => s + m.quantity_change, 0);

      const usage = movements
        .filter((m) => ['usage', 'sale'].includes(m.reason))
        .reduce((s, m) => s + Math.abs(m.quantity_change), 0);

      const waste = movements
        .filter((m) => ['waste_adjustment', 'expiration_discard'].includes(m.reason))
        .reduce((s, m) => s + Math.abs(m.quantity_change), 0);

      const transfersOut = movements
        .filter((m) => m.reason === 'transfer_out')
        .reduce((s, m) => s + Math.abs(m.quantity_change), 0);

      const countAdjustments = movements
        .filter((m) => m.reason === 'count_adjustment')
        .reduce((s, m) => s + m.quantity_change, 0);

      return {
        receipts,
        transfersIn,
        usage,
        waste,
        transfersOut,
        countAdjustments,
        netChange: receipts + transfersIn - usage - waste - transfersOut + countAdjustments,
      };
    },
    enabled: !!orgId && !!productId,
    staleTime: 60_000,
  });
}
