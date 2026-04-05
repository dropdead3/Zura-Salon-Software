import { useState, useEffect } from 'react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const testimonials = [
  {
    quote: 'I used to spend every Monday morning in spreadsheets trying to figure out which location was bleeding margin. Now I open one screen and know exactly what to fix.',
    attribution: 'Multi-Location Owner',
    detail: '4 locations',
  },
  {
    quote: `We lost three senior stylists in six months. Once we built transparent career paths and commission tiers with ${PLATFORM_NAME}, retention flipped.`,
    attribution: 'Salon Group CEO',
    detail: '8 locations',
  },
  {
    quote: 'Our new hires used to take 90 days to get productive. With structured onboarding, we cut that to 30. The training hub changed everything.',
    attribution: 'Regional Director',
    detail: '6 locations',
  },
];

export function TestimonialSection() {
  const ref = useScrollReveal();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const current = testimonials[active];

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-3xl mx-auto text-center mkt-reveal">
        <p className="font-sans text-xs sm:text-sm text-violet-400 uppercase tracking-[0.15em] mb-8">
          Operator Voices
        </p>

        {/* Decorative quote mark */}
        <div className="relative">
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 font-serif text-[120px] leading-none text-violet-500/[0.06] select-none pointer-events-none">
            &ldquo;
          </span>

          <div className="min-h-[140px] sm:min-h-[120px] flex items-center justify-center">
            <blockquote
              key={active}
              className="font-serif text-xl sm:text-2xl lg:text-3xl text-white/90 italic leading-relaxed animate-fade-in"
            >
              &ldquo;{current.quote}&rdquo;
            </blockquote>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <p className="font-sans text-sm text-slate-400">
            — {current.attribution}
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 font-sans text-xs text-violet-300">
            {current.detail}
          </span>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === active ? 'bg-violet-400 w-6' : 'bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
