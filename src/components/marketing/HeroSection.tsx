import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardMockup } from './DashboardMockup';
import { PLATFORM_NAME } from '@/lib/brand';

type Phase = 'observe' | 'detect' | 'act' | 'pause';

const phaseNarration: Record<Phase, string> = {
  observe: 'Watching your numbers. Comparing to your benchmarks.',
  detect: 'Something\'s off. Tuesday bookings dropped 18%.',
  act: 'One fix. $4,200/mo recovered. Your call.',
  pause: 'That\'s it. Back to running your salon.',
};

export function HeroSection() {
  const [phase, setPhase] = useState<Phase>('observe');

  const handlePhaseChange = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  return (
    <section className="relative flex flex-col items-center justify-center px-6 sm:px-8 text-center pt-24 sm:pt-32 lg:pt-40 pb-8 sm:pb-12 max-w-5xl mx-auto overflow-visible">
      {/* Ambient glow beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[500px] bg-gradient-to-b from-violet-500/20 via-[hsl(var(--mkt-twilight)/0.1)] to-transparent rounded-full blur-[100px] -z-10 mkt-ambient-glow" />

      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 font-sans text-sm mb-8 mkt-fade-in">
        <Zap className="w-3.5 h-3.5" />
        Used by 50+ salon locations daily
      </div>

      <h1 className="font-display text-[2rem] sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.08] mb-6 mkt-fade-in mkt-delay-1">
        <span className="block">Know exactly</span>
        <span className="block bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">what to fix next.</span>
      </h1>

      <p className="font-sans text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed mkt-fade-in mkt-delay-2">
        {PLATFORM_NAME} watches your schedule, team, and numbers — and tells you the one thing
        that will make the biggest difference this week.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mkt-fade-in mkt-delay-2">
        <Link
          to="/demo"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 rounded-full font-sans text-base font-medium transition-all"
        >
          Get a Demo
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/explore"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto rounded-full border border-[hsl(var(--mkt-lavender)/0.3)] text-[hsl(var(--mkt-lavender))] hover:border-[hsl(var(--mkt-lavender)/0.5)] hover:bg-[hsl(var(--mkt-lavender)/0.05)] font-sans text-base font-medium transition-all"
        >
          Try the Interactive Demo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Dashboard mockup */}
      <div className="w-full mt-14 sm:mt-20 mkt-fade-in mkt-delay-3">
        <DashboardMockup onPhaseChange={handlePhaseChange} />
      </div>

      {/* Phase narration strip */}
      <div className="w-full mt-6 h-8 flex items-center justify-center mkt-fade-in mkt-delay-3">
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

      {/* Scroll anchor */}
      <motion.div
        className="hidden sm:flex mt-8 flex-col items-center gap-1 cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        onClick={() => document.getElementById('chaos-to-clarity')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="font-sans text-[11px] text-slate-500 tracking-widest uppercase">Scroll to explore</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-90" />
      </motion.div>
    </section>
  );
}
