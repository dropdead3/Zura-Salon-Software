/**
 * FormulaClonePanel — Shows client formula history and allows cloning into active bowl.
 * Appears in MixSessionManager when a session has draft/mixing status and a client.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClientFormulaHistory } from '@/hooks/color-bar/useClientFormulaHistory';
import { useCloneFormula } from '@/hooks/color-bar/useCloneFormula';
import { History, Copy, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import type { ClientFormula } from '@/hooks/color-bar/useClientFormulaHistory';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface FormulaClonePanelProps {
  clientId: string;
  bowlId: string | null;
}

export function FormulaClonePanel({ clientId, bowlId }: FormulaClonePanelProps) {
  const { data: formulas = [], isLoading } = useClientFormulaHistory(clientId);
  const cloneFormula = useCloneFormula();
  const [expanded, setExpanded] = useState(false);

  // Only show actual formulas (not refined) for cloning
  const actualFormulas = formulas.filter((f) => f.formula_type === 'actual');

  // Visibility Contract: no actual (non-refined) formulas in client history to clone.
  if (isLoading || actualFormulas.length === 0) {
    const reason = isLoading ? 'loading' : 'no-data';
    reportVisibilitySuppression('formula-clone-panel', reason, {
      totalFormulas: formulas.length,
      actualFormulaCount: actualFormulas.length,
    });
    return null;
  }

  const latestFormula = actualFormulas[0];
  const olderFormulas = actualFormulas.slice(1, 5);

  const handleClone = (formula: ClientFormula) => {
    if (!bowlId) return;
    cloneFormula.mutate({
      bowlId,
      formulaLines: formula.formula_data,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="font-display text-xs tracking-wide">Formula History</span>
        </div>
        {olderFormulas.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 font-sans text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3 mr-1" /> Less</>
            ) : (
              <><ChevronDown className="w-3 h-3 mr-1" /> {olderFormulas.length} more</>
            )}
          </Button>
        )}
      </div>

      {/* Latest formula */}
      <FormulaCard
        formula={latestFormula}
        label="Last Visit"
        onClone={() => handleClone(latestFormula)}
        isCloning={cloneFormula.isPending}
        disabled={!bowlId}
      />

      {/* Older formulas */}
      {expanded && olderFormulas.length > 0 && (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {olderFormulas.map((f) => (
              <FormulaCard
                key={f.id}
                formula={f}
                onClone={() => handleClone(f)}
                isCloning={cloneFormula.isPending}
                disabled={!bowlId}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function FormulaCard({
  formula,
  label,
  onClone,
  isCloning,
  disabled,
}: {
  formula: ClientFormula;
  label?: string;
  onClone: () => void;
  isCloning: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {label && (
            <Badge variant="secondary" className="text-[10px]">{label}</Badge>
          )}
          <span className="font-sans text-xs text-muted-foreground">
            {format(new Date(formula.created_at), 'MMM d, yyyy')}
          </span>
          {formula.service_name && (
            <span className="font-sans text-xs text-muted-foreground">
              · {formula.service_name}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 font-sans text-xs"
          onClick={onClone}
          disabled={disabled || isCloning}
        >
          <Copy className="w-3 h-3 mr-1" />
          Use Formula
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {formula.formula_data.map((line, idx) => (
          <span key={idx} className="font-sans text-xs text-foreground">
            {line.product_name}
            <span className="text-muted-foreground ml-1">
              {line.quantity}{line.unit}
            </span>
          </span>
        ))}
      </div>

      {formula.staff_name && (
        <p className="font-sans text-[10px] text-muted-foreground">
          By {formula.staff_name}
        </p>
      )}
    </div>
  );
}
