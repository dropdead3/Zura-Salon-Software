import { TrendingDown, UserMinus, Lock } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

const painPoints = [
  {
    icon: TrendingDown,
    title: 'Margin Erosion',
    body: 'Without service-level profitability data, margin erodes silently across every location.',
  },
  {
    icon: UserMinus,
    title: 'Talent Attrition',
    body: 'Without structured career paths and transparent performance data, top performers leave for clarity.',
  },
  {
    icon: Lock,
    title: 'Growth Ceiling',
    body: 'Without ranked intelligence, every expansion decision is a guess. Revenue scales. Systems do not.',
  },
];

export function ProblemStatement() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — Emotional headline */}
          <div className="mkt-reveal">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl tracking-tight leading-[1.12]">
              The beauty industry mastered artistry.{' '}
              <span className="text-slate-500">It did not master infrastructure.</span>
            </h2>
          </div>

          {/* Right — Pain points */}
          <div className="space-y-6">
            {painPoints.map((point, i) => (
              <div
                key={point.title}
                className="mkt-reveal flex gap-4 items-start"
                style={{ transitionDelay: `${0.1 + i * 0.12}s` }}
              >
                <div className="w-10 h-10 shrink-0 bg-violet-500/10 rounded-xl flex items-center justify-center mt-0.5">
                  <point.icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-display text-sm tracking-[0.1em] mb-1.5">
                    {point.title}
                  </h3>
                  <p className="font-sans text-sm text-slate-400 leading-relaxed">
                    {point.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
