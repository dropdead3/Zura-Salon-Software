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
          See what clarity looks like.
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-4">
          No commitment. No credit card.
        </p>
        <div className="mt-10">
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white text-slate-950 hover:bg-slate-100 rounded-full font-sans text-base font-medium transition-colors"
          >
            Get a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
