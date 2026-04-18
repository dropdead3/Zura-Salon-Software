import { format, formatDistanceToNow } from 'date-fns';

type CurrencyDecimals = 'auto' | number;

/** Locale hints per currency so Intl uses correct symbol and grouping (e.g. EUR in de-DE uses € and 1.234,56). */
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  USD: 'en-US',
  CAD: 'en-CA',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  NZD: 'en-NZ',
  MXN: 'es-MX',
  BRL: 'pt-BR',
};

function getLocaleForCurrency(currency: string): string {
  return CURRENCY_LOCALE_MAP[currency] ?? 'en-US';
}

export type FormatCurrencyOptions = {
  /**
   * Defaults to 'USD'.
   */
  currency?: string;
  /**
   * Defaults to a locale appropriate for the provided currency.
   */
  locale?: string;
  /**
   * - 'auto' (default): use Intl defaults (typically 2 decimals)
   * - number: fixed decimals
   */
  decimals?: CurrencyDecimals;
  /**
   * Compact notation: $1.2K / $3.4M
   */
  compact?: boolean;
  /**
   * Force 0 decimals (useful for dashboards where cents are noise).
   * Overrides `decimals`.
   */
  noCents?: boolean;
  /**
   * Pass-through to Intl sign formatting.
   */
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
};

export function formatCurrency(
  value: number | null | undefined,
  {
    currency = 'USD',
    locale,
    decimals = 'auto',
    compact = false,
    noCents = false,
    signDisplay,
  }: FormatCurrencyOptions = {}
): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '—';

  const resolvedLocale = locale ?? getLocaleForCurrency(currency);

  const minimumFractionDigits =
    noCents ? 0 : decimals === 'auto' ? undefined : Math.max(0, decimals);
  const maximumFractionDigits =
    noCents ? 0 : decimals === 'auto' ? undefined : Math.max(0, decimals);

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    ...(compact ? { notation: 'compact', compactDisplay: 'short' } : null),
    ...(minimumFractionDigits === undefined ? null : { minimumFractionDigits }),
    ...(maximumFractionDigits === undefined ? null : { maximumFractionDigits }),
    ...(signDisplay ? { signDisplay } : null),
  }).format(num);
}

/**
 * Format a number rounded to the nearest whole unit of currency (no cents).
 * Use for dashboards, KPIs, and ranking cards where pennies are noise.
 *
 *   formatCurrencyRounded(582.73)  // "$583"
 */
export function formatCurrencyRounded(
  value: number | null | undefined,
  options: Omit<FormatCurrencyOptions, 'decimals' | 'noCents'> = {}
): string {
  return formatCurrency(value, { ...options, noCents: true });
}

function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * "January 15, 2026"
 */
export function formatDate(input: Date | string | number | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return format(d, 'MMMM d, yyyy');
}

/**
 * "Jan 15"
 */
export function formatDateShort(input: Date | string | number | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return format(d, 'MMM d');
}

/**
 * "2 hours ago"
 */
export function formatRelativeTime(input: Date | string | number | null | undefined): string {
  const d = toDate(input);
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

