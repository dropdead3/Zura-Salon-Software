import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useZuraCapital } from '@/hooks/useZuraCapital';
import { isPast, parseISO } from 'date-fns';
import type { Task } from '@/hooks/useTasks';

interface MoneyLeftOnTableProps {
  tasks: Task[];
}

interface LostSignal {
  label: string;
  cents: number;
}

export function MoneyLeftOnTable({ tasks }: MoneyLeftOnTableProps) {
  const { formatCurrency } = useFormatCurrency();
  const { opportunities } = useZuraCapital();

  const signals = useMemo<LostSignal[]>(() => {
    const result: LostSignal[] = [];

    // 1. Expired tasks with missed_revenue_cents
    const missedCents = tasks
      .filter(t => t.missed_revenue_cents != null && t.missed_revenue_cents > 0)
      .reduce((sum, t) => sum + (t.missed_revenue_cents ?? 0), 0);
    if (missedCents > 0) {
      result.push({ label: 'Missed task opportunities', cents: missedCents });
    }

    // 2. Overdue tasks (past due_date, not completed, with revenue impact)
    const overdueCents = tasks
      .filter(t =>
        !t.is_completed &&
        t.due_date &&
        isPast(parseISO(t.due_date)) &&
        t.estimated_revenue_impact_cents != null &&
        t.estimated_revenue_impact_cents > 0 &&
        !t.missed_revenue_cents, // avoid double-counting
      )
      .reduce((sum, t) => sum + (t.estimated_revenue_impact_cents ?? 0), 0);
    if (overdueCents > 0) {
      result.push({ label: 'Overdue task revenue at risk', cents: overdueCents });
    }

    // 3. Capital opportunities not acted on (detected but not funded)
    const unactedCents = (opportunities ?? [])
      .filter(o => o.status === 'detected' && o.zuraEligible)
      .reduce((sum, o) => sum + o.predictedLiftExpectedCents, 0);
    if (unactedCents > 0) {
      result.push({ label: 'Unfunded growth opportunities', cents: unactedCents });
    }

    return result;
  }, [tasks, opportunities]);

  const totalCents = signals.reduce((sum, s) => sum + s.cents, 0);

  if (totalCents <= 0) {
    return (
      <Card className="relative overflow-hidden rounded-xl border-emerald-500/10 bg-card/60">
        <div className="p-5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs font-sans text-muted-foreground">No revenue leakage detected — you're capturing all opportunities</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden rounded-xl border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className={cn(tokens.label.tiny, 'text-amber-600 dark:text-amber-400')}>
            MONEY LEFT ON THE TABLE
          </p>
        </div>

        <div className="space-y-2">
          {signals.map((signal, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <p className="text-xs font-sans text-muted-foreground truncate">{signal.label}</p>
              <p className="text-xs font-sans font-medium text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                <BlurredAmount>{formatCurrency(signal.cents / 100)}</BlurredAmount>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-amber-500/10 flex items-center justify-between">
          <p className="text-xs font-sans font-medium">Total</p>
          <p className="text-sm font-display font-medium text-amber-600 dark:text-amber-400 tabular-nums">
            <BlurredAmount>{formatCurrency(totalCents / 100)}</BlurredAmount>
            <span className="text-xs font-sans font-normal text-muted-foreground ml-1">/mo</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
