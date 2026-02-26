import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useSoundSettings } from '@/contexts/SoundSettingsContext';
import { useChaChingHistorySafe } from '@/hooks/useChaChingHistory';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { ChaChingToast } from '@/components/dashboard/ChaChingToast';
import { format } from 'date-fns';

/**
 * Singleton hook that detects revenue increases from the today-actual-revenue
 * query cache and fires cha-ching notifications exactly once.
 * Mount this in DashboardLayout (inside ChaChingHistoryProvider).
 */
export function useChaChingDetector() {
  const queryClient = useQueryClient();
  const { playChaChing } = useNotificationSound();
  const { chaChingEnabled } = useSoundSettings();
  const chaChingHistory = useChaChingHistorySafe();
  const { data: profile } = useEmployeeProfile();
  const isEligible = profile?.is_primary_owner || profile?.is_super_admin;
  const prevRevenueRef = useRef<number | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    // Subscribe to query cache changes for today-actual-revenue
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;

      const key = event.query.queryKey;
      if (!Array.isArray(key) || key[0] !== 'today-actual-revenue' || key[1] !== today) return;

      const data = event.query.state.data as
        | { totalRevenue: number; hasData: boolean }
        | undefined;
      if (!data) return;

      const currentRevenue = data.totalRevenue ?? 0;
      const hasData = data.hasData ?? false;

      if (prevRevenueRef.current === null) {
        prevRevenueRef.current = currentRevenue;
        return;
      }

      if (isEligible && chaChingEnabled && hasData && currentRevenue > prevRevenueRef.current) {
        const delta = currentRevenue - prevRevenueRef.current;
        chaChingHistory?.addNotification(delta);
        toast.custom((t) => <ChaChingToast amount={delta} toastId={t} />, {
          duration: 3000,
        });
        playChaChing();
      }

      prevRevenueRef.current = currentRevenue;
    });

    return unsubscribe;
  }, [queryClient, today, chaChingEnabled, isEligible, playChaChing, chaChingHistory]);
}
