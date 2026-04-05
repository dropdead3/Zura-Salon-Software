import { BarChart3, Brain, Users, Shield, GraduationCap, Megaphone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const solutions = [
  {
    icon: BarChart3,
    category: 'Data & Visibility',
    problem: 'Where is my money going?',
    solution: 'Real-time dashboards with service-level margin, revenue, and utilization across every location. Stop guessing. Start seeing.',
    span: 'lg:col-span-2',
  },
  {
    icon: Brain,
    category: 'Actionable Intelligence',
    problem: 'What should I fix first?',
    solution: 'Weekly briefs that rank your problems by impact and tell you exactly which lever to pull — not more dashboards to interpret.',
    span: 'lg:col-span-1',
  },
  {
    icon: Users,
    category: 'Team & Talent',
    problem: 'Why do my best people leave?',
    solution: 'Performance tiers, transparent career paths, commission architecture, and retention tracking that gives your team a reason to stay.',
    span: 'lg:col-span-1',
  },
  {
    icon: Shield,
    category: 'Management & Leadership',
    problem: 'I can\'t step away from the business.',
    solution: 'Drift detection, capacity planning, and delegation tools that free you from being the bottleneck in every decision.',
    span: 'lg:col-span-2',
  },
  {
    icon: GraduationCap,
    category: 'Onboarding & Training',
    problem: 'New hires take forever to ramp.',
    solution: 'Structured onboarding flows, a training hub, and standards enforcement so new team members produce in weeks — not months.',
    span: 'lg:col-span-2',
  },
  {
    icon: Megaphone,
    category: 'Marketing & Growth',
    problem: 'Marketing feels like throwing darts.',
    solution: 'Client acquisition campaigns, hiring pipelines, and ROI attribution in one system — so every dollar spent connects to a result.',
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
            Every problem you face. One system to solve it.
          </h2>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {PLATFORM_NAME} replaces scattered tools with structured infrastructure across six core operating domains.
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
