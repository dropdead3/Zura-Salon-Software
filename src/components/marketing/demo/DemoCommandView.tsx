import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, TrendingDown, Package, BarChart3, ArrowRight, Zap, Check } from 'lucide-react';
import { DemoTooltip } from './DemoTooltip';
import { DemoExitCTA } from './DemoExitCTA';
import { PLATFORM_NAME } from '@/lib/brand';

const issues = [
  {
    id: 'margin',
    icon: TrendingDown,
    title: 'Margin dip detected',
    detail: 'Service margins dropped 4.2% vs last month',
    impact: '$3,800/mo at risk',
    lever: 'Review pricing on 3 underperforming services',
    impactNum: '+$3,800/mo',
    rank: 1,
  },
  {
    id: 'stock',
    icon: Package,
    title: 'Stockout risk — Color line',
    detail: '2 SKUs below reorder threshold',
    impact: '~12 appointments at risk',
    lever: 'Trigger reorder for Redken Shades EQ 6N, 8V',
    impactNum: 'Prevents $2,400 loss',
    rank: 2,
  },
  {
    id: 'util',
    icon: BarChart3,
    title: 'Utilization drop — Tuesdays',
    detail: 'Down 18% over last 3 weeks',
    impact: '$1,200/wk unrealized',
    lever: 'Activate targeted rebook campaign',
    impactNum: '+$4,800/mo',
    rank: 3,
  },
];

const tooltips = [
  `${PLATFORM_NAME} surfaces what needs attention. Three issues detected today.`,
  "Cards rank by impact. The highest-leverage issue rises to the top.",
  "One lever per issue. Clear projected impact. You decide.",
];

interface DemoCommandViewProps {
  onReset: () => void;
}

export function DemoCommandView({ onReset }: DemoCommandViewProps) {
  const [step, setStep] = useState(0);
  const [applied, setApplied] = useState(false);
  const maxSteps = 3;

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => setStep(2), 600);
  };

  const sorted = step >= 1
    ? [...issues].sort((a, b) => a.rank - b.rank)
    : issues;

  const expandedId = step >= 1 ? 'margin' : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <LayoutDashboard className="w-4 h-4 text-violet-400" />
        <span className="font-display text-xs tracking-[0.12em] text-slate-400 uppercase">What Needs Attention</span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sorted.map((issue, i) => {
            const isExpanded = expandedId === issue.id;
            const isResolved = isExpanded && applied;

            return (
              <motion.div
                key={issue.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                className={`p-4 rounded-xl border transition-all duration-500 ${
                  isResolved
                    ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                    : isExpanded
                      ? 'bg-violet-500/[0.06] border-violet-500/15'
                      : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isResolved ? 'bg-emerald-500/20' : isExpanded ? 'bg-violet-500/20' : 'bg-white/[0.05]'
                  }`}>
                    {isResolved ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <issue.icon className={`w-4 h-4 ${isExpanded ? 'text-violet-400' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-sans text-sm text-white">{issue.title}</h4>
                      {step >= 1 && (
                        <span className={`font-display text-[10px] tracking-wider ${
                          isExpanded ? 'text-violet-400' : 'text-slate-600'
                        }`}>
                          #{issue.rank}
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs text-slate-500 mt-0.5">{issue.detail}</p>
                    {step >= 1 && (
                      <p className="font-sans text-xs text-amber-400/80 mt-1">{issue.impact}</p>
                    )}
                  </div>
                </div>

                {/* Expanded lever */}
                <AnimatePresence>
                  {isExpanded && !isResolved && step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 pt-3 border-t border-violet-500/10"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap className="w-3 h-3 text-violet-400" />
                        <span className="font-display text-[10px] tracking-[0.12em] text-violet-400">LEVER</span>
                      </div>
                      <p className="font-sans text-sm text-white/90 mb-2">{issue.lever}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-xs text-emerald-400">{issue.impactNum}</span>
                        <button
                          onClick={handleApply}
                          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-sans text-xs font-medium transition-colors"
                        >
                          Apply
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
