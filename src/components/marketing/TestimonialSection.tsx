import { useState, useEffect } from 'react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const testimonials = [
  {
    quote: `${PLATFORM_NAME} showed us exactly where we were losing margin. We recovered $84K in the first quarter.`,
    attribution: 'Multi-Location Operator',
    detail: '4 locations',
  },
  {
    quote: `Before ${PLATFORM_NAME}, scaling meant more chaos. Now every new location launches with structure already in place.`,
    attribution: 'Salon Group CEO',
    detail: '8 locations',
  },
  {
    quote: `The weekly intelligence brief changed how I run my Monday meetings. One lever, clear action, every single week.`,
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

        <div className="min-h-[140px] sm:min-h-[120px] flex items-center justify-center">
          <blockquote
            key={active}
            className="font-serif text-xl sm:text-2xl lg:text-3xl text-white/90 italic leading-relaxed animate-fade-in"
          >
            &ldquo;{current.quote}&rdquo;
          </blockquote>
        </div>

        <p className="font-sans text-sm text-slate-400 mt-6">
          — {current.attribution}, {current.detail}
        </p>

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
