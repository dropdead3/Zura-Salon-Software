import { Eye, GitCompare, AlertTriangle, Sparkles } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const pillars = [
  {
    num: '01',
    icon: Eye,
    title: 'Observe',
    description: 'Watches your revenue, your schedule, your team, and your costs — all the time, in real time.',
  },
  {
    num: '02',
    icon: GitCompare,
    title: 'Compare',
    description: 'Measures each location and team member against your own benchmarks and standards.',
  },
  {
    num: '03',
    icon: AlertTriangle,
    title: 'Detect',
    description: 'Catches problems early — before they become expensive. Flags anything drifting off track.',
  },
  {
    num: '04',
    icon: Sparkles,
    title: 'Recommend',
    description: 'Tells you what to focus on next. One clear action, ranked by impact. No noise.',
  },
];

export function IntelligencePillars() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 mkt-reveal">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            How it works
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            How {PLATFORM_NAME} helps you run smarter
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {PLATFORM_NAME} watches your business, spots what's off, and tells you what to focus on.
          </p>
        </div>

        {/* Connected flow — desktop horizontal, mobile vertical */}
        <div className="relative flex flex-col lg:flex-row gap-4 lg:gap-0 items-stretch">
          {pillars.map((pillar, i) => (
            <div key={pillar.title} className="flex items-center lg:flex-1" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="mkt-reveal relative flex-1 p-6 sm:p-8 rounded-2xl mkt-glass text-center hover:bg-white/[0.05] transition-colors">
                {/* Icon */}
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-xl mkt-pulse-ring" />
                  <div className="relative w-full h-full bg-violet-500/10 rounded-xl flex items-center justify-center">
                    <pillar.icon className="w-7 h-7 text-violet-400" />
                  </div>
                </div>
                <span className="font-display text-3xl text-violet-500/10 absolute top-4 right-4 leading-none">
                  {pillar.num}
                </span>
                <h3 className="font-display text-sm tracking-[0.15em] mb-3">
                  {pillar.title}
                </h3>
                <p className="font-sans text-sm text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
              {/* Connector line with flowing dot */}
              {i < pillars.length - 1 && (
                <div className="hidden lg:flex items-center w-10 shrink-0 px-1">
                  <div className="mkt-connector-line w-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
