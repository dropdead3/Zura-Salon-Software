import { TrendingDown, UserMinus, Lock } from 'lucide-react';

const problems = [
  {
    icon: TrendingDown,
    title: 'Margin Erosion',
    body: 'Without margin visibility at the service level, profitability erodes silently across every location.',
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
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Operational chaos does not start where you think it does
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Most operators scale revenue before they scale systems. These are the consequences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="p-6 sm:p-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.05] transition-colors"
            >
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
                <problem.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-display text-base sm:text-lg tracking-wide mb-3">
                {problem.title}
              </h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed">
                {problem.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
