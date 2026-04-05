import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker, AlertTriangle, HelpCircle, PackageX,
  CheckCircle2, Bell, BookOpen, TrendingDown,
  Calendar, Clock, UserX, DollarSign,
  Zap, BarChart3, ArrowUpRight, Users,
  Eye, HeartCrack, MessageSquareOff,
  Award, ShieldCheck, GraduationCap,
} from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
import { PLATFORM_NAME } from '@/lib/brand';

/* ── Scenario data ──────────────────────────────────────────────────────────── */

interface MetricItem {
  icon: React.ElementType;
  label: string;
  detail: string;
}

interface Scenario {
  domain: string;
  subtitle: string;
  without: { stat: string; statLabel: string; items: MetricItem[] };
  withZura: { stat: string; statLabel: string; items: MetricItem[] };
}

const scenarios: Scenario[] = [
  {
    domain: 'Your Backroom',
    subtitle: 'Color Bar',
    without: {
      stat: '$1,200',
      statLabel: 'wasted per month',
      items: [
        { icon: Beaker, label: 'Overmixing', detail: 'No measurement tracking' },
        { icon: PackageX, label: 'Out of stock', detail: 'Reorders happen too late' },
        { icon: HelpCircle, label: 'Guessing ratios', detail: 'No formula memory' },
        { icon: AlertTriangle, label: 'Waste invisible', detail: 'No cost-per-bowl data' },
      ],
    },
    withZura: {
      stat: '30%',
      statLabel: 'less product waste',
      items: [
        { icon: CheckCircle2, label: 'Tracked sessions', detail: 'Every bowl measured' },
        { icon: Bell, label: 'Reorder alerts', detail: 'Before you run out' },
        { icon: BookOpen, label: 'Formula memory', detail: 'Per client, per visit' },
        { icon: TrendingDown, label: 'Waste tracked', detail: 'Cost per service visible' },
      ],
    },
  },
  {
    domain: 'Your Calendar',
    subtitle: 'Scheduling',
    without: {
      stat: '14',
      statLabel: 'gaps this week',
      items: [
        { icon: Calendar, label: 'Untracked gaps', detail: 'Revenue sitting on the table' },
        { icon: UserX, label: 'No-shows ignored', detail: 'No follow-up system' },
        { icon: Clock, label: 'Uneven books', detail: 'Some overbooked, some empty' },
        { icon: DollarSign, label: 'Revenue lost', detail: 'Nobody sees it happening' },
      ],
    },
    withZura: {
      stat: '$4,200',
      statLabel: 'recovered per month',
      items: [
        { icon: Zap, label: 'Gaps detected', detail: 'Flagged automatically' },
        { icon: Bell, label: 'Rebook prompts', detail: 'Sent before it is too late' },
        { icon: BarChart3, label: 'Balanced books', detail: 'Utilization leveled' },
        { icon: ArrowUpRight, label: 'Revenue captured', detail: 'Every slot monetized' },
      ],
    },
  },
  {
    domain: 'Your Team',
    subtitle: 'Performance',
    without: {
      stat: '0',
      statLabel: 'visibility into struggles',
      items: [
        { icon: Eye, label: 'Blind spots', detail: 'No idea who needs help' },
        { icon: HeartCrack, label: 'Silent churn', detail: 'Retention drops unnoticed' },
        { icon: MessageSquareOff, label: 'Reactive coaching', detail: 'Problems found too late' },
        { icon: Users, label: 'Slow ramp', detail: 'New hires left on their own' },
      ],
    },
    withZura: {
      stat: '67%',
      statLabel: 'faster ramp-up',
      items: [
        { icon: Award, label: 'Ranked performance', detail: 'Clear picture, no guessing' },
        { icon: ShieldCheck, label: 'Early warnings', detail: 'Retention dips surfaced' },
        { icon: GraduationCap, label: 'Coaching paths', detail: 'Structured, not improvised' },
        { icon: ArrowUpRight, label: 'Faster growth', detail: 'New hires hit stride sooner' },
      ],
    },
  },
];

/* ── Toggle card ────────────────────────────────────────────────────────────── */

function ToggleCard({ scenario }: { scenario: Scenario }) {
  const [mode, setMode] = useState<'without' | 'with'>('without');
  const isWith = mode === 'with';
  const data = isWith ? scenario.withZura : scenario.without;

  const toggleOptions = [
    { value: 'without', label: `Without ${PLATFORM_NAME}` },
    { value: 'with', label: `With ${PLATFORM_NAME}` },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <p className="font-display text-[10px] tracking-[0.15em] text-slate-500 uppercase mb-1">
          {scenario.domain}
        </p>
        <p className="font-sans text-base text-slate-200 font-medium">{scenario.subtitle}</p>
      </div>

      {/* Toggle */}
      <div className="px-5 pt-4 flex justify-center">
        <TogglePill
          options={toggleOptions}
          value={mode}
          onChange={(v) => setMode(v as 'without' | 'with')}
          size="sm"
          variant="glass"
        />
      </div>

      {/* Content */}
      <div className="px-5 pt-5 pb-6 flex-1 flex flex-col">
        {/* Big stat */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-5"
          >
            <span
              className={`font-display text-3xl tracking-tight ${
                isWith ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {data.stat}
            </span>
            <p className="font-sans text-xs text-slate-500 mt-1">{data.statLabel}</p>
          </motion.div>
        </AnimatePresence>

        {/* Metric items */}
        <AnimatePresence mode="wait">
          <motion.ul
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 flex-1"
          >
            {data.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: isWith ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3"
                >
                  <div
                    className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                      isWith
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-sans text-sm text-slate-200">{item.label}</p>
                    <p className="font-sans text-xs text-slate-500">{item.detail}</p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────────────────── */

export function BeforeAfterShowcase() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="font-display text-[11px] sm:text-xs text-[hsl(var(--mkt-dusky))] uppercase tracking-[0.15em] mb-4">
            See the difference
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Toggle it. Feel it.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Every salon runs into the same problems. Here's what changes when you stop guessing.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((s) => (
            <ToggleCard key={s.domain} scenario={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
