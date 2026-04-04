import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { PLATFORM_NAME, PLATFORM_DESCRIPTOR } from '@/lib/brand';

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 sm:px-8 text-center py-20 sm:py-28 lg:py-36 max-w-4xl mx-auto">
      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 font-sans text-sm mb-8 mkt-fade-in">
        <Zap className="w-3.5 h-3.5" />
        Intelligence Infrastructure
      </div>

      <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.08] mb-6 mkt-fade-in mkt-delay-1">
        The Operating System for{' '}
        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
          Scaling Salon Businesses
        </span>
      </h1>

      <p className="font-sans text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed mkt-fade-in mkt-delay-2">
        {PLATFORM_NAME} eliminates operational chaos by embedding structure into
        workflows and surfacing the exact lever to pull next.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mkt-fade-in mkt-delay-3">
        <Link
          to="/demo"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
        >
          Request Demo
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/product"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-sans text-base font-medium transition-colors"
        >
          Explore Platform
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
