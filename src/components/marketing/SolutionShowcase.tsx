import { BarChart3, Brain, Users, Shield, GraduationCap, Megaphone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const solutions = [
  {
    icon: BarChart3,
    category: 'See What\'s Actually Happening',
    problem: 'No more digging through reports or guessing.',
    solution: 'Know which stylists are fully booked and who needs support. See where revenue is coming from. Understand rebooking, retention, and growth at a glance.',
    span: 'lg:col-span-2',
  },
  {
    icon: Brain,
    category: 'Know What to Focus on Next',
    problem: 'Not just reports. Direction.',
    solution: 'Instead of more dashboards to interpret, get clear recommendations on what to fix first — ranked by what matters most to your business.',
    span: 'lg:col-span-1',
  },
  {
    icon: Users,
    category: 'Manage Your Team With Confidence',
    problem: 'You don\'t have to "feel" who\'s doing well.',
    solution: 'Track performance in a way that makes sense. Support team members who are falling behind. Recognize and grow your top performers.',
    span: 'lg:col-span-1',
  },
  {
    icon: Shield,
    category: 'Keep Your Schedule Working for You',
    problem: 'A full book is good. A smart book is better.',
    solution: 'Identify gaps and missed opportunities. Understand booking patterns. Keep chairs filled with the right services.',
    span: 'lg:col-span-2',
  },
  {
    icon: GraduationCap,
    category: 'Control Your Inventory',
    problem: 'No more over-ordering or running out mid-service.',
    solution: 'Track exactly what\'s being used. Know when to reorder. Understand your true product costs.',
    span: 'lg:col-span-2',
  },
  {
    icon: Megaphone,
    category: 'Everything Works Together',
    problem: 'Most systems feel like separate pieces.',
    solution: 'Your schedule, your team, your services, your inventory, your performance — all connected. Nothing lives in isolation.',
    span: 'lg:col-span-1',
  },
];

export function SolutionShowcase() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-24 lg:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 mkt-reveal">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            The Platform
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Everything your salon needs. Finally working together.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Instead of disconnected tools and guesswork, {PLATFORM_NAME} brings everything into one place — and shows you what to focus on next.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {solutions.map((item, i) => (
            <div
              key={item.category}
              className={`mkt-reveal p-6 sm:p-8 rounded-2xl mkt-glass group hover:bg-white/[0.04] transition-all duration-300 ${item.span}`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs text-violet-400 uppercase tracking-[0.12em] mb-1">
                    {item.category}
                  </p>
                  <h3 className="font-display text-sm sm:text-base tracking-wide mb-2">
                    {item.problem}
                  </h3>
                  <p className="font-sans text-sm text-slate-400 leading-relaxed mb-4">
                    {item.solution}
                  </p>
                  <Link
                    to="/product"
                    className="inline-flex items-center gap-1.5 font-sans text-xs text-violet-400 hover:text-violet-300 transition-colors group-hover:gap-2.5"
                  >
                    Explore
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
