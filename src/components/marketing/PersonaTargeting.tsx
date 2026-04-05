import { Target, TrendingUp, Rocket, Crown } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const personas = [
  {
    icon: Target,
    label: 'The Overwhelmed Operator',
    tagline: 'Working nonstop. Still behind.',
    description: 'You need automation that removes chaos from your day — not another tool to manage.',
  },
  {
    icon: TrendingUp,
    label: 'The Plateaued Founder',
    tagline: 'Revenue stable. Growth stalled.',
    description: 'You need visibility into the levers that unlock your next phase of growth.',
  },
  {
    icon: Rocket,
    label: 'The Scaling Operator',
    tagline: 'Growing fast. Getting messy.',
    description: 'You need structured systems that hold together at 5, 10, and 20 locations.',
  },
  {
    icon: Crown,
    label: 'The Strategic Leader',
    tagline: 'Ready for intelligence infrastructure.',
    description: 'You need ranked, high-confidence decisions delivered weekly — not dashboards to interpret.',
  },
];

export function PersonaTargeting() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 mkt-reveal">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            Built for You
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Where are you in your journey?
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {PLATFORM_NAME} scales with operator maturity — from a single location to a multi-market portfolio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {personas.map((persona, i) => (
            <div
              key={persona.label}
              className="mkt-reveal mkt-persona-card p-6 rounded-2xl mkt-glass cursor-default"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <persona.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-display text-xs tracking-[0.12em] mb-1">
                {persona.label}
              </h3>
              <p className="font-serif text-sm text-violet-300 italic mb-3">
                {persona.tagline}
              </p>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">
                {persona.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
