import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface RefundFilters {
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  orgSearch?: string;
  status?: string;
  refundType?: string;
}

export interface RefundRecord {
  id: string;
  organization_id: string;
  org_name: string;
  original_item_name: string | null;
  refund_amount: number;
  refund_type: string;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string | null;
  processed_at: string | null;
  original_transaction_date: string;
}

export interface RefundSummary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  avgAmount: number;
}

export function usePlatformRefundHistory(filters: RefundFilters, page: number = 1, pageSize: number = 25) {
  const query = useQuery({
    queryKey: ['platform-refund-history', filters, page, pageSize],
    queryFn: async () => {
      let q = supabase
        .from('refund_records')
        .select('id, organization_id, original_item_name, refund_amount, refund_type, status, reason, notes, created_at, processed_at, original_transaction_date, organizations(name)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
      if (filters.minAmount) q = q.gte('refund_amount', filters.minAmount);
      if (filters.maxAmount) q = q.lte('refund_amount', filters.maxAmount);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.refundType) q = q.eq('refund_type', filters.refundType);

      // Pagination
      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;

      const records: RefundRecord[] = (data ?? []).map((r: any) => ({
        id: r.id,
        organization_id: r.organization_id,
        org_name: r.organizations?.name ?? 'Unknown',
        original_item_name: r.original_item_name,
        refund_amount: r.refund_amount,
        refund_type: r.refund_type,
        status: r.status,
        reason: r.reason,
        notes: r.notes,
        created_at: r.created_at,
        processed_at: r.processed_at,
        original_transaction_date: r.original_transaction_date,
      }));

      // Client-side org name filter (Supabase doesn't support .ilike on joined columns easily)
      const filtered = filters.orgSearch
        ? records.filter((r) => r.org_name.toLowerCase().includes(filters.orgSearch!.toLowerCase()))
        : records;

      return { records: filtered, totalCount: count ?? 0 };
    },
  });

  // Fetch all records (unfiltered by page) for summary stats
  const summaryQuery = useQuery({
    queryKey: ['platform-refund-summary', filters],
    queryFn: async () => {
      let q = supabase
        .from('refund_records')
        .select('refund_amount, status');

      if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
      if (filters.minAmount) q = q.gte('refund_amount', filters.minAmount);
      if (filters.maxAmount) q = q.lte('refund_amount', filters.maxAmount);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.refundType) q = q.eq('refund_type', filters.refundType);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary: RefundSummary = useMemo(() => {
    const rows = summaryQuery.data ?? [];
    const totalCount = rows.length;
    const totalAmount = rows.reduce((s, r) => s + (r.refund_amount ?? 0), 0);
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;
    return { totalCount, totalAmount, pendingCount, avgAmount };
  }, [summaryQuery.data]);

  return {
    records: query.data?.records ?? [],
    totalCount: query.data?.totalCount ?? 0,
    summary,
    isLoading: query.isLoading || summaryQuery.isLoading,
    error: query.error || summaryQuery.error,
    totalPages: Math.ceil((query.data?.totalCount ?? 0) / pageSize),
  };
}
