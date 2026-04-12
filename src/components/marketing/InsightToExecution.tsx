import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Target,
  Banknote,
  Rocket,
  Eye,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { useScrollReveal } from './useScrollReveal';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

/* ── Flow Steps ── */
const FLOW_STEPS = [
  {
    icon: TrendingUp,
    label: 'Insight Detected',
    detail: 'Extensions demand exceeding capacity',
  },
  {
    icon: Target,
    label: 'Opportunity Scored',
    detail: '+$8,200/mo · Break-even: 5.8 months',
  },
  {
    icon: Banknote,
    label: 'Funding Available',
    detail: '$35,000 ready to deploy',
  },
  {
    icon: Rocket,
    label: 'Growth Activated',
    detail: 'Capacity expanded. Revenue climbing.',
  },
] as const;

const AUTO_INTERVAL = 3200;

/* ── Value Pillars ── */
const PILLARS = [
  {
    icon: Eye,
    title: 'Identify the Opportunity',
    body: "Zura continuously analyzes your business to surface where you're leaving money on the table.",
    bullets: ['Demand gaps', 'Capacity constraints', 'Missed bookings'],
  },
  {
    icon: BarChart3,
    title: 'Validate the Return',
    body: 'Every opportunity is scored on real data.',
    bullets: ['Expected revenue lift', 'Break-even timeline', 'Confidence level'],
  },
  {
    icon: Zap,
    title: 'Fund It Instantly',
    body: 'When an opportunity makes sense, Zura connects you to funding — seamlessly.',
    bullets: [
      'No applications upfront',
      'No browsing loan options',
      'Execution when ready',
    ],
  },
] as const;

/* ── Component ── */
export function InsightToExecution() {
  const sectionRef = useScrollReveal();
  const flowRef = useRef<HTMLDivElement>(null);
  const flowInView = useInView(flowRef, { once: true, amount: 0.3 });
  const isMobile = useIsMobile();

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  /* Auto-advance */
  useEffect(() => {
    if (!flowInView || paused) return;
    const id = setInterval(
      () => setActive((p) => (p + 1) % FLOW_STEPS.length),
      AUTO_INTERVAL,
    );
    return () => clearInterval(id);
  }, [flowInView, paused]);

  const selectStep = useCallback((i: number) => {
    setActive(i);
    setPaused(true);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 px-6 sm:px-8 py-24 lg:py-32 overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.03] to-transparent -z-10" />

      {/* ─── Header ─── */}
      <div className="max-w-3xl mx-auto text-center mb-20 mkt-reveal">
        <span className="text-xs font-display uppercase tracking-[0.15em] text-[hsl(var(--mkt-dusky))] block mb-4">
          From Insight to Execution
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white mb-5">
          Zura doesn't just tell you how to grow —{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            it helps you fund it.
          </span>
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
          Zura identifies your highest-return opportunities — and lets you fund
          them instantly when it makes sense.
        </p>
      </div>

      {/* ─── Animated Flow ─── */}
      <div ref={flowRef} className="max-w-4xl mx-auto mb-24 mkt-reveal">
        <div
          className={`grid gap-4 ${
            isMobile
              ? 'grid-cols-1'
              : 'grid-cols-4'
          }`}
        >
          {FLOW_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            const isReached = flowInView && i <= active;

            return (
              <div key={step.label} className="relative">
                {/* Connector line (desktop only, between steps) */}
                {!isMobile && i < FLOW_STEPS.length - 1 && (
                  <div className="absolute top-6 left-[calc(50%+24px)] right-0 h-px overflow-hidden -z-0">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500/60 to-purple-500/40"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isReached ? 1 : 0 }}
                      transition={{ duration: 0.5, delay: i * 0.3 + 0.2 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                )}

                <motion.button
                  onClick={() => selectStep(i)}
                  className={`relative z-10 w-full flex ${
                    isMobile ? 'flex-row items-center gap-4' : 'flex-col items-center text-center gap-3'
                  } p-4 rounded-xl transition-colors duration-300 ${
                    isActive
                      ? 'bg-white/[0.06] border border-violet-500/30'
                      : 'bg-transparent border border-transparent hover:bg-white/[0.03]'
                  }`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={flowInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                >
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                      isActive
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-white/[0.05] text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={isMobile ? 'text-left' : ''}>
                    <span
                      className={`font-display text-xs uppercase tracking-[0.1em] block ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.span
                          key={step.detail}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="font-sans text-sm text-slate-400 block mt-1"
                        >
                          {step.detail}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Value Pillars ─── */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 mkt-reveal">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-display text-sm uppercase tracking-[0.08em] text-white mb-2">
                {p.title}
              </h3>
              <p className="font-sans text-sm text-slate-400 mb-3 leading-relaxed">
                {p.body}
              </p>
              <ul className="space-y-1">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="font-sans text-xs text-slate-500 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-violet-500/60 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ─── Product UI Mock ─── */}
      <div className="max-w-md mx-auto mb-24 mkt-reveal">
        <motion.div
          className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 shadow-[0_0_60px_-15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_80px_-15px_rgba(139,92,246,0.25)] transition-shadow duration-500"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-[10px] uppercase tracking-[0.15em] text-violet-400">
              Zura Capital
            </span>
            <span className="font-sans text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Eligible
            </span>
          </div>

          {/* Title */}
          <h4 className="font-display text-base uppercase tracking-[0.08em] text-white mb-4">
            Mesa Extensions Expansion
          </h4>

          {/* KPI Row */}
          <div className="flex items-baseline gap-4 mb-5">
            <span className="font-display text-2xl tracking-tight bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              +$<AnimatedNumber value={8200} duration={1000} />/mo
            </span>
            <span className="font-sans text-xs text-slate-500">
              Break-even: 5.8 months
            </span>
          </div>

          {/* Funding Bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-sans text-xs text-slate-400">
                Funding available
              </span>
              <span className="font-display text-xs tracking-[0.05em] text-white">
                $35,000
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                initial={{ width: '0%' }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* CTA */}
          <button className="w-full h-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-sans text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20">
            Fund This
          </button>
        </motion.div>
      </div>

      {/* ─── Differentiation ─── */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24 mkt-reveal">
        <div>
          <h3 className="font-display text-2xl sm:text-3xl tracking-tight text-white leading-tight">
            Most software shows you problems.
          </h3>
          <p className="font-display text-2xl sm:text-3xl tracking-tight text-white leading-tight mt-1">
            Zura helps you{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              act on them.
            </span>
          </p>
        </div>

        <div className="space-y-6">
          {/* Other platforms */}
          <div>
            <span className="font-display text-[10px] uppercase tracking-[0.15em] text-slate-600 block mb-2">
              Other Platforms
            </span>
            <ul className="space-y-1.5">
              {['Dashboards', 'Reports', 'Suggestions'].map((item) => (
                <li
                  key={item}
                  className="font-sans text-sm text-slate-500 flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5 text-slate-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Zura */}
          <div>
            <span className="font-display text-[10px] uppercase tracking-[0.15em] text-violet-400/80 block mb-2">
              Zura
            </span>
            <ul className="space-y-1.5">
              {[
                'Identifies the opportunity',
                'Tells you exactly what to do',
                'Helps you execute it',
                'Funds it when needed',
              ].map((item) => (
                <li
                  key={item}
                  className="font-sans text-sm text-violet-300 flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Trust Strip ─── */}
      <div className="max-w-2xl mx-auto text-center mb-20 mkt-reveal">
        <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
          <Shield className="w-5 h-5 text-slate-500" />
        </div>
        <h4 className="font-display text-base uppercase tracking-[0.08em] text-white mb-2">
          You stay in control.
        </h4>
        <p className="font-sans text-sm text-slate-400 max-w-lg mx-auto mb-4 leading-relaxed">
          Zura never pushes funding. It only appears when the numbers make
          sense.
        </p>
        <p className="font-sans text-xs text-slate-600">
          Real performance data · Clear expected outcomes · Full transparency
        </p>
      </div>

      {/* ─── CTA ─── */}
      <div className="max-w-xl mx-auto text-center mkt-reveal">
        <h3 className="font-display text-2xl sm:text-3xl tracking-tight text-white mb-6">
          Ready to grow without guessing?
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 rounded-full font-sans text-base font-medium transition-all"
          >
            See How Zura Works
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full border border-[hsl(var(--mkt-lavender)/0.3)] text-[hsl(var(--mkt-lavender))] hover:border-[hsl(var(--mkt-lavender)/0.5)] hover:bg-[hsl(var(--mkt-lavender)/0.05)] font-sans text-base font-medium transition-all"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}
