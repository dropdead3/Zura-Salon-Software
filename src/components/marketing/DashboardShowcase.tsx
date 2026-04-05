import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardMockup } from './DashboardMockup';

type Phase = 'observe' | 'detect' | 'act' | 'pause';

const phaseNarration: Record<Phase, string> = {
  observe: 'Watching your numbers. Comparing to your benchmarks.',
  detect: 'Something\'s off. Tuesday bookings dropped 18%.',
  act: 'One fix. $4,200/mo recovered. Your call.',
  pause: 'That\'s it. Back to running your salon.',
};

export function DashboardShowcase() {
  const [phase, setPhase] = useState<Phase>('observe');

  const handlePhaseChange = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  return (
    <section id="dashboard-showcase" className="relative px-6 sm:px-8 py-16 sm:py-24 max-w-5xl mx-auto">
      <div className="w-full mkt-fade-in">
        <DashboardMockup onPhaseChange={handlePhaseChange} />
      </div>

      <div className="w-full mt-6 h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans text-sm text-slate-500 tracking-wide"
          >
            {phaseNarration[phase]}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  );
}
