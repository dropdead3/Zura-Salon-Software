import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, Check, ArrowRight, Zap } from 'lucide-react';
import { DemoTooltip } from './DemoTooltip';
import { DemoExitCTA } from './DemoExitCTA';
import { PLATFORM_NAME } from '@/lib/brand';

const stylists = [
  { name: 'Emma W.', utilization: 91, retention: 88, revenue: '$18.2K', status: 'strong' },
  { name: 'James L.', utilization: 85, retention: 82, revenue: '$15.8K', status: 'good' },
  { name: 'Sarah D.', utilization: 72, retention: 64, revenue: '$11.4K', status: 'attention' },
  { name: 'Maya R.', utilization: 88, retention: 85, revenue: '$16.9K', status: 'strong' },
];

const tooltips = [
  "Your team at a glance. Each card shows utilization, retention, and revenue.",
  `${PLATFORM_NAME} flagged Sarah — retention dropped 15% this month.`,
  "Proactive support, before small dips become big problems.",
];

interface DemoTeamViewProps {
  onReset: () => void;
}

export function DemoTeamView({ onReset }: DemoTeamViewProps) {
  const [step, setStep] = useState(0);
  const [applied, setApplied] = useState(false);
  const maxSteps = 3;

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => setStep(2), 600);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-violet-400" />
        <span className="font-display text-xs tracking-[0.12em] text-slate-400 uppercase">Team Performance</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stylists.map((s) => {
          const isAttention = s.status === 'attention';
          const highlighted = isAttention && step >= 1;
          const resolved = isAttention && step === 2 && applied;

          return (
            <motion.div
              key={s.name}
              layout
              className={`p-4 rounded-xl border transition-all duration-500 ${
                resolved
                  ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                  : highlighted
                    ? 'bg-amber-500/[0.06] border-amber-500/30 mkt-pulse-amber'
                    : 'bg-white/[0.03] border-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-sans text-sm text-white">{s.name}</span>
                {resolved ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : highlighted ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="font-sans text-[10px] text-slate-500">Utilization</p>
                  <p className={`font-display text-sm tracking-tight ${highlighted && !resolved ? 'text-amber-300' : 'text-white'}`}>
                    {s.utilization}%
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[10px] text-slate-500">Retention</p>
                  <p className={`font-display text-sm tracking-tight ${highlighted && !resolved ? 'text-amber-300' : 'text-white'}`}>
                    {s.retention}%
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[10px] text-slate-500">Revenue</p>
                  <p className="font-display text-sm tracking-tight text-white">{s.revenue}</p>
                </div>
              </div>
              {highlighted && !resolved && step === 1 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="font-sans text-xs text-amber-400/80 mt-2 leading-relaxed"
                >
                  Retention dropped 15% this month. Rebooking flow may need review.
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Lever card */}
      <AnimatePresence>
        {step === 1 && !applied && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/15"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3 h-3 text-violet-400" />
              <span className="font-display text-[10px] tracking-[0.12em] text-violet-400">PRIMARY LEVER</span>
            </div>
            <p className="font-sans text-sm text-white/90 leading-snug mb-3">
              Schedule a 1:1 with Sarah and review her rebooking flow
            </p>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-sans text-sm font-medium transition-colors"
            >
              Apply
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <DemoTooltip text={tooltips[step]} visible />

      {/* Step nav */}
      {step < 2 ? (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="font-sans text-sm text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            Back
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: maxSteps }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-violet-400' : 'bg-white/10'}`} />
            ))}
          </div>
          {step === 0 ? (
            <button
              onClick={() => setStep(1)}
              className="font-sans text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Next
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      ) : (
        <DemoExitCTA onTryAnother={onReset} />
      )}
    </div>
  );
}
