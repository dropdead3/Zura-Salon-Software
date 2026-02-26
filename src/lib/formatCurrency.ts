/**
 * Legacy currency helpers.
 *
 * Kept for backwards compatibility.
 * New work should import `formatCurrency` from `src/lib/format.ts`.
 */

import { formatCurrency as formatCurrencyUnified } from '@/lib/format';

const DEFAULT_CURRENCY = 'USD';

/**
 * Format a number as money in the given currency.
 */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  const decimals =
    options?.maximumFractionDigits === undefined
      ? 'auto'
      : Math.max(0, options.maximumFractionDigits);
  return formatCurrencyUnified(amount, {
    currency,
    decimals,
    ...(options?.minimumFractionDigits !== undefined
      ? { decimals: Math.max(0, options.minimumFractionDigits) }
      : null),
  });
}

/**
 * Format a number as money with zero decimal places (e.g. for whole-dollar display).
 */
export function formatCurrencyWhole(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  return formatCurrencyUnified(amount, { currency, decimals: 2 });
}
