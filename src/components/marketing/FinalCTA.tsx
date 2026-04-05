import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

export function FinalCTA() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-20 sm:py-28 lg:py-32 overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.06] to-violet-500/[0.02] -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-3xl mx-auto text-center mkt-reveal">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6">
          See what {PLATFORM_NAME} sees in your business
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-10">
          Request a walkthrough. We will show you the levers hiding in your operations.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            Request a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/product"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-sans text-base font-medium transition-colors"
          >
            Explore the Platform
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
