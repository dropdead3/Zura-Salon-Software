import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
  eyebrow: string;
  headline: string;
  description: string;
  items: ProblemSolution[];
  testimonial?: {
    quote: string;
    attribution: string;
    detail: string;
  };
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

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <MarketingLayout>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative z-10 px-6 sm:px-8 pt-20 pb-12 sm:pt-28 sm:pb-16 lg:pt-36 lg:pb-20">
        <div className="max-w-3xl mx-auto text-center mkt-reveal">
          <p className="font-display text-[11px] sm:text-xs text-violet-400 uppercase tracking-[0.15em] mb-4">
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
              className="mkt-reveal p-6 sm:p-8 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-5">
                <item.icon className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-display text-sm sm:text-base tracking-wide mb-2">
                {item.problem}
              </h3>
              <p className="font-sans text-sm text-slate-400 leading-relaxed mb-4">
                {item.solution}
              </p>
              {item.stat && (
                <p className="font-sans text-xs text-violet-400/80">
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
            <blockquote className="font-serif text-xl sm:text-2xl text-white/90 italic leading-relaxed">
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
      <section ref={ctaRef} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
        <div className="max-w-2xl mx-auto text-center mkt-reveal">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-4">
            Ready to see it in action?
          </h2>
          <p className="font-sans text-sm text-slate-500 mb-8">
            No commitment. No credit card.
          </p>
          <Link
            to="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-gradient-to-r from-[hsl(var(--mkt-twilight))] to-[hsl(var(--mkt-dusky))] text-white hover:opacity-90 shadow-lg shadow-[hsl(var(--mkt-dusky)/0.25)] rounded-full font-sans text-base font-medium transition-all"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
