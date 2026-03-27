/**
 * DockFormulaHistorySheet — Top-anchored sheet showing client formula/mix history.
 * Read-only timeline with dates, services, stylists, and compact ingredient lists.
 */

import { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Beaker, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientFormulaHistory, type ClientFormula } from '@/hooks/color-bar/useClientFormulaHistory';
import { useFormatDate } from '@/hooks/useFormatDate';
import { DOCK_SHEET, DOCK_TEXT, DOCK_BUTTON, DOCK_BADGE } from '@/components/dock/dock-ui-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import type { FormulaLine } from '@/lib/color-bar/mix-calculations';

interface DockFormulaHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null | undefined;
  clientName: string | null | undefined;
}

export function DockFormulaHistorySheet({ isOpen, onClose, clientId, clientName }: DockFormulaHistorySheetProps) {
  const { data: formulas = [], isLoading } = useClientFormulaHistory(clientId ?? null);
  const { formatDate } = useFormatDate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dragControls = useDragControls();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={DOCK_SHEET.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={cn(DOCK_SHEET.panel, 'z-50')}
            style={{ maxHeight: DOCK_SHEET.maxHeight }}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={DOCK_SHEET.spring}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -DOCK_SHEET.dismissThreshold.offset || info.velocity.y < -DOCK_SHEET.dismissThreshold.velocity) {
                try { navigator.vibrate?.(15); } catch {}
                onClose();
              }
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 pb-4">
              <div>
                <h2 className={DOCK_TEXT.title}>Formula History</h2>
                {clientName && (
                  <p className={cn(DOCK_TEXT.subtitle, 'mt-0.5')}>{clientName}</p>
                )}
              </div>
              <button onClick={onClose} className={DOCK_BUTTON.close}>
                <X className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-2">
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl bg-[hsl(var(--platform-foreground-muted)/0.08)]" />
                  ))}
                </div>
              )}

              {!isLoading && formulas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.08)] flex items-center justify-center mb-3">
                    <Beaker className="w-6 h-6 text-[hsl(var(--platform-foreground-muted)/0.4)]" />
                  </div>
                  <p className={DOCK_TEXT.body}>No formulas on file</p>
                  <p className={cn(DOCK_TEXT.muted, 'mt-1')}>
                    Formulas will appear here after sessions are completed.
                  </p>
                </div>
              )}

              {!isLoading && formulas.map((formula, index) => {
                const isExpanded = expandedId === formula.id;
                const isLatest = index === 0;

                return (
                  <button
                    key={formula.id}
                    onClick={() => setExpandedId(isExpanded ? null : formula.id)}
                    className="w-full text-left rounded-xl border border-[hsl(var(--platform-border)/0.2)] bg-[hsl(var(--platform-bg-card))] overflow-hidden transition-colors hover:bg-[hsl(var(--platform-foreground)/0.03)]"
                  >
                    {/* Summary row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <Beaker className="h-4 w-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm text-[hsl(var(--platform-foreground))] truncate">
                            {formula.service_name || 'Formula'}
                          </span>
                          <span className={cn(
                            DOCK_BADGE.base,
                            formula.formula_type === 'refined'
                              ? 'bg-violet-500/15 text-violet-400 border-violet-500/25'
                              : 'bg-sky-500/15 text-sky-300 border-sky-400/25'
                          )}>
                            {formula.formula_type === 'refined' ? 'Refined' : 'Actual'}
                          </span>
                          {isLatest && (
                            <span className={cn(DOCK_BADGE.base, DOCK_BADGE.preferred)}>
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={DOCK_TEXT.muted}>
                            {formatDate(new Date(formula.created_at), 'MMM d, yyyy')}
                          </span>
                          {formula.staff_name && (
                            <span className={DOCK_TEXT.muted}>
                              · {formula.staff_name}
                            </span>
                          )}
                          <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)]">
                            v{formula.version_number}
                          </span>
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-[hsl(var(--platform-foreground-muted))] shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-[hsl(var(--platform-foreground-muted))] shrink-0" />
                      }
                    </div>

                    {/* Expanded ingredient list */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 space-y-1">
                        {(formula.formula_data as FormulaLine[]).map((line, i) => (
                          <div
                            key={`${line.product_id}-${i}`}
                            className="flex items-center justify-between py-1 px-2 rounded-lg bg-[hsl(var(--platform-foreground)/0.03)]"
                          >
                            <span className="font-sans text-xs text-[hsl(var(--platform-foreground))] truncate">
                              {line.product_name}
                            </span>
                            <span className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] shrink-0 ml-2">
                              {line.quantity ? `${line.quantity}${line.unit || 'g'}` : ''}
                            </span>
                          </div>
                        ))}
                        {formula.notes && (
                          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] italic border-t border-[hsl(var(--platform-border)/0.2)] pt-2 mt-1">
                            {formula.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drag handle — bottom position for top-anchored sheet */}
            <div className={DOCK_SHEET.dragHandleWrapperBottom} onPointerDown={(e) => dragControls.start(e)}>
              <div className={DOCK_SHEET.dragHandle} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
