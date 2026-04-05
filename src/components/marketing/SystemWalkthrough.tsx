import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Eye, AlertTriangle, CheckCircle2, TrendingUp, BarChart3, Users, Calendar, CreditCard, UserCheck } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useIsMobile } from '@/hooks/use-mobile';

type Step = 'connect' | 'observe' | 'detect' | 'act';

const steps: { id: Step; label: string; icon: typeof Link2; caption: string }[] = [
  { id: 'connect', label: 'Connect', icon: Link2, caption: 'Your data, unified. No manual entry.' },
  { id: 'observe', label: 'Observe', icon: Eye, caption: 'Continuous monitoring. No manual reports.' },
  { id: 'detect', label: 'Detect', icon: AlertTriangle, caption: `${PLATFORM_NAME} found something. Utilization is slipping on Tuesdays.` },
  { id: 'act', label: 'Act', icon: CheckCircle2, caption: 'One decision. Measurable impact.' },
];

const AUTO_ADVANCE_MS = 5000;

function ConnectPanel() {
  const sources = [
    { icon: Calendar, label: 'Calendar', delay: 0 },
    { icon: CreditCard, label: 'POS', delay: 0.2 },
    { icon: UserCheck, label: 'Team', delay: 0.4 },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6">
      <div className="flex items-center gap-4 sm:gap-8 flex-wrap justify-center">
        {sources.map((src) => (
          <motion.div
            key={src.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: src.delay, duration: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <src.icon className="w-6 h-6 text-violet-400" />
            </div>
            <span className="font-sans text-xs text-slate-400">{src.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Flowing connector lines */}
      <div className="flex items-center gap-0 w-full max-w-xs mx-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="flex-1 h-[2px] bg-gradient-to-r from-violet-500/30 to-violet-500/10 relative overflow-hidden"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
          >
            <div className="mkt-connector-line absolute inset-0" />
          </motion.div>
        ))}
      </div>

      {/* Center hub */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"
      >
        <span className="font-display text-[10px] tracking-[0.15em] text-violet-400">ZURA</span>
      </motion.div>
    </div>
  );
}

function ObservePanel() {
  const kpis = [
    { label: 'Revenue', value: 248, prefix: '$', suffix: 'K', icon: TrendingUp },
    { label: 'Utilization', value: 75, prefix: '', suffix: '%', icon: BarChart3 },
    { label: 'Active Clients', value: 2847, prefix: '', suffix: '', icon: Users },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 py-6">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.4 }}
          className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] text-center"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mx-auto mb-2">
            <kpi.icon className="w-4 h-4 text-violet-400" />
          </div>
          <div className="font-display text-lg sm:text-xl tracking-tight text-white">
            <AnimatedNumber value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} duration={1000} />
          </div>
          <span className="font-sans text-[10px] text-slate-500">{kpi.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function DetectPanel() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-4 py-6">
      {/* KPI with amber pulse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] mkt-pulse-amber"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="font-sans text-xs text-amber-300">Utilization</span>
        </div>
        <div className="font-display text-2xl tracking-tight text-white">75%</div>
        <span className="font-sans text-[10px] text-amber-400/80 mt-1 block">↓ Tuesdays dropping</span>
      </motion.div>

      {/* Lever card sliding in */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex-1 p-4 rounded-xl border border-violet-500/[0.12] bg-violet-500/[0.06]"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="w-3 h-3 text-violet-400" />
          <span className="font-display text-[10px] tracking-[0.12em] text-violet-400">LEVER IDENTIFIED</span>
        </div>
        <p className="font-sans text-sm text-white/90 leading-snug">
          Redistribute Tuesday capacity — projected $4,200/mo uplift
        </p>
        <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
            initial={{ width: '0%' }}
            animate={{ width: '80%' }}
            transition={{ delay: 0.8, duration: 1 }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ActPanel() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-4 py-6">
      {/* Updated KPI */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06]"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="font-sans text-xs text-emerald-300">Utilization</span>
        </div>
        <div className="font-display text-2xl tracking-tight text-white">
          <AnimatedNumber value={87} suffix="%" duration={1200} />
        </div>
        <span className="font-sans text-[10px] text-emerald-400 mt-1 block">+12% improvement</span>
      </motion.div>

      {/* Applied lever */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex-1 p-4 rounded-xl border border-emerald-500/[0.15] bg-emerald-500/[0.06]"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-display text-[10px] tracking-[0.12em] text-emerald-400">APPLIED</span>
        </div>
        <p className="font-sans text-sm text-white/90 leading-snug">
          Tuesday capacity redistributed successfully
        </p>
        <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
        </div>
        <div className="mt-2 font-sans text-[10px] text-emerald-400/70">+$4,200/mo projected</div>
      </motion.div>
    </div>
  );
}

const panels: Record<Step, () => JSX.Element> = {
  connect: ConnectPanel,
  observe: ObservePanel,
  detect: DetectPanel,
  act: ActPanel,
};

export function SystemWalkthrough() {
  const ref = useScrollReveal();
  const isMobile = useIsMobile();
  const [activeStep, setActiveStep] = useState<Step>('connect');
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const progressRef = useRef<HTMLDivElement>(null);

  const advanceStep = useCallback(() => {
    setActiveStep((prev) => {
      const idx = steps.findIndex((s) => s.id === prev);
      return steps[(idx + 1) % steps.length].id;
    });
  }, []);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setTimeout(advanceStep, AUTO_ADVANCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeStep, isPaused, advanceStep]);

  const handleStepClick = (step: Step) => {
    setActiveStep(step);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const ActivePanel = panels[activeStep];
  const activeCaption = steps.find((s) => s.id === activeStep)?.caption ?? '';

  return (
    <section
      ref={ref}
      className="relative z-10 px-6 sm:px-8 py-20 lg:py-28"
      onMouseEnter={() => !isMobile && setIsPaused(true)}
      onMouseLeave={() => !isMobile && setIsPaused(false)}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14 mkt-reveal">
          <p className="font-display text-[11px] sm:text-xs text-[hsl(var(--mkt-dusky))] uppercase tracking-[0.15em] mb-4">
            How It Works
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Watch {PLATFORM_NAME}{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              think
            </span>
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Four steps. Continuous intelligence. Zero guesswork.
          </p>
        </div>

        {/* Tabs — horizontal pills on desktop, vertical stepper on mobile */}
        {isMobile ? (
          <div className="space-y-3 mb-8 mkt-reveal">
            {steps.map((step, i) => {
              const isActive = step.id === activeStep;
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 text-left ${
                    isActive
                      ? 'border-violet-500/30 bg-violet-500/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    isActive ? 'bg-violet-500/20' : 'bg-white/[0.06]'
                  }`}>
                    <step.icon className={`w-4 h-4 transition-colors duration-300 ${
                      isActive ? 'text-violet-400' : 'text-slate-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`font-display text-xs tracking-[0.1em] uppercase ${
                      isActive ? 'text-violet-300' : 'text-slate-400'
                    }`}>{step.label}</span>
                    {/* Progress indicator on active */}
                    {isActive && !isPaused && (
                      <div className="mt-1.5 h-0.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500/60"
                          style={{
                            animation: `mktAutoProgress ${AUTO_ADVANCE_MS}ms linear forwards`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-10 mkt-reveal">
            {steps.map((step) => {
              const isActive = step.id === activeStep;
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${
                    isActive
                      ? 'border-violet-500/30 bg-violet-500/[0.08] text-violet-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:text-slate-300'
                  }`}
                >
                  <step.icon className="w-3.5 h-3.5" />
                  <span className="font-display text-[11px] tracking-[0.1em] uppercase">{step.label}</span>
                  {/* Progress bar inside active pill */}
                  {isActive && !isPaused && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        ref={progressRef}
                        className="h-full rounded-full bg-violet-500/50"
                        key={activeStep}
                        style={{
                          animation: `mktAutoProgress ${AUTO_ADVANCE_MS}ms linear forwards`,
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Panel */}
        <div className="mkt-reveal rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-8 min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <ActivePanel />
            </motion.div>
          </AnimatePresence>

          {/* Caption */}
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep + '-caption'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-sans text-sm text-slate-400 text-center mt-4"
            >
              {activeCaption}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
