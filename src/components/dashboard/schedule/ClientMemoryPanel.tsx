/**
 * ClientMemoryPanel — Unified client context at a glance.
 * Shows last formula, notes, retail, and processing time in one panel.
 */

import { Beaker, Clock, FileText, ShoppingBag, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useClientMemory } from '@/hooks/useClientMemory';
import { useClientFormulaHistory } from '@/hooks/backroom/useClientFormulaHistory';

interface ClientMemoryPanelProps {
  clientId: string | null | undefined;
  serviceName: string | null | undefined;
  orgId: string | null | undefined;
  className?: string;
  onViewFormulas?: () => void;
}

export function ClientMemoryPanel({ clientId, serviceName, orgId, className, onViewFormulas }: ClientMemoryPanelProps) {
  const { data, isLoading } = useClientMemory(clientId, serviceName, orgId);
  const { data: formulaHistory = [] } = useClientFormulaHistory(clientId ?? null);

  if (!clientId) return null;

  if (isLoading) {
    return (
      <div className={cn('space-y-3 p-4', className)}>
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (data.isFirstVisit) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">First visit — no history yet</span>
        </div>
      </div>
    );
  }

  const memoryItems = [
    {
      icon: Beaker,
      label: 'Last Formula',
      value: data.lastFormula?.lines?.length
        ? data.lastFormula.lines.map(l => `${l.product_name} ${l.weight_g}g`).join(', ')
        : null,
      empty: 'No formula on file',
      accent: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      icon: FileText,
      label: 'Last Notes',
      value: data.lastNotes,
      empty: 'No notes',
      accent: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Clock,
      label: 'Processing Time',
      value: data.lastProcessingTimeMinutes
        ? `${Math.floor(data.lastProcessingTimeMinutes / 60)}h ${data.lastProcessingTimeMinutes % 60}m`
        : null,
      empty: 'No duration data',
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: ShoppingBag,
      label: 'Last Retail',
      value: data.lastRetailPurchase,
      empty: 'No retail data',
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className={cn('space-y-3 p-4', className)}>
      <div className="flex items-center gap-2">
        <h4 className={tokens.heading.subsection}>
          <User className="h-3 w-3 inline mr-1" />
          Client Memory
        </h4>
        <span className="text-[10px] text-muted-foreground">
          {data.visitCount} visit{data.visitCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {memoryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border/60 p-3 space-y-1.5 bg-card"
          >
            <div className="flex items-center gap-1.5">
              <div className={cn('h-5 w-5 rounded flex items-center justify-center', item.bg)}>
                <item.icon className={cn('h-3 w-3', item.accent)} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
            </div>
            <p className={cn(
              'text-xs leading-relaxed',
              item.value ? 'text-foreground' : 'text-muted-foreground italic',
            )}>
              {item.value
                ? (item.value.length > 60 ? item.value.slice(0, 60) + '…' : item.value)
                : item.empty}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
