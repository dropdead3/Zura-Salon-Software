import { useCallback } from 'react';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import {
  formatCurrency as formatCurrencyUnified,
  formatCurrencyRounded as formatCurrencyRoundedUnified,
} from '@/lib/format';

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

  /**
   * @deprecated Misnomer — emits 2 decimal places, not whole dollars.
   * Use `formatCurrencyTwoDecimal` for the same behavior with a clearer name,
   * or `formatCurrencyRounded` if you actually want whole-dollar output.
   */
  const formatCurrencyWhole = useCallback(
    (amount: number) => formatCurrencyUnified(amount, { currency, decimals: 2 }),
    [currency]
  );

  /** Two decimal places (e.g. `$583.00`). For invoices, payroll, transaction detail. */
  const formatCurrencyTwoDecimal = useCallback(
    (amount: number) => formatCurrencyUnified(amount, { currency, decimals: 2 }),
    [currency]
  );

  /** Whole dollars rounded (e.g. `$583`). For dashboards, KPIs, ranking cards. */
  const formatCurrencyRounded = useCallback(
    (amount: number) => formatCurrencyRoundedUnified(amount, { currency }),
    [currency]
  );

  const formatCurrencyCompact = useCallback(
    (amount: number) =>
      formatCurrencyUnified(amount, { currency, compact: true, noCents: false }),
    [currency]
  );

  return {
    formatCurrency,
    formatCurrencyWhole,
    formatCurrencyTwoDecimal,
    formatCurrencyRounded,
    formatCurrencyCompact,
    currency,
  };
}
