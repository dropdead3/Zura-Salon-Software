import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote, ArrowLeftRight, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodBadgeProps {
  method: string | null;
  className?: string;
}

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  card: CreditCard,
  credit: CreditCard,
  debit: CreditCard,
  cash: Banknote,
  split: ArrowLeftRight,
  voucher: Ticket,
  gift: Ticket,
};

const PAYMENT_STYLES: Record<string, string> = {
  card: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-700',
  credit: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-700',
  cash: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700',
  split: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-700',
  voucher: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700',
  gift: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700',
};

/** Classify a single payment string segment into a base type */
function classifySegment(segment: string): string {
  const s = segment.trim().toLowerCase();
  if (s.includes('cash')) return 'cash';
  if (s.includes('card') || s.includes('credit') || s.includes('debit')) return 'card';
  if (s.includes('voucher') || s.includes('gift')) return 'voucher';
  return 'card'; // default fallback
}

export function resolvePaymentKey(method: string): string {
  const lower = method.toLowerCase();
  // Check for multi-part separator
  const separator = lower.includes(';') ? ';' : lower.includes(',') ? ',' : lower.includes('+') ? '+' : null;
  if (!separator) return classifySegment(method);

  // Multi-part: classify each segment
  const parts = method.split(separator);
  const types = new Set(parts.map(classifySegment));
  // If all segments resolve to the same type, use that type (e.g. Credit;Credit → card)
  if (types.size === 1) return [...types][0];
  return 'split';
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  if (!method) {
    return (
      <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5 py-0', className)}>
        —
      </Badge>
    );
  }

  const key = resolvePaymentKey(method);
  const Icon = PAYMENT_ICONS[key] || CreditCard;
  const style = PAYMENT_STYLES[key] || '';

  // For split, show abbreviated
  const label = key === 'split' ? 'Split' : method.length > 12 ? method.slice(0, 10) + '…' : method;

  return (
    <Badge variant="outline" className={cn('gap-1 text-[10px] px-1.5 py-0 capitalize', style, className)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
