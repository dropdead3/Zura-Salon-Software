/**
 * DockFormulaHistoryPicker — Lists past formulas for a client.
 * Tapping one calls onSelect with the full ClientFormula.
 */

import { ChevronLeft, FlaskConical, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useClientFormulaHistory, type ClientFormula } from '@/hooks/backroom/useClientFormulaHistory';
import { DOCK_TEXT } from '../dock-ui-tokens';

interface DockFormulaHistoryPickerProps {
  clientId: string;
  onSelect: (formula: ClientFormula) => void;
  onBack: () => void;
}

export function DockFormulaHistoryPicker({ clientId, onSelect, onBack }: DockFormulaHistoryPickerProps) {
  const { data: formulas, isLoading } = useClientFormulaHistory(clientId);

  return (
    <div className="flex flex-col h-full">
      {/* Header with back */}
      <div className="flex items-center gap-3 px-7 pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]"
        >
          <ChevronLeft className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
        </button>
        <div>
          <h3 className={DOCK_TEXT.title}>Past Formulas</h3>
          <p className={DOCK_TEXT.muted}>Tap to load into bowl</p>
        </div>
      </div>

      {/* Formula list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-7 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && (!formulas || formulas.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <FlaskConical className="w-8 h-8 text-[hsl(var(--platform-foreground-muted)/0.3)]" />
            <p className={DOCK_TEXT.subtitle}>No formula history found</p>
          </div>
        )}

        {formulas?.map((formula) => (
          <button
            key={formula.id}
            onClick={() => onSelect(formula)}
            className="w-full text-left rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-4 hover:bg-[hsl(var(--platform-bg-elevated))] active:scale-[0.98] transition-all"
          >
            {/* Top row: service + date */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-display uppercase tracking-wide text-[hsl(var(--platform-foreground))]">
                {formula.service_name || 'Formula'}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--platform-foreground-muted))]">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(formula.created_at), 'MMM d, yyyy')}
              </span>
            </div>

            {/* Stylist */}
            {formula.staff_name && (
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))] mb-2">
                by {formula.staff_name}
              </p>
            )}

            {/* Ingredient summary */}
            <div className="flex flex-wrap gap-1.5">
              {formula.formula_data.slice(0, 4).map((line, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs"
                >
                  {line.product_name} · {line.quantity}{line.unit}
                </span>
              ))}
              {formula.formula_data.length > 4 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(var(--platform-bg-elevated))] text-[hsl(var(--platform-foreground-muted))] text-xs">
                  +{formula.formula_data.length - 4} more
                </span>
              )}
            </div>

            {/* Notes */}
            {formula.notes && (
              <p className="mt-2 text-xs text-[hsl(var(--platform-foreground-muted)/0.6)] line-clamp-1 italic">
                {formula.notes}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
