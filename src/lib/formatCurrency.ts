/**
 * Legacy currency helpers.
 *
 * Kept for backwards compatibility.
 * New work should import `formatCurrency` / `formatCurrencyRounded` from `src/lib/format.ts`.
 */

import {
  formatCurrency as formatCurrencyUnified,
  formatCurrencyRounded as formatCurrencyRoundedUnified,
} from '@/lib/format';

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
 * @deprecated Misnomer — emits 2 decimal places, not whole dollars.
 * Use `formatCurrencyTwoDecimal` for the same behavior with a clearer name,
 * or `formatCurrencyRounded` if you actually want whole-dollar output (e.g. `$583`).
 */
export function formatCurrencyWhole(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  return formatCurrencyUnified(amount, { currency, decimals: 2 });
}

/**
 * Format a number with two decimal places (e.g. `$583.00`).
 * Use for invoices, transaction detail, payroll line items — anywhere cents matter.
 */
export function formatCurrencyTwoDecimal(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  return formatCurrencyUnified(amount, { currency, decimals: 2 });
}

/**
 * Format a number rounded to the nearest whole unit of currency (e.g. `$583`).
 * Use for dashboards, KPIs, and ranking cards where pennies are noise.
 */
export function formatCurrencyRounded(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  return formatCurrencyRoundedUnified(amount, { currency });
}
