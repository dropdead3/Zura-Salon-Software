import { useCallback } from 'react';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import { formatCurrency as formatCurrencyUnified } from '@/lib/format';

/**
 * Returns formatters that use the effective org's currency.
 * Use in dashboard/platform components for all monetary display.
 */
export function useFormatCurrency() {
  const { currency } = useOrgDefaults();

  const formatCurrency = useCallback(
    (amount: number, options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }) =>
      formatCurrencyUnified(amount, {
        currency,
        decimals:
          options?.maximumFractionDigits === undefined
            ? 'auto'
            : Math.max(0, options.maximumFractionDigits),
      }),
    [currency]
  );

  const formatCurrencyWhole = useCallback(
    (amount: number) => formatCurrencyUnified(amount, { currency, decimals: 2 }),
    [currency]
  );

  const formatCurrencyCompact = useCallback(
    (amount: number, options?: { noCents?: boolean }) =>
      formatCurrencyUnified(amount, { currency, compact: true, noCents: false }),
    [currency]
  );

  return { formatCurrency, formatCurrencyWhole, formatCurrencyCompact, currency };
}
