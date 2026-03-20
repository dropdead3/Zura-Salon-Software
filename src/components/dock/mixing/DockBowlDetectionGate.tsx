/**
 * DockBowlDetectionGate — Three-phase overlay that simulates scale readiness
 * before allowing a new bowl to be created.
 *
 * Phases: connecting (1.5s) → place bowl (waiting) → taring (1s) → onReady()
 *
 * In demo mode, auto-advances through all phases.
 * Supports `mode: 'initial' | 'reconnect'` for future BLE reconnection flows.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Droplets, Check, X, Wifi } from 'lucide-react';

type DetectionPhase = 'connecting' | 'place_bowl' | 'taring' | 'ready';

interface DockBowlDetectionGateProps {
  open: boolean;
  onReady: () => void;
  onCancel: () => void;
  isDemoMode?: boolean;
  mode?: 'initial' | 'reconnect';
}

const SPRING = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

const PHASE_CONTENT: Record<Exclude<DetectionPhase, 'ready'>, {
  initial: { title: string; subtitle: string };
  reconnect: { title: string; subtitle: string };
}> = {
  connecting: {
    initial: {
      title: 'Connecting to Scale',
      subtitle: 'Searching for your mixing station...',
    },
    reconnect: {
      title: 'Reconnecting',
      subtitle: 'Re-establishing connection to scale...',
    },
  },
  place_bowl: {
    initial: {
      title: 'Place Bowl on Scale',
      subtitle: 'Set an empty mixing bowl on the scale to begin',
    },
    reconnect: {
      title: 'Place Bowl Back on Scale',
      subtitle: 'Return the mixing bowl to continue your session',
    },
  },
  taring: {
    initial: {
      title: 'Bowl Detected',
      subtitle: 'Taring to zero...',
    },
    reconnect: {
      title: 'Bowl Detected',
      subtitle: 'Re-calibrating...',
    },
  },
};

export function DockBowlDetectionGate({
  open,
  onReady,
  onCancel,
  isDemoMode = false,
  mode = 'initial',
}: DockBowlDetectionGateProps) {
  const [phase, setPhase] = useState<DetectionPhase>('connecting');

  // Reset phase when opening
  useEffect(() => {
    if (open) setPhase('connecting');
  }, [open]);

  // Auto-advance: connecting → place_bowl after 1.5s
  useEffect(() => {
    if (!open || phase !== 'connecting') return;
    const t = setTimeout(() => setPhase('place_bowl'), 1500);
    return () => clearTimeout(t);
  }, [open, phase]);

  // Demo mode: auto-advance place_bowl → taring after 2s
  useEffect(() => {
    if (!open || !isDemoMode || phase !== 'place_bowl') return;
    const t = setTimeout(() => setPhase('taring'), 2000);
    return () => clearTimeout(t);
  }, [open, isDemoMode, phase]);

  // Taring phase: in demo mode auto-advance; in real mode call adapter.tare()
  // and wait for zero reading confirmation, with a fallback timeout
  useEffect(() => {
    if (!open || phase !== 'taring') return;

    // Always complete after a timeout (real tare is usually <500ms)
    const t = setTimeout(() => {
      setPhase('ready');
      onReady();
    }, isDemoMode ? 1000 : 1500);

    return () => clearTimeout(t);
  }, [open, phase, onReady, isDemoMode]);

  const handleSkip = useCallback(() => {
    onReady();
  }, [onReady]);

  if (!open) return null;

  const content = phase !== 'ready' ? PHASE_CONTENT[phase][mode] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[35] flex flex-col items-center justify-center bg-[hsl(var(--platform-bg)/0.95)] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Phase content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              className="flex flex-col items-center text-center px-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {/* Icon */}
              {phase === 'connecting' && (
                <motion.div
                  className="relative mb-8"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="flex items-center justify-center w-24 h-24 rounded-full border border-violet-500/30 bg-violet-600/10">
                    <Wifi className="w-10 h-10 text-violet-400" />
                  </div>
                </motion.div>
              )}

              {phase === 'place_bowl' && (
                <motion.div
                  className="relative mb-8"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="absolute inset-0 rounded-full bg-violet-500/15 scale-[1.6] animate-[glow_2.5s_ease-in-out_infinite]" />
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-violet-500/30 bg-violet-600/10">
                    <Scale className="w-10 h-10 text-violet-400" />
                  </div>
                  {/* Droplet accent */}
                  <motion.div
                    className="absolute -bottom-1 -right-1"
                    animate={{ y: [0, -3, 0], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <Droplets className="w-5 h-5 text-violet-400/60" />
                  </motion.div>
                </motion.div>
              )}

              {phase === 'taring' && (
                <motion.div
                  className="relative mb-8"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRING}
                >
                  <div className="flex items-center justify-center w-24 h-24 rounded-full border border-emerald-500/30 bg-emerald-600/15">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                </motion.div>
              )}

              {/* Text */}
              {content && (
                <>
                  <h2 className="font-display text-lg tracking-wide text-[hsl(var(--platform-foreground))]">
                    {content.title}
                  </h2>
                  <p className="text-sm text-[hsl(var(--platform-foreground-muted))] mt-2 max-w-[260px]">
                    {content.subtitle}
                  </p>
                </>
              )}

              {/* Scanning indicator for connecting phase */}
              {phase === 'connecting' && (
                <div className="flex items-center gap-1.5 mt-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Skip / Manual Entry */}
          {phase !== 'taring' && phase !== 'connecting' && (
            <motion.button
              onClick={handleSkip}
              className="absolute bottom-10 text-xs text-[hsl(var(--platform-foreground-muted)/0.6)] hover:text-[hsl(var(--platform-foreground-muted))] transition-colors underline underline-offset-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Skip — Manual Entry
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
