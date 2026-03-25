/**
 * DockBowlActionSheet — Bottom action sheet for formula bowl card actions.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, ArrowRightLeft, Star, StickyNote, Type, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCK_SHEET } from '../dock-ui-tokens';

export type BowlAction = 'edit' | 'change_service' | 'favorite' | 'view_notes' | 'rename' | 'remove';

interface DockBowlActionSheetProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: BowlAction) => void;
  bowlLabel?: string;
}

const actions: { key: BowlAction; label: string; icon: typeof Pencil; destructive?: boolean }[] = [
  { key: 'edit', label: 'Edit Formula', icon: Pencil },
  { key: 'change_service', label: 'Change Service', icon: ArrowRightLeft },
  { key: 'favorite', label: 'Add To Favorites', icon: Star },
  { key: 'view_notes', label: 'View Notes', icon: StickyNote },
  { key: 'rename', label: 'Rename Formula', icon: Type },
  { key: 'remove', label: 'Remove Formula', icon: Trash2, destructive: true },
];

export function DockBowlActionSheet({ open, onClose, onAction, bowlLabel }: DockBowlActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute inset-x-0 bottom-0 z-[61] bg-[hsl(var(--platform-bg-card))] border-t border-[hsl(var(--platform-border)/0.3)] rounded-t-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={DOCK_SHEET.spring}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={DOCK_SHEET.dragHandle} />
            </div>

            {/* Title */}
            {bowlLabel && (
              <div className="px-6 pb-3">
                <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
                  {bowlLabel}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-4 pb-6 space-y-1.5">
              {actions.map(({ key, label, icon: Icon, destructive }) => (
                <button
                  key={key}
                  onClick={() => {
                    onAction(key);
                    if (key !== 'rename') onClose();
                  }}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-150',
                    'active:scale-[0.98]',
                    destructive
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/15'
                      : 'bg-[hsl(var(--platform-bg-elevated)/0.5)] text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-elevated))]'
                  )}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', destructive ? 'text-red-400' : 'text-[hsl(var(--platform-foreground-muted))]')} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
