import { Eye, GitCompare, AlertTriangle, Sparkles } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';

const pillars = [
  {
    num: '01',
    icon: Eye,
    title: 'Observe',
    description: 'Continuous monitoring across revenue, utilization, retention, and margin.',
  },
  {
    num: '02',
    icon: GitCompare,
    title: 'Compare',
    description: 'Benchmark performance against your own architecture and cross-location standards.',
  },
  {
    num: '03',
    icon: AlertTriangle,
    title: 'Detect',
    description: 'Flag deviations before they become crises. Drift detection across every KPI.',
  },
  {
    num: '04',
    icon: Sparkles,
    title: 'Recommend',
    description: 'Ranked, high-confidence actions. One primary lever. No noise.',
  },
];

export function IntelligencePillars() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            Intelligence Architecture
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            How {PLATFORM_NAME} thinks
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            A structured intelligence loop that replaces reactive management with ranked clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="relative p-6 sm:p-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-center hover:border-violet-500/20 transition-colors"
            >
              <span className="absolute top-4 right-4 font-display text-4xl text-violet-500/10 leading-none">
                {pillar.num}
              </span>
              <div className="w-12 h-12 mx-auto bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
                <pillar.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-display text-sm tracking-[0.15em] mb-3">
                {pillar.title}
              </h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
