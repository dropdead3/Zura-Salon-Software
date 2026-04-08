import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface GiftCardEntry {
  id: string;
  code: string;
  initialAmount: number;
  currentBalance: number;
  purchaserName: string;
  recipientName: string;
  cardType: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface GiftCardSummary {
  entries: GiftCardEntry[];
  totalIssued: number;
  totalIssuedValue: number;
  totalOutstandingBalance: number;
  totalRedeemedValue: number;
  activeCount: number;
  expiredCount: number;
  fullyRedeemedCount: number;
}

export function useGiftCardsReport() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['gift-cards-report', orgId],
    queryFn: async (): Promise<GiftCardSummary> => {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      let totalIssuedValue = 0;
      let totalOutstandingBalance = 0;
      let totalRedeemedValue = 0;
      let activeCount = 0;
      let expiredCount = 0;
      let fullyRedeemedCount = 0;

      const entries: GiftCardEntry[] = (data || []).map((gc: any) => {
        const initial = Number(gc.initial_amount) || 0;
        const balance = Number(gc.current_balance) || 0;
        const isExpired = gc.expires_at && new Date(gc.expires_at) < now;
        const isFullyRedeemed = balance === 0 && initial > 0;

        totalIssuedValue += initial;
        totalOutstandingBalance += balance;
        totalRedeemedValue += initial - balance;

        if (isFullyRedeemed) fullyRedeemedCount++;
        else if (isExpired) expiredCount++;
        else if (gc.is_active) activeCount++;

        return {
          id: gc.id,
          code: gc.code,
          initialAmount: initial,
          currentBalance: balance,
          purchaserName: gc.purchaser_name || 'N/A',
          recipientName: gc.recipient_name || 'N/A',
          cardType: gc.card_type || 'standard',
          isActive: gc.is_active && !isExpired,
          expiresAt: gc.expires_at,
          createdAt: gc.created_at,
        };
      });

      return {
        entries,
        totalIssued: entries.length,
        totalIssuedValue,
        totalOutstandingBalance,
        totalRedeemedValue,
        activeCount,
        expiredCount,
        fullyRedeemedCount,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
