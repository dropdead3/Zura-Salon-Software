import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';

export type RevenueMode = 'inclusive' | 'exclusive';

interface RevenueDisplaySettings {
  [key: string]: unknown;
  mode: RevenueMode;
}

interface RevenueDisplayContextValue {
  revenueMode: RevenueMode;
  toggleRevenueMode: () => void;
  setRevenueMode: (mode: RevenueMode) => void;
  /** Subtract tax when mode is 'exclusive', otherwise pass through */
  adjustRevenue: (grossAmount: number, taxAmount: number) => number;
  /** Label suffix for revenue displays */
  taxLabel: string;
  isLoading: boolean;
}

const RevenueDisplayContext = createContext<RevenueDisplayContextValue | undefined>(undefined);

export function RevenueDisplayProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useSiteSettings<RevenueDisplaySettings>('revenue_display_mode');
  const updateSetting = useUpdateSiteSetting<RevenueDisplaySettings>();

  const revenueMode: RevenueMode = (settings?.mode) || 'inclusive';

  const setRevenueMode = useCallback((mode: RevenueMode) => {
    updateSetting.mutate({ key: 'revenue_display_mode', value: { mode } });
  }, [updateSetting]);

  const toggleRevenueMode = useCallback(() => {
    setRevenueMode(revenueMode === 'inclusive' ? 'exclusive' : 'inclusive');
  }, [revenueMode, setRevenueMode]);

  const adjustRevenue = useCallback((grossAmount: number, taxAmount: number) => {
    if (revenueMode === 'exclusive') {
      return grossAmount - taxAmount;
    }
    return grossAmount;
  }, [revenueMode]);

  const taxLabel = revenueMode === 'exclusive' ? 'Excl. Tax' : 'Incl. Tax';

  const value = useMemo<RevenueDisplayContextValue>(() => ({
    revenueMode,
    toggleRevenueMode,
    setRevenueMode,
    adjustRevenue,
    taxLabel,
    isLoading,
  }), [revenueMode, toggleRevenueMode, setRevenueMode, adjustRevenue, taxLabel, isLoading]);

  return (
    <RevenueDisplayContext.Provider value={value}>
      {children}
    </RevenueDisplayContext.Provider>
  );
}

export function useRevenueDisplay() {
  const context = useContext(RevenueDisplayContext);
  if (!context) {
    // Graceful fallback — if used outside provider, default to inclusive
    return {
      revenueMode: 'inclusive' as RevenueMode,
      toggleRevenueMode: () => {},
      setRevenueMode: () => {},
      adjustRevenue: (gross: number, _tax: number) => gross,
      taxLabel: 'Incl. Tax',
      isLoading: false,
    };
  }
  return context;
}
