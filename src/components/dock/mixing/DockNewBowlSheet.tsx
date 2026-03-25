/**
 * DockNewBowlSheet — Top-anchored sheet for creating a new formula bowl.
 * Uses standard DOCK_SHEET tokens for visual consistency.
 */

import { useState } from 'react';
import { X, FlaskConical, Plus, History } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { DockFormulaBuilder, type FormulaLine } from './DockFormulaBuilder';
import { DockFormulaHistoryPicker } from './DockFormulaHistoryPicker';
import { DOCK_SHEET } from '../dock-ui-tokens';
import type { ClientFormula } from '@/hooks/backroom/useClientFormulaHistory';
import type { DockProduct } from '@/hooks/dock/useDockProductCatalog';

interface DockNewBowlSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateBowl: (lines: FormulaLine[], baseWeight: number) => void;
  clientId?: string | null;
}

export function DockNewBowlSheet({ open, onClose, onCreateBowl }: DockNewBowlSheetProps) {
  const [lines, setLines] = useState<FormulaLine[]>([]);
  const [baseWeight, setBaseWeight] = useState(40);
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragControls = useDragControls();

  const handleCreate = () => {
    onCreateBowl(lines, baseWeight);
    setLines([]);
    setBaseWeight(40);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-40">
          {/* Backdrop */}
          <motion.div
            className={DOCK_SHEET.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet — top-anchored */}
          <motion.div
            className={DOCK_SHEET.panel}
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
            <div className="flex-shrink-0 px-7 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-violet-400" />
                  <h2 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                    New Bowl
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[hsl(var(--platform-foreground-muted))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formula builder */}
            <div className="flex-1 min-h-0 overflow-y-auto px-7 pb-4">
              <DockFormulaBuilder
                lines={lines}
                onLinesChange={setLines}
                baseWeight={baseWeight}
                onBaseWeightChange={setBaseWeight}
                showAddButton={false}
                pickerOpen={pickerOpen}
                onPickerClose={() => setPickerOpen(false)}
              />
            </div>

            {/* Action buttons — side-by-side large rectangles */}
            <div className="flex-shrink-0 px-7 py-4 border-t border-[hsl(var(--platform-border)/0.2)]">
              <div className="flex gap-3">
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/40 text-violet-400 bg-violet-600/10 hover:bg-violet-600/20 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
                <button
                  onClick={handleCreate}
                  disabled={lines.length === 0}
                  className="flex-1 h-14 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                >
                  Create Bowl ({lines.length})
                </button>
              </div>
            </div>

            {/* Drag handle — bottom position for top-anchored sheet */}
            <div className={DOCK_SHEET.dragHandleWrapperBottom}>
              <div
                className={DOCK_SHEET.dragHandle}
                onPointerDown={(e) => dragControls.start(e)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}