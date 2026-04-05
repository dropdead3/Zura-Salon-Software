import { LayoutDashboard, Brain, DollarSign, Users, AlertTriangle, Award, ArrowRight } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Multi-Location Command Center',
    description: 'Every location. Every KPI. One structured view with ranked deviations.',
    large: true,
  },
  {
    icon: Brain,
    title: 'Weekly Intelligence Briefs',
    description: 'Ranked levers delivered every Monday. One primary action, no noise.',
    large: true,
  },
  {
    icon: DollarSign,
    title: 'Margin Visibility',
    description: 'Service-level profitability across every location and provider.',
  },
  {
    icon: Users,
    title: 'Performance Architecture',
    description: 'Stylist benchmarking with structured growth paths and tier systems.',
  },
  {
    icon: AlertTriangle,
    title: 'Drift Detection',
    description: 'Automatic alerts when KPIs deviate from defined operational baselines.',
  },
  {
    icon: Award,
    title: 'Commission Architecture',
    description: 'Transparent, structured compensation models tied to performance tiers.',
  },
];

export function FeatureGrid() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 mkt-reveal">
          <p className="font-display text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            Capabilities
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Everything operators need to scale with clarity
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`mkt-reveal group relative p-6 sm:p-8 rounded-2xl mkt-glass hover:bg-white/[0.05] transition-colors ${
                feature.large && i < 2 ? 'lg:col-span-1' : ''
              }`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              {/* Gradient overlay for large cards */}
              {feature.large && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
              )}
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-display text-sm tracking-[0.1em] mb-3">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm text-slate-400 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <span className="inline-flex items-center gap-1 font-sans text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
