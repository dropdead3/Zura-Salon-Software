/**
 * ClientFormulaHistoryTab — Read-only timeline of all saved formulas for a client.
 * Reusable across ClientDetailSheet and AppointmentDetailSheet.
 */

import { useState } from 'react';
import { Beaker, ChevronDown, ChevronRight } from 'lucide-react';
import { useClientFormulaHistory, type ClientFormula } from '@/hooks/backroom/useClientFormulaHistory';
import { FormulaPreview } from '@/components/dashboard/backroom/FormulaPreview';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useFormatDate } from '@/hooks/useFormatDate';

interface ClientFormulaHistoryTabProps {
  clientId: string | null | undefined;
  className?: string;
}

export function ClientFormulaHistoryTab({ clientId, className }: ClientFormulaHistoryTabProps) {
  const { data: formulas = [], isLoading } = useClientFormulaHistory(clientId ?? null);
  const { formatDate } = useFormatDate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (!formulas.length) {
    return (
      <div className={cn(tokens.empty.container, className)}>
        <Beaker className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No formulas on file</h3>
        <p className={tokens.empty.description}>
          Formulas will appear here after backroom sessions are completed.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {formulas.map((formula, index) => {
        const isExpanded = expandedId === formula.id;
        const isLatest = index === 0;

        return (
          <Collapsible
            key={formula.id}
            open={isExpanded || isLatest}
            onOpenChange={() => setExpandedId(isExpanded ? null : formula.id)}
          >
            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
              <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Beaker className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm text-foreground truncate">
                      {formula.service_name || 'Formula'}
                    </span>
                    <Badge
                      variant={formula.formula_type === 'refined' ? 'default' : 'secondary'}
                      className="text-[10px] shrink-0"
                    >
                      {formula.formula_type === 'refined' ? 'Refined' : 'Actual'}
                    </Badge>
                    {isLatest && (
                      <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(formula.created_at), 'MMM d, yyyy')}
                    </span>
                    {formula.staff_name && (
                      <span className="text-xs text-muted-foreground">
                        · by {formula.staff_name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60">
                      v{formula.version_number}
                    </span>
                  </div>
                </div>
                {!isLatest && (
                  isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-3 pb-3 pt-0">
                  <FormulaPreview
                    formulaData={formula.formula_data}
                    formulaType={formula.formula_type}
                    compact
                  />
                  {formula.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic border-t border-border/40 pt-2">
                      {formula.notes}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
