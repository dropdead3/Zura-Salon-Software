import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { DashboardMockup } from './DashboardMockup';

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 sm:px-8 text-center pt-20 sm:pt-28 lg:pt-36 pb-8 sm:pb-12 max-w-5xl mx-auto overflow-visible">
      {/* Ambient glow beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[500px] bg-gradient-to-b from-violet-500/20 via-violet-500/5 to-transparent rounded-full blur-[100px] -z-10 mkt-ambient-glow" />

      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 font-sans text-sm mb-8 mkt-fade-in mkt-border-shimmer">
        <Zap className="w-3.5 h-3.5" />
        Built with real salon owners
      </div>

      <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.08] mb-6 mkt-fade-in mkt-delay-1">
        Run your salon with{' '}
        <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
          clarity, not chaos.
        </span>
      </h1>

      <p className="font-sans text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed mkt-fade-in mkt-delay-2">
        One platform that connects your schedule, team, inventory, and business performance
        — so you always know what's working and what needs attention.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mkt-fade-in mkt-delay-3">
        <Link
          to="/demo"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
        >
          Get a Demo
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

      {/* Trust line */}
      <p className="font-sans text-xs text-slate-500 mt-6 mkt-fade-in mkt-delay-4">
        No credit card required · See your salon clearly from day one
      </p>

      {/* Dashboard mockup */}
      <div className="w-full mt-14 sm:mt-20 mkt-fade-in mkt-delay-5">
        <DashboardMockup />
      </div>
    </section>
  );
}
