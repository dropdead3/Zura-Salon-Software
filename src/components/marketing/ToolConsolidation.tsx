import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useScrollReveal } from './useScrollReveal';

const tools = [
  { name: 'CRM & Scheduling', price: 89, color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', rotate: -12, top: '8%', left: '28%', z: 5 },
  { name: 'POS System', price: 79, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', rotate: 9, top: '18%', left: '12%', z: 3 },
  { name: 'Payroll', price: 59, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', rotate: -7, top: '42%', left: '20%', z: 6 },
  { name: 'Marketing Agencies', price: 1500, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', rotate: 14, top: '22%', left: '48%', z: 4 },
  { name: 'Color Bar Management', price: 45, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', rotate: -16, top: '48%', left: '42%', z: 7 },
  { name: 'AI Receptionist', price: 199, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', rotate: 6, top: '55%', left: '10%', z: 2 },
  { name: 'Team Chat', price: 25, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', rotate: -18, top: '35%', left: '60%', z: 8 },
  { name: 'Email Marketing', price: 49, color: 'bg-pink-500/20 text-pink-300 border-pink-500/30', rotate: 11, top: '60%', left: '55%', z: 1 },
  { name: 'Business Consulting', price: 500, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', rotate: -5, top: '72%', left: '30%', z: 9 },
];

const totalSpend = tools.reduce((sum, t) => sum + t.price, 0);

const pillVariants = {
  hidden: (i: number) => ({
    opacity: 0,
    scale: 0.5,
    x: (i % 2 === 0 ? -1 : 1) * (60 + i * 15),
    y: -80 + i * 12,
    rotate: (i % 2 === 0 ? -1 : 1) * (30 + i * 5),
  }),
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export function ToolConsolidation() {
  const sectionRef = useScrollReveal();
  const pileRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(pileRef, { once: true, margin: '-60px' });

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

        {/* Jumbled pill pile */}
        <div ref={pileRef} className="relative mx-auto max-w-xl h-[280px] sm:h-[240px] mb-14">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              custom={i}
              variants={pillVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className={`absolute inline-flex items-center gap-2 rounded-full border px-4 py-2 sm:px-5 sm:py-2.5 font-sans text-xs sm:text-sm whitespace-nowrap ${tool.color}`}
              style={{
                top: tool.top,
                left: tool.left,
                zIndex: tool.z,
                rotate: `${tool.rotate}deg`,
              }}
            >
              <span>{tool.name}</span>
              <span className="opacity-60">${tool.price.toLocaleString()}/mo</span>
            </motion.div>
          ))}
        </div>

        {/* Price comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
        >
          <div className="text-center">
            <p className="font-display text-xs text-slate-500 uppercase tracking-wide mb-1">Typical spend</p>
            <p className="font-display text-2xl sm:text-3xl text-red-400/80 line-through decoration-red-500/40">
              ${totalSpend.toLocaleString()}/mo
            </p>
          </div>

          <div className="hidden sm:block w-px h-12 bg-white/10" />
          <div className="sm:hidden w-16 h-px bg-white/10" />

          <div className="text-center">
            <p className="font-display text-xs text-slate-500 uppercase tracking-wide mb-1">Zura</p>
            <p className="font-display text-2xl sm:text-3xl text-white">
              $99/mo
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
