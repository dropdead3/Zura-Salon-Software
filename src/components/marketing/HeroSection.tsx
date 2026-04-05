import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { PLATFORM_NAME } from '@/lib/brand';

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 sm:px-8 text-center min-h-screen max-w-5xl mx-auto overflow-visible">
      {/* Ambient glow beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[500px] bg-gradient-to-b from-violet-500/20 via-[hsl(var(--mkt-twilight)/0.1)] to-transparent rounded-full blur-[100px] -z-10 mkt-ambient-glow" />

      <div className="flex flex-col items-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 font-sans text-sm mb-6 mkt-fade-in">
          <Zap className="w-3.5 h-3.5" />
          Used by 50+ salon locations daily
        </div>

        {/* Category descriptor */}
        <p className="font-display text-xs tracking-[0.2em] uppercase text-slate-500 mb-6 mkt-fade-in mkt-delay-1">
          Salon Management Platform
        </p>

        <h1 className="font-display text-[1.6rem] xs:text-[1.75rem] sm:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.12] mb-6 mkt-fade-in mkt-delay-1">
          <span className="block">Run your salon</span>
          <span className="block bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">with clarity.</span>
        </h1>

        <p className="font-sans text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed mkt-fade-in mkt-delay-2">
          The all-in-one salon management platform — scheduling, team performance, payroll, inventory, and AI-powered insights — built for salons ready to scale.
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
            to="/explore"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto rounded-full border border-[hsl(var(--mkt-lavender)/0.3)] text-[hsl(var(--mkt-lavender))] hover:border-[hsl(var(--mkt-lavender)/0.5)] hover:bg-[hsl(var(--mkt-lavender)/0.05)] font-sans text-base font-medium transition-all"
          >
            Try the Interactive Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Scroll anchor */}
      <motion.div
        className="absolute bottom-8 inset-x-0 mx-auto w-fit flex flex-col items-center gap-1 cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        onClick={() => document.getElementById('dashboard-showcase')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="font-display text-[11px] text-slate-500 tracking-widest uppercase">Scroll to explore</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 rotate-90" />
      </motion.div>
    </section>
  );
}
