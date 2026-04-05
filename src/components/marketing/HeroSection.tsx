import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { DashboardMockup } from './DashboardMockup';

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 sm:px-8 text-center pt-24 sm:pt-32 lg:pt-40 pb-8 sm:pb-12 max-w-5xl mx-auto overflow-visible">
      {/* Ambient glow beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[500px] bg-gradient-to-b from-violet-500/20 via-[hsl(var(--mkt-twilight)/0.1)] to-transparent rounded-full blur-[100px] -z-10 mkt-ambient-glow" />

      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 font-sans text-sm mb-8 mkt-fade-in">
        <Zap className="w-3.5 h-3.5" />
        Trusted by 50+ salon locations
      </div>

      <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.08] mb-6 mkt-fade-in mkt-delay-1">
        Run your salon with{' '}
        <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">clarity, not chaos.</span>
      </h1>

      <p className="font-sans text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed mkt-fade-in mkt-delay-2">
        One platform that connects your schedule, team, inventory, and business performance
        — so you always know what's working and what needs attention.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mkt-fade-in mkt-delay-2">
        <Link
          to="/demo"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 rounded-full font-sans text-base font-medium transition-all"
        >
          Get a Demo
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/product"
          className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto rounded-full border border-[hsl(var(--mkt-lavender)/0.3)] text-[hsl(var(--mkt-lavender))] hover:border-[hsl(var(--mkt-lavender)/0.5)] hover:bg-[hsl(var(--mkt-lavender)/0.05)] font-sans text-base font-medium transition-all"
        >
          Explore the Platform
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Dashboard mockup */}
      <div className="w-full mt-14 sm:mt-20 mkt-fade-in mkt-delay-3">
        <DashboardMockup />
      </div>
    </section>
  );
}
