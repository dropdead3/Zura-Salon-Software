import { MessageCircle } from 'lucide-react';
import { useClientCallbacks } from '@/hooks/useClientCallbacks';
import { cn } from '@/lib/utils';

interface CallbackChipProps {
  clientId: string | null | undefined;
  className?: string;
  /** Truncate the prompt at this many characters. */
  maxLength?: number;
}

/**
 * Renders a single subtle yellow chip on appointment cards when a client has
 * active (unacknowledged) callbacks. Shows the first prompt; if multiple,
 * shows a count instead.
 *
 * Returns null if no active callbacks — honors alert-fatigue doctrine.
 */
export function CallbackChip({ clientId, className, maxLength = 40 }: CallbackChipProps) {
  const { data: callbacks = [] } = useClientCallbacks(clientId);

  if (callbacks.length === 0) return null;

  const display =
    callbacks.length === 1
      ? truncate(callbacks[0].prompt, maxLength)
      : `${callbacks.length} follow-ups`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight',
        'bg-amber-100/70 text-amber-900 border border-amber-200/80',
        'dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/50',
        className,
      )}
      title={callbacks.map((c) => c.prompt).join('\n')}
    >
      <MessageCircle className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{display}</span>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}
