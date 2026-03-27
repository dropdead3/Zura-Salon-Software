/**
 * DockSessionCompleteSheet — Confirmation sheet to finalize a mix session.
 * Shows session totals, flags unresolved issues, and triggers session completion.
 * Supports pull-to-dismiss and tap-outside-to-close.
 */

import { useState } from 'react';
import { Check, AlertTriangle, FlaskConical, X, Flag, DollarSign } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { roundWeight, roundCost } from '@/lib/backroom/mix-calculations';
import { DOCK_SHEET } from '../dock-ui-tokens';

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

interface SessionStats {
  totalBowls: number;
  reweighedBowls: number;
  totalDispensed: number;
  totalLeftover: number;
  totalNetUsage: number;
  totalCost: number;
}

export interface PendingChargeSummary {
  chargeType: 'overage' | 'product_cost';
  chargeAmount: number;
  serviceName?: string;
}

interface DockSessionCompleteSheetProps {
  open: boolean;
  stats: SessionStats;
  onComplete: (notes?: string) => void;
  onMarkUnresolved: (reason: string) => void;
  onClose: () => void;
  isPending?: boolean;
  pendingCharges?: PendingChargeSummary[];
}

export function DockSessionCompleteSheet({
  open,
  stats,
  onComplete,
  onMarkUnresolved,
  onClose,
  isPending,
  pendingCharges,
}: DockSessionCompleteSheetProps) {
  const [mode, setMode] = useState<'confirm' | 'unresolved'>('confirm');
  const [notes, setNotes] = useState('');
  const [unresolvedReason, setUnresolvedReason] = useState('');
  const dragControls = useDragControls();

  const allReweighed = stats.reweighedBowls >= stats.totalBowls;
  const wastePct = stats.totalDispensed > 0
    ? roundWeight((stats.totalLeftover / stats.totalDispensed) * 100)
    : 0;

  const totalCharges = pendingCharges?.reduce((s, c) => s + c.chargeAmount, 0) ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <motion.div
            className="flex-1 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="bg-[hsl(var(--platform-bg-elevated))] rounded-b-2xl border-b border-[hsl(var(--platform-border)/0.3)] max-h-[80vh] flex flex-col"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={SPRING}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -120 || info.velocity.y < -500) {
                try { navigator.vibrate?.(15); } catch {}
                onClose();
              }
            }}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-7 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-violet-400" />
                  <h2 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                    Complete Session
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[hsl(var(--platform-foreground-muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-7 pb-4 space-y-4">
              {/* Warning if not all reweighed */}
              {!allReweighed && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-amber-300 font-medium">Incomplete Reweigh</p>
                    <p className="text-[11px] text-amber-400/60 mt-0.5">
                      {stats.reweighedBowls} of {stats.totalBowls} bowls reweighed. You can still complete, but data may be incomplete.
                    </p>
                  </div>
                </div>
              )}

              {/* Session summary */}
              <div className="grid grid-cols-3 gap-2">
                <SummaryTile label="Bowls" value={String(stats.totalBowls)} />
                <SummaryTile label="Net Usage" value={`${roundWeight(stats.totalNetUsage)}g`} />
                <SummaryTile label="Waste" value={`${wastePct}%`} alert={wastePct > 25} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SummaryTile label="Total Dispensed" value={`${roundWeight(stats.totalDispensed)}g`} />
                <SummaryTile label="Product Cost" value={`$${roundCost(stats.totalCost).toFixed(2)}`} />
              </div>

              {/* Pending charges summary */}
              {pendingCharges && pendingCharges.length > 0 && (
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs text-violet-300 font-medium">Client Charges</span>
                  </div>
                  {pendingCharges.map((charge, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.7)]">
                        {charge.chargeType === 'product_cost' ? 'Product Cost' : 'Overage'}
                        {charge.serviceName ? ` — ${charge.serviceName}` : ''}
                      </span>
                      <span className="text-xs text-[hsl(var(--platform-foreground))] font-medium">
                        ${charge.chargeAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {pendingCharges.length > 1 && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-violet-500/15">
                      <span className="text-[11px] text-violet-300">Total</span>
                      <span className="text-xs text-violet-300 font-medium">${totalCharges.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode tabs */}
              <div className="flex gap-1 bg-[hsl(var(--platform-bg-card))] rounded-xl p-1 border border-[hsl(var(--platform-border)/0.2)]">
                <button
                  onClick={() => setMode('confirm')}
                  className={cn(
                    'flex-1 h-8 rounded-lg text-xs font-medium transition-all',
                    mode === 'confirm' ? 'bg-emerald-600/30 text-emerald-300' : 'text-[hsl(var(--platform-foreground-muted))]'
                  )}
                >
                  Complete
                </button>
                <button
                  onClick={() => setMode('unresolved')}
                  className={cn(
                    'flex-1 h-8 rounded-lg text-xs font-medium transition-all',
                    mode === 'unresolved' ? 'bg-amber-600/30 text-amber-300' : 'text-[hsl(var(--platform-foreground-muted))]'
                  )}
                >
                  Flag Issue
                </button>
              </div>

              {mode === 'confirm' ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional session notes..."
                  rows={2}
                  className="w-full rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] p-3 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.6)]">
                    Flag this session for manager review. Describe the issue:
                  </p>
                  <textarea
                    value={unresolvedReason}
                    onChange={(e) => setUnresolvedReason(e.target.value)}
                    placeholder="e.g. Scale malfunction, wrong product used..."
                    rows={3}
                    className="w-full rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] p-3 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 px-7 py-4 border-t border-[hsl(var(--platform-border)/0.2)]">
              {mode === 'confirm' ? (
                <button
                  onClick={() => onComplete(notes || undefined)}
                  disabled={isPending}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isPending ? 'Completing...' : 'Complete Session'}
                </button>
              ) : (
                <button
                  onClick={() => unresolvedReason.trim() && onMarkUnresolved(unresolvedReason.trim())}
                  disabled={!unresolvedReason.trim() || isPending}
                  className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  {isPending ? 'Flagging...' : 'Flag as Unresolved'}
                </button>
              )}
            </div>

            {/* Drag handle — bottom position for top-anchored sheet */}
            <div className={DOCK_SHEET.dragHandleWrapperBottom} onPointerDown={(e) => dragControls.start(e)}>
              <div className={DOCK_SHEET.dragHandle} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SummaryTile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.1)] p-2.5 text-center">
      <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={cn('font-display text-sm tracking-tight', alert ? 'text-amber-400' : 'text-[hsl(var(--platform-foreground))]')}>
        {value}
      </p>
    </div>
  );
}