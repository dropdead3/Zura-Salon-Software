/**
 * EDITOR MOTION WRAPPERS
 * 
 * Controlled framer-motion primitives for the Website Editor.
 * All use cubic-bezier easing — no spring physics, no overshoot.
 */

import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editorMotion } from './editor-tokens';

interface MotionProps {
  children: ReactNode;
  /** Unique key for AnimatePresence */
  motionKey?: string;
  className?: string;
}

/**
 * Horizontal slide-in + opacity fade for panel content changes.
 * 220ms, 12px travel from right, ease-in-out.
 */
export function PanelSlideIn({ children, motionKey, className }: MotionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, x: editorMotion.slideDistance }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -editorMotion.slideDistance }}
        transition={{
          duration: editorMotion.panelMs,
          ease: editorMotion.easing,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Opacity crossfade for tab content switches.
 * 150ms, ease-in-out. No positional movement.
 */
export function ContentFade({ children, motionKey, className }: MotionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: editorMotion.microMs,
          ease: editorMotion.easing,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Scale-in + fade for modal appearances.
 * 240ms, scale 0.98→1.0.
 */
export function ModalScaleIn({ children, motionKey, className }: MotionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{
          duration: editorMotion.modalMs,
          ease: editorMotion.easing,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Auto-save "Saved" text indicator.
 * Fades in, holds for 1.5s, fades out.
 */
export function SavedIndicator({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.3,
            ease: editorMotion.easing,
          }}
          className="text-[11px] text-muted-foreground font-sans ml-2"
        >
          Saved
        </motion.span>
      )}
    </AnimatePresence>
  );
}
