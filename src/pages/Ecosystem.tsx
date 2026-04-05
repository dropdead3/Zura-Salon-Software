import { Link } from 'react-router-dom';
import { Brain, Megaphone, FlaskConical, Cog, ArrowRight, Check } from 'lucide-react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import {
  PLATFORM_NAME,
  EXECUTIVE_BRIEF_NAME,
  MARKETING_OS_NAME,
  SIMULATION_ENGINE_NAME,
  AUTOMATION_LAYER_NAME,
} from '@/lib/brand';

const surfaces = [
  {
    icon: Brain,
    name: EXECUTIVE_BRIEF_NAME,
    shortName: 'Weekly Intelligence',
    phase: 'Live',
    phaseColor: 'bg-emerald-500/20 text-emerald-400',
    description:
      'A clear weekly summary of what\'s happening across your business — what\'s working, what\'s not, and what to focus on next. Delivered every Monday.',
    features: [
      'Top issues ranked by business impact',
      'Performance trends across locations',
      'Clear recommendations with reasoning',
      'Full context behind every insight',
    ],
  },
  {
    icon: Megaphone,
    name: MARKETING_OS_NAME,
    shortName: 'Marketing',
    phase: 'Coming Soon',
    phaseColor: 'bg-violet-500/20 text-violet-400',
    description:
      'Campaign tools that connect to your business data — so you only drive demand when your team can actually handle it.',
    features: [
      'Ready-to-use creative and copy',
      'Built-in distribution to Meta and TikTok',
      'Track what actually drives bookings',
      'Checks capacity and margin before spending',
    ],
  },
  {
    icon: FlaskConical,
    name: SIMULATION_ENGINE_NAME,
    shortName: 'What-If Modeling',
    phase: 'Coming Soon',
    phaseColor: 'bg-amber-500/20 text-amber-400',
    description:
      'Test ideas before you commit. Model pricing, staffing, and expansion scenarios against your real numbers.',
    features: [
      'Pricing impact modeling',
      'Staffing scenario planning',
      'Expansion feasibility checks',
      'See projected outcomes before you act',
    ],
  },
  {
    icon: Cog,
    name: AUTOMATION_LAYER_NAME,
    shortName: 'Smart Automation',
    phase: 'Coming Soon',
    phaseColor: 'bg-slate-500/20 text-slate-400',
    description:
      'Automate the repetitive stuff — within boundaries you set. Automation helps you run your business. It doesn\'t make decisions for you.',
    features: [
      'Automated actions with approval steps',
      'You define the rules and limits',
      'Full audit trail for every action',
      'Override or pause at any time',
    ],
  },
];

export default function Ecosystem() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative z-10 px-6 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-6">
            Ecosystem
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6 leading-[1.1]">
            A set of powerful tools that all work together
          </h1>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Each piece is strong on its own. But together, they give you a complete picture of your business.
          </p>
        </div>
      </section>

      {/* Surface cards */}
      <section className="relative z-10 px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto space-y-6">
          {surfaces.map((surface) => (
            <div
              key={surface.shortName}
              className="p-6 sm:p-10 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:border-violet-500/20 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                {/* Icon + phase */}
                <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3 shrink-0">
                  <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center">
                    <surface.icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <span
                    className={`inline-flex items-center h-6 px-3 rounded-full font-sans text-xs font-medium tracking-wide ${surface.phaseColor}`}
                  >
                    {surface.phase}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg sm:text-xl tracking-wide mb-3">
                    {surface.shortName}
                  </h2>
                  <p className="font-sans text-sm sm:text-base text-slate-400 leading-relaxed mb-6">
                    {surface.description}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {surface.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                        <span className="font-sans text-sm text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compounding callout */}
      <section className="relative z-10 px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl tracking-tight mb-4">
            Everything connects
          </h2>
          <p className="font-sans text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl mx-auto">
            Your intelligence feeds your marketing. Your marketing checks against your operations.
            Your models test before you act. Your automation stays within the lines you draw.
            The whole system gets smarter every week.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 sm:px-8 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-6">
            See how it all works together
          </h2>
          <p className="font-sans text-base text-slate-400 max-w-xl mx-auto mb-10">
            Get a walkthrough and we'll show you how each tool applies to your salon.
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
