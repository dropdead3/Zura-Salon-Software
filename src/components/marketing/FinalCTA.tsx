import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const dots = Array.from({ length: 20 }, (_, i) => ({
  left: `${Math.random() * 100}%`,
  dur: `${6 + Math.random() * 6}s`,
  delay: `${Math.random() * 6}s`,
}));

export function FinalCTA() {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-24 sm:py-32 lg:py-40 overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.06] to-violet-500/[0.02] -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] -z-10" />

      {/* Floating dots */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {dots.map((dot, i) => (
          <div
            key={i}
            className="mkt-float-dot"
            style={{
              left: dot.left,
              bottom: '0',
              '--dur': dot.dur,
              '--delay': dot.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="max-w-3xl mx-auto text-center mkt-reveal">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6">
          Your data has answers. Your team needs structure. Let us show you.
        </h2>
        <p className="font-sans text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-4">
          Request a 15-minute walkthrough. We'll show you exactly where margin, growth, and clarity are waiting.
        </p>
        <p className="font-sans text-sm text-slate-500 mb-10">
          No commitment. No credit card.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
          >
            Request a Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/product"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-sans text-base font-medium transition-colors"
          >
            Explore the Platform
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
