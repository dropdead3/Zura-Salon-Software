/**
 * DockRenameBowlDialog — Inline dialog for renaming a formula bowl.
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOCK_DIALOG } from '../dock-ui-tokens';

interface DockRenameBowlDialogProps {
  open: boolean;
  currentName: string;
  containerLabel?: string;
  onConfirm: (newName: string) => void;
  onClose: () => void;
}

export function DockRenameBowlDialog({ open, currentName, containerLabel = 'Formula', onConfirm, onClose }: DockRenameBowlDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={DOCK_DIALOG.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={DOCK_DIALOG.content}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <h3 className={DOCK_DIALOG.title}>Rename {containerLabel}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full h-12 px-4 text-sm rounded-xl bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                placeholder="Formula name..."
              />
              <div className={DOCK_DIALOG.buttonRow}>
                <button type="button" onClick={onClose} className={DOCK_DIALOG.cancelButton}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full h-12 rounded-full bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 font-display tracking-wide transition-colors disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
