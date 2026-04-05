import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { MarketingLayout } from './MarketingLayout';
import { useScrollReveal } from './useScrollReveal';
import type { LucideIcon } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface ProblemSolution {
  icon: LucideIcon;
  problem: string;
  solution: string;
  stat?: string;
}

export interface SolutionPageProps {
  /** Eyebrow label above headline */
  eyebrow: string;
  /** Main headline */
  headline: string;
  /** Subheadline / description */
  description: string;
  /** Problem → Solution pairs */
  items: ProblemSolution[];
  /** Optional testimonial */
  testimonial?: {
    quote: string;
    attribution: string;
    detail: string;
  };
  /** CTA text override */
  ctaText?: string;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function SolutionPageTemplate({
  eyebrow,
  headline,
  description,
  items,
  testimonial,
  ctaText = 'Get a Demo',
}: SolutionPageProps) {
  const heroRef = useScrollReveal();
  const cardsRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <MarketingLayout>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative z-10 px-6 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-20">
        <div className="max-w-3xl mx-auto text-center mkt-reveal">
          <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-4">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6">
            {headline}
          </h1>
          <p className="font-sans text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {description}
          </p>
        </div>
      </section>

      {/* ── Problem / Solution Cards ─────────────────────────────── */}
      <section ref={cardsRef} className="relative z-10 px-6 sm:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((item, i) => (
            <div
              key={item.problem}
              className="mkt-reveal p-6 sm:p-8 rounded-2xl mkt-glass"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5">
                <item.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-display text-sm sm:text-base tracking-wide mb-2">
                {item.problem}
              </h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed mb-4">
                {item.solution}
              </p>
              {item.stat && (
                <p className="font-sans text-xs text-violet-400/80 italic">
                  {item.stat}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial (optional) ───────────────────────────────── */}
      {testimonial && (
        <section className="relative z-10 px-6 sm:px-8 py-12 sm:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <span className="font-serif text-[100px] leading-none text-violet-500/[0.06] select-none pointer-events-none">
              &ldquo;
            </span>
            <blockquote className="font-serif text-xl sm:text-2xl text-white/90 italic leading-relaxed -mt-12">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3 mt-6">
              <p className="font-sans text-sm text-slate-400">— {testimonial.attribution}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 font-sans text-xs text-violet-300">
                {testimonial.detail}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section ref={ctaRef} className="relative z-10 px-6 sm:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center mkt-reveal">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Ready to see it in action?
          </h2>
          <p className="font-sans text-sm text-slate-500 mb-8">
            No commitment. No credit card.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full font-sans text-base font-medium transition-all shadow-lg shadow-violet-500/25"
            >
              {ctaText}
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
    </MarketingLayout>
  );
}
