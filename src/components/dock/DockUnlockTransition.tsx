/**
 * DockUnlockTransition — Orchestrates a premium "unlock" animation
 * between the PIN gate exit and Dock layout entrance.
 *
 * Uses framer-motion AnimatePresence with smooth easing (no bounce/elastic).
 */

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DockUnlockTransitionProps {
  /** Whether the PIN has been validated */
  unlocked: boolean;
  /** PIN gate content */
  gate: ReactNode;
  /** Dock layout content */
  children: ReactNode;
}

const EXIT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const ENTER_EASE: [number, number, number, number] = [0, 0, 0.2, 1];

export function DockUnlockTransition({ unlocked, gate, children }: DockUnlockTransitionProps) {
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (unlocked) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 600);
      return () => clearTimeout(timer);
    }
  }, [unlocked]);

  return (
    <div className="relative w-full h-full">
      {/* Violet pulse overlay during handoff */}
      <AnimatePresence>
        {showPulse && (
          <motion.div
            key="pulse"
            className="absolute inset-0 z-50 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.25) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="gate"
            className="absolute inset-0"
            exit={{
              opacity: 0,
              scale: 1.03,
              transition: { duration: 0.35, ease: EXIT_EASE as unknown as number[] },
            }}
          >
            {gate}
          </motion.div>
        ) : (
          <motion.div
            key="dock"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { duration: 0.4, ease: ENTER_EASE as unknown as number[], delay: 0.15 },
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
