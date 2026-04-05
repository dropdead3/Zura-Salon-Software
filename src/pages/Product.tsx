import { Link } from 'react-router-dom';
import { ArrowRight, Eye, GitCompare, AlertTriangle, Target } from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PLATFORM_NAME } from '@/lib/brand';

const capabilities = [
  {
    icon: Eye,
    title: 'Observe continuously',
    description:
      'Revenue, utilization, retention, payroll, inventory — monitored across every location in real time.',
  },
  {
    icon: GitCompare,
    title: 'Compare to architecture',
    description:
      'Every metric is measured against the structural targets you define. Not industry averages — your operating plan.',
  },
  {
    icon: AlertTriangle,
    title: 'Detect deviations',
    description:
      'When performance drifts from architecture, the system flags it before it becomes a crisis.',
  },
  {
    icon: Target,
    title: 'Recommend action',
    description:
      'One ranked lever. Confidence-qualified. Economically justified. Expandable logic so you understand the why.',
  },
];

export default function Product() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative z-10 px-6 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-6">
            Product
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6 leading-[1.1]">
            The operating brain for scaling operators
          </h1>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {PLATFORM_NAME} doesn't show you dashboards. It tells you exactly what lever to pull next — and why.
          </p>
        </div>
      </section>

      {/* Intelligence loop */}
      <section className="relative z-10 px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl tracking-tight mb-4">
              Observe. Compare. Detect. Recommend.
            </h2>
            <p className="font-sans text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              A continuous intelligence loop that turns operational noise into ranked, actionable leverage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="p-6 sm:p-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:border-violet-500/20 transition-colors"
              >
                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
                  <cap.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-display text-sm sm:text-base tracking-wide mb-3">
                  {cap.title}
                </h3>
                <p className="font-sans text-sm text-slate-400 leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section className="relative z-10 px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 sm:p-12 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <h2 className="font-display text-lg sm:text-xl tracking-wide mb-4 text-center">
              Not a dashboard. A decision engine.
            </h2>
            <div className="space-y-4 font-sans text-sm sm:text-base text-slate-400 leading-relaxed">
              <p>
                Most software shows you what happened. {PLATFORM_NAME} tells you what to do about it.
              </p>
              <p>
                Every recommendation is confidence-qualified — if the signal is weak, {PLATFORM_NAME} stays silent.
                Silence is meaningful. It means your operation is running within architecture.
              </p>
              <p>
                When a lever surfaces, it comes with expandable logic: the deviation, the time window,
                the economic impact, and the recommended action. No black boxes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-6">
            See what {PLATFORM_NAME} sees in your business
          </h2>
          <p className="font-sans text-base text-slate-400 max-w-xl mx-auto mb-10">
            Request a walkthrough. We will show you the levers hiding in your operations.
          </p>
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            Request a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
