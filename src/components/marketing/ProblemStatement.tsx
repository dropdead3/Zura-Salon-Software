import { DollarSign, UserMinus, Lock, BookOpen, Megaphone, MapPin } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

const painPoints = [
  {
    icon: DollarSign,
    title: 'Where is my money going?',
    body: 'No service-level margin data. You guess at profitability while revenue bleeds through cracks you can\'t see.',
  },
  {
    icon: UserMinus,
    title: 'My best stylist just quit.',
    body: 'No career paths, no transparent comp, no growth plan. Your top talent leaves for clarity you never offered.',
  },
  {
    icon: Lock,
    title: 'I can\'t step away.',
    body: 'Every decision runs through you. Vacations are a liability. Your business can\'t scale past your availability.',
  },
  {
    icon: BookOpen,
    title: 'Training is chaos.',
    body: 'New hires take months to ramp. No structured onboarding, no standards, no accountability.',
  },
  {
    icon: Megaphone,
    title: 'Marketing feels random.',
    body: 'You post, boost, hope — and have no idea what actually drives bookings or whether you can even handle the demand.',
  },
  {
    icon: MapPin,
    title: 'I\'m scaling blind.',
    body: 'Revenue grows but you can\'t tell which location is healthy, which is bleeding, or why.',
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
              You already know the problems.{' '}
              <span className="text-slate-500">You just don't have the infrastructure to solve them.</span>
            </h2>
          </div>

          {/* Right — Pain points */}
          <div className="space-y-5">
            {painPoints.map((point, i) => (
              <div
                key={point.title}
                className="mkt-reveal flex gap-4 items-start"
                style={{ transitionDelay: `${0.1 + i * 0.1}s` }}
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

            {/* Closing line */}
            <div className="mkt-reveal pt-4 border-t border-white/[0.06]" style={{ transitionDelay: '0.75s' }}>
              <p className="font-sans text-sm text-violet-400 italic">
                These aren't six separate problems. They're one missing operating system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
