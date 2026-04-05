import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useScrollReveal } from './useScrollReveal';

const tools = [
  { name: 'CRM & Scheduling', price: 89, color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', chaos: { x: -110, y: -60, rotate: -12 } },
  { name: 'POS System', price: 79, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', chaos: { x: 90, y: -45, rotate: 8 } },
  { name: 'Payroll', price: 59, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', chaos: { x: -60, y: 50, rotate: -6 } },
  { name: 'Marketing Agencies', price: 1500, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', chaos: { x: 120, y: 30, rotate: 14 } },
  { name: 'Color Bar Management', price: 45, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', chaos: { x: -100, y: 20, rotate: -10 } },
  { name: 'AI Receptionist', price: 199, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', chaos: { x: 70, y: -70, rotate: 11 } },
  { name: 'Team Chat', price: 25, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', chaos: { x: -40, y: -80, rotate: -15 } },
  { name: 'Email Marketing', price: 49, color: 'bg-pink-500/20 text-pink-300 border-pink-500/30', chaos: { x: 50, y: 65, rotate: 7 } },
  { name: 'Business Consulting', price: 500, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', chaos: { x: -20, y: 75, rotate: -4 } },
];

const totalSpend = tools.reduce((sum, t) => sum + t.price, 0);

type Phase = 'chaos' | 'converging' | 'resolved';

export function ToolConsolidation() {
  const sectionRef = useScrollReveal();
  const pileRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(pileRef, { once: true, margin: '-40px' });
  const [phase, setPhase] = useState<Phase>('chaos');
  const lastIndex = tools.length - 1;
  const hasTriggered = useRef(false);

  // Wait 2s after in-view so user can read the chaos state
  if (isInView && !hasTriggered.current) {
    hasTriggered.current = true;
    setTimeout(() => setPhase('converging'), 2000);
  }

  return (
    <section ref={sectionRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--mkt-midnight)/0.06)] to-transparent -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 mkt-reveal">
          <p className="font-display text-[11px] sm:text-xs text-[hsl(var(--mkt-dusky))] uppercase tracking-[0.15em] mb-4">
            Everything included
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Fewer tools to juggle.
          </h2>
          <p className="font-sans text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            Stop paying for 9 disconnected subscriptions. Zura replaces them all.
          </p>
        </div>

        {/* Animation container */}
        <div ref={pileRef} className="relative w-full max-w-2xl mx-auto mb-14" style={{ height: 260 }}>
          {/* Scattered pills */}
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              className={`absolute left-1/2 top-1/2 inline-flex items-center gap-2 rounded-full border px-4 py-2 sm:px-5 sm:py-2.5 font-sans text-xs sm:text-sm whitespace-nowrap ${tool.color}`}
              style={{ marginLeft: '-80px', marginTop: '-18px' }}
              initial={{
                x: tool.chaos.x,
                y: tool.chaos.y,
                rotate: tool.chaos.rotate,
                scale: 1,
                opacity: 1,
              }}
              animate={
                phase === 'converging' || phase === 'resolved'
                  ? { x: 0, y: 0, rotate: 0, scale: 0.3, opacity: 0 }
                  : { x: tool.chaos.x, y: tool.chaos.y, rotate: tool.chaos.rotate, scale: 1, opacity: 1 }
              }
              transition={{
                delay: i * 0.08,
                duration: 0.8,
                ease: [0.4, 0, 0.2, 1],
              }}
              onAnimationComplete={() => {
                if (i === lastIndex && phase === 'converging') {
                  setPhase('resolved');
                }
              }}
            >
              <span>{tool.name}</span>
              <span className="opacity-60">${tool.price.toLocaleString()}/mo</span>
            </motion.div>
          ))}

          {/* Zura pill reveal */}
          <AnimatePresence>
            {phase === 'resolved' && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-3 rounded-full border-2 border-violet-400/50 bg-violet-500/15 px-8 py-3.5 sm:px-10 sm:py-4 font-display text-base sm:text-lg tracking-wide text-white whitespace-nowrap shadow-[0_0_40px_rgba(139,92,246,0.25)]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <span className="uppercase tracking-[0.1em]">Zura</span>
                <span className="text-violet-300/80 font-sans text-sm sm:text-base font-normal">$99/mo</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Price comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase === 'resolved' ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
        >
          <div className="text-center">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wide mb-1">Typical spend</p>
            <p className="font-display text-2xl sm:text-3xl text-red-400/80 line-through decoration-red-500/40">
              ${totalSpend.toLocaleString()}/mo
            </p>
          </div>

          <div className="hidden sm:block w-px h-12 bg-white/10" />
          <div className="sm:hidden w-16 h-px bg-white/10" />

          <div className="text-center">
            <p className="font-sans text-xs text-slate-500 uppercase tracking-wide mb-1">Zura</p>
            <p className="font-display text-2xl sm:text-3xl text-white">
              $99/mo
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
