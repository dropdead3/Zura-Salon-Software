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

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 mkt-reveal">
          <p className="font-display text-[11px] sm:text-xs text-violet-400 uppercase tracking-[0.15em]">
            Owner Stories
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mkt-reveal" style={{ transitionDelay: '0.1s' }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <blockquote className="font-serif text-base sm:text-lg text-white/90 italic leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <p className="font-sans text-sm text-slate-400">
                  — {t.attribution}
                </p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 font-sans text-xs text-violet-300">
                  {t.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
