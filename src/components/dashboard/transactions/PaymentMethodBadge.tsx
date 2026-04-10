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

function resolvePaymentKey(method: string): string {
  const lower = method.toLowerCase();
  if (lower.includes(';') || lower.includes(',') || lower.includes('+')) return 'split';
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return 'card';
  if (lower.includes('cash')) return 'cash';
  if (lower.includes('voucher') || lower.includes('gift')) return 'voucher';
  return 'card';
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
