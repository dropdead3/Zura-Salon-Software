import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle, Check, ArrowRight, Zap } from 'lucide-react';
import { DemoTooltip } from './DemoTooltip';
import { DemoExitCTA } from './DemoExitCTA';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PLATFORM_NAME } from '@/lib/brand';

const timeSlots = [
  { time: '9:00 AM', client: 'Jessica M.', service: 'Color + Cut', status: 'booked' },
  { time: '10:30 AM', client: null, service: null, status: 'gap' },
  { time: '11:00 AM', client: null, service: null, status: 'gap' },
  { time: '11:30 AM', client: 'Amanda R.', service: 'Balayage', status: 'booked' },
  { time: '1:00 PM', client: 'Sarah K.', service: 'Cut + Style', status: 'booked' },
  { time: '2:30 PM', client: 'Michelle L.', service: 'Highlights', status: 'booked' },
  { time: '4:00 PM', client: 'Lauren T.', service: 'Blowout', status: 'booked' },
];

const tooltips = [
  "This is today's schedule. Notice the gaps at 10:30 and 11:00.",
  `${PLATFORM_NAME} detected $420 in unrealized revenue. It found 3 clients due for a rebook.`,
  "One action. Two gaps filled. Revenue recovered.",
];

interface DemoScheduleViewProps {
  onReset: () => void;
}

export function DemoScheduleView({ onReset }: DemoScheduleViewProps) {
  const [step, setStep] = useState(0);
  const [applied, setApplied] = useState(false);
  const maxSteps = 3;

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => setStep(2), 600);
  };

  const handleNext = () => {
    if (step < maxSteps - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      if (step === 2) setApplied(false);
    }
  };

  const gapsFilled = step === 2 && applied;

  return (
    <div className="space-y-5">
      {/* Revenue counter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400" />
          <span className="font-display text-xs tracking-[0.12em] text-slate-400 uppercase">Tuesday Schedule</span>
        </div>
        <div className="font-display text-sm text-white tracking-tight">
          <AnimatedNumber
            value={gapsFilled ? 2840 : 2420}
            prefix="$"
            suffix=" projected"
            duration={800}
          />
        </div>
      </div>

      {/* Schedule grid */}
      <div className="space-y-1.5">
        {timeSlots.map((slot, i) => {
          const isGap = slot.status === 'gap';
          const isFilled = isGap && gapsFilled;

          return (
            <motion.div
              key={slot.time}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-500 ${
                isFilled
                  ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                  : isGap && step >= 1
                    ? 'bg-amber-500/[0.06] border-amber-500/30 mkt-pulse-amber'
                    : isGap
                      ? 'bg-white/[0.02] border-dashed border-white/[0.08]'
                      : 'bg-white/[0.03] border-white/[0.06]'
              }`}
              layout
            >
              <span className="font-sans text-xs text-slate-500 w-16 shrink-0">{slot.time}</span>
              {isFilled ? (
                <div className="flex items-center gap-2 flex-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-sans text-sm text-emerald-300">Rebooked — Client confirmed</span>
                </div>
              ) : isGap ? (
                <div className="flex items-center gap-2 flex-1">
                  {step >= 1 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                  <span className={`font-sans text-sm ${step >= 1 ? 'text-amber-300' : 'text-slate-600'}`}>
                    {step >= 1 ? 'Gap detected — $210 unrealized' : 'Open slot'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span className="font-sans text-sm text-slate-300">{slot.client}</span>
                  <span className="font-sans text-xs text-slate-600 ml-auto hidden sm:inline">{slot.service}</span>
                </div>
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
              Reach out to 3 clients who haven't rebooked — projected $420 recovery
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
            onClick={handleBack}
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
              onClick={handleNext}
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
