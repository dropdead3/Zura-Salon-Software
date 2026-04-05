import { DollarSign, UserMinus, Lock, BookOpen, Megaphone, MapPin } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

const painPoints = [
  {
    icon: DollarSign,
    title: 'Where is my money going?',
    body: 'You can\'t see what\'s actually profitable. Revenue comes in, but you\'re not sure where it goes or what\'s being lost.',
  },
  {
    icon: UserMinus,
    title: 'My best stylist just quit.',
    body: 'No growth path, no clear comp structure, no way to show them a future. Your best people leave for something that feels more certain.',
  },
  {
    icon: Lock,
    title: 'I can\'t step away.',
    body: 'Every decision runs through you. Vacations feel risky. Your business can\'t grow past your personal bandwidth.',
  },
  {
    icon: BookOpen,
    title: 'Training is chaos.',
    body: 'New hires take months to get going. No structure, no standards, no way to measure when they\'re ready.',
  },
  {
    icon: Megaphone,
    title: 'Marketing feels like throwing darts.',
    body: 'You post, boost, hope — and have no idea what actually drives bookings or whether your team can handle the demand.',
  },
  {
    icon: MapPin,
    title: 'I\'m scaling blind.',
    body: 'Revenue grows but you can\'t tell which location is healthy, which one needs help, or why.',
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
              Running a salon shouldn't feel like guessing.
            </h2>
            <p className="font-sans text-base sm:text-lg text-slate-400 leading-relaxed mt-6">
              You're managing a full schedule, a team with different levels of performance, inventory that's always off, clients who don't always rebook, and numbers you don't fully trust.
            </p>
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
                Most systems show you information. They don't help you actually run your business.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
