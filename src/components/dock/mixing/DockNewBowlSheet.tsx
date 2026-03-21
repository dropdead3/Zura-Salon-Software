/**
 * DockNewBowlSheet — Bottom sheet for creating a new formula bowl.
 * Wraps DockFormulaBuilder with session creation logic.
 * Supports pull-to-dismiss and tap-outside-to-close.
 */

import { useState } from 'react';
import { X, FlaskConical } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { DockFormulaBuilder, type FormulaLine } from './DockFormulaBuilder';

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

interface DockNewBowlSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateBowl: (lines: FormulaLine[], baseWeight: number) => void;
}

export function DockNewBowlSheet({ open, onClose, onCreateBowl }: DockNewBowlSheetProps) {
  const [lines, setLines] = useState<FormulaLine[]>([]);
  const [baseWeight, setBaseWeight] = useState(40);
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
        <div className="absolute inset-0 z-40 flex flex-col">
          {/* Backdrop */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="bg-[hsl(var(--platform-bg-elevated))] rounded-t-2xl border-t border-[hsl(var(--platform-border)/0.3)] max-h-[85vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            {/* Drag handle + header */}
            <div className="flex-shrink-0 px-5 pt-3 pb-4">
              <div
                className="w-10 h-1 rounded-full bg-[hsl(var(--platform-border)/0.4)] mx-auto mb-4 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              />
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
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
              <DockFormulaBuilder
                lines={lines}
                onLinesChange={setLines}
                baseWeight={baseWeight}
                onBaseWeightChange={setBaseWeight}
              />
            </div>

            {/* Create button */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-[hsl(var(--platform-border)/0.2)]">
              <button
                onClick={handleCreate}
                disabled={lines.length === 0}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              >
                Create Bowl ({lines.length} ingredient{lines.length !== 1 ? 's' : '')})
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
