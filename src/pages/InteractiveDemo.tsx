import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MarketingSEO } from '@/components/marketing/MarketingSEO';
import { DemoScheduleView } from '@/components/marketing/demo/DemoScheduleView';
import { DemoTeamView } from '@/components/marketing/demo/DemoTeamView';
import { DemoCommandView } from '@/components/marketing/demo/DemoCommandView';
import { PLATFORM_NAME } from '@/lib/brand';

type ScenarioId = 'schedule' | 'team' | 'command';

const scenarios: { id: ScenarioId; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Your Day', icon: Calendar },
  { id: 'team', label: 'Your Team', icon: Users },
  { id: 'command', label: 'What Needs Attention', icon: LayoutDashboard },
];

export default function InteractiveDemo() {
  const [active, setActive] = useState<ScenarioId>('schedule');
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  const handleSwitchScenario = useCallback((id: ScenarioId) => {
    setActive(id);
    setResetKey((k) => k + 1);
  }, []);

  return (
    <MarketingLayout>
      <MarketingSEO
        title={`Interactive Demo — ${PLATFORM_NAME}`}
        description={`Experience ${PLATFORM_NAME} before you sign up. Explore guided scenarios that show how the platform works.`}
        path="/explore"
      />

      <section className="relative px-6 sm:px-8 pt-24 sm:pt-32 pb-16 max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 font-sans text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-display text-2xl sm:text-4xl tracking-tight text-white mb-3">
            See {PLATFORM_NAME} in action
          </h1>
          <p className="font-sans text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Explore guided scenarios that show how {PLATFORM_NAME} watches, detects, and recommends — so you always know the next best move.
          </p>
        </div>

        {/* Scenario tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 justify-center">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSwitchScenario(s.id)}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-full font-sans text-sm font-medium transition-all whitespace-nowrap ${
                active === s.id
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/[0.06]'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Scenario panel */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active}-${resetKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {active === 'schedule' && <DemoScheduleView onReset={handleReset} />}
              {active === 'team' && <DemoTeamView onReset={handleReset} />}
              {active === 'command' && <DemoCommandView onReset={handleReset} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </MarketingLayout>
  );
}
