import { DollarSign, UserMinus, Lock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
    icon: MapPin,
    title: 'I\'m scaling blind.',
    body: 'Revenue grows but you can\'t tell which location is healthy, which one needs help, or why.',
  },
];

export function ProblemStatement() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
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
            <Link
              to="/product"
              className="inline-flex items-center gap-1.5 font-sans text-sm text-violet-400 hover:text-violet-300 transition-colors mt-6"
            >
              See how Zura solves this
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Right — Pain points */}
          <div className="space-y-5">
            {painPoints.map((point, i) => (
              <div
                key={point.title}
                className="mkt-reveal flex gap-4 items-start"
                style={{ transitionDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="w-10 h-10 shrink-0 bg-violet-500/10 rounded-lg flex items-center justify-center mt-0.5">
                  <point.icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-display text-base tracking-[0.08em] mb-1.5">
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
