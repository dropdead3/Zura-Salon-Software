import { Link } from 'react-router-dom';
import { ArrowRight, Eye, GitCompare, AlertTriangle, Target } from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MarketingSEO } from '@/components/marketing/MarketingSEO';
import { PLATFORM_NAME } from '@/lib/brand';

const capabilities = [
  {
    icon: Eye,
    title: 'Watches everything in real time',
    description:
      'Revenue, scheduling, retention, payroll, inventory — all monitored across every location, all the time.',
  },
  {
    icon: GitCompare,
    title: 'Compares to your standards',
    description:
      'Every metric is measured against the benchmarks you set — not industry averages, but your operating plan.',
  },
  {
    icon: AlertTriangle,
    title: 'Catches problems early',
    description:
      'When something drifts off track, you know about it before it becomes expensive.',
  },
  {
    icon: Target,
    title: 'Tells you what to focus on',
    description:
      'One clear recommendation, ranked by impact. With the reasoning behind it — so you understand the why.',
  },
];

export default function Product() {
  return (
    <MarketingLayout>
      <MarketingSEO
        title="How It Works"
        description="Not just reports — direction. Zura watches your business, spots what's off, and tells you what to focus on next."
        path="/product"
      />
      {/* Hero */}
      <section className="relative z-10 px-6 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-6">
            Product
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6 leading-[1.1]">
            Not just reports. Direction.
          </h1>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Most salon software helps you track what already happened. {PLATFORM_NAME} helps you understand what to do next.
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
              {PLATFORM_NAME} watches your business, spots what's off, and tells you what to focus on.
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
              Not just data. Decisions.
            </h2>
            <div className="space-y-4 font-sans text-sm sm:text-base text-slate-400 leading-relaxed">
              <p>
                Most software shows you what happened. {PLATFORM_NAME} tells you what to do about it.
              </p>
              <p>
                Every recommendation comes with context — if the signal isn't strong enough, {PLATFORM_NAME} stays quiet.
                That's intentional. It means your business is running the way it should.
              </p>
              <p>
                When something does need attention, you get the full picture: what changed, how long it's been off,
                the financial impact, and what to do next. No guesswork.
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
            Get a walkthrough and we'll show you what's working, what needs attention, and where to start.
          </p>
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            Get a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
