import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Task } from '@/hooks/useTasks';

interface MissedOpportunityBannerProps {
  tasks: Task[];
}

/**
 * Summarizes cumulative missed revenue from expired/missed tasks.
 * Placed in Daily Briefing blockers section.
 */
export function MissedOpportunityBanner({ tasks }: MissedOpportunityBannerProps) {
  const { formatCurrency } = useFormatCurrency();

  const missedTotal = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.missed_revenue_cents || 0), 0);
  }, [tasks]);

  if (missedTotal <= 0) return null;

  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
      <p className="text-xs font-sans text-destructive">
        <BlurredAmount>{formatCurrency(missedTotal / 100)}</BlurredAmount>/mo in missed opportunities this week
      </p>
    </div>
  );
}
