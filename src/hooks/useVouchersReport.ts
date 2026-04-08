import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface VoucherEntry {
  id: string;
  code: string;
  voucherType: string;
  value: number;
  valueType: string;
  issuedToName: string;
  isRedeemed: boolean;
  redeemedAt: string | null;
  isActive: boolean;
  expiresAt: string | null;
  issuedAt: string;
}

export interface VoucherSummary {
  entries: VoucherEntry[];
  totalIssued: number;
  totalIssuedValue: number;
  totalRedeemedValue: number;
  totalOutstandingValue: number;
  redeemedCount: number;
  activeCount: number;
  expiredCount: number;
  byType: { type: string; count: number; value: number }[];
}

export function useVouchersReport() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['vouchers-report', orgId],
    queryFn: async (): Promise<VoucherSummary> => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('organization_id', orgId!)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      let totalIssuedValue = 0;
      let totalRedeemedValue = 0;
      let totalOutstandingValue = 0;
      let redeemedCount = 0;
      let activeCount = 0;
      let expiredCount = 0;
      const typeMap = new Map<string, { count: number; value: number }>();

      const entries: VoucherEntry[] = (data || []).map((v: any) => {
        const value = Number(v.value) || 0;
        const isExpired = v.expires_at && new Date(v.expires_at) < now;

        totalIssuedValue += value;
        if (v.is_redeemed) {
          redeemedCount++;
          totalRedeemedValue += value;
        } else if (isExpired) {
          expiredCount++;
        } else if (v.is_active) {
          activeCount++;
          totalOutstandingValue += value;
        }

        const type = v.voucher_type || 'unknown';
        const te = typeMap.get(type) || { count: 0, value: 0 };
        te.count++;
        te.value += value;
        typeMap.set(type, te);

        return {
          id: v.id,
          code: v.code,
          voucherType: v.voucher_type,
          value,
          valueType: v.value_type || 'fixed',
          issuedToName: v.issued_to_name || 'N/A',
          isRedeemed: v.is_redeemed ?? false,
          redeemedAt: v.redeemed_at,
          isActive: (v.is_active ?? true) && !isExpired,
          expiresAt: v.expires_at,
          issuedAt: v.issued_at || v.valid_from,
        };
      });

      const byType = Array.from(typeMap.entries())
        .map(([type, v]) => ({ type, count: v.count, value: v.value }))
        .sort((a, b) => b.value - a.value);

      return {
        entries,
        totalIssued: entries.length,
        totalIssuedValue,
        totalRedeemedValue,
        totalOutstandingValue,
        redeemedCount,
        activeCount,
        expiredCount,
        byType,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
