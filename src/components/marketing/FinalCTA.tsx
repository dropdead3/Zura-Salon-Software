import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from './useScrollReveal';

export function FinalCTA() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28 overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.04] to-transparent -z-10" />

      <div className="max-w-3xl mx-auto text-center mkt-reveal">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6">
          See what{' '}
          <span className="bg-gradient-to-r from-violet-400 to-[hsl(var(--mkt-dusky))] bg-clip-text text-transparent">
            clarity
          </span>{' '}
          looks like.
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-2">
          No commitment. No credit card.
        </p>
        <p className="font-sans text-sm text-slate-500 max-w-xl mx-auto mb-10">
          Join 50+ salon locations already running on Zura.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 rounded-full font-sans text-base font-medium transition-all"
          >
            Get a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full border border-[hsl(var(--mkt-lavender)/0.3)] text-[hsl(var(--mkt-lavender))] hover:border-[hsl(var(--mkt-lavender)/0.5)] hover:bg-[hsl(var(--mkt-lavender)/0.05)] font-sans text-base font-medium transition-all"
          >
            Try the Interactive Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
