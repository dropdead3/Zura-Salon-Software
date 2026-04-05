import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { useScrollReveal } from './useScrollReveal';

const testimonials = [
  {
    quote: 'I used to spend every Monday morning in spreadsheets trying to figure out which location was bleeding margin. Now I open one screen and know exactly what to fix.',
    name: 'Sarah M.',
    role: 'Multi-Location Owner',
    detail: '4 locations',
  },
  {
    quote: `We lost three senior stylists in six months. Once we built transparent career paths and commission tiers with ${PLATFORM_NAME}, retention flipped.`,
    name: 'Rachel T.',
    role: 'Salon Group CEO',
    detail: '8 locations',
  },
  {
    quote: 'Our new hires used to take 90 days to get productive. With structured onboarding, we cut that to 30. The training hub changed everything.',
    name: 'Jessica L.',
    role: 'Regional Director',
    detail: '6 locations',
  },
  {
    quote: 'Color waste was invisible to us. We had no idea how much product was going down the drain until we saw the numbers. That visibility alone paid for itself.',
    name: 'Amanda K.',
    role: 'Salon Owner',
    detail: '2 locations',
  },
  {
    quote: 'I can finally see which stylist needs help before they quit. The performance signals give me time to intervene instead of scrambling to backfill.',
    name: 'Nicole D.',
    role: 'Operations Manager',
    detail: '3 locations',
  },
];

const StarRating = () => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
    ))}
  </div>
);

function TestimonialCard({ t, delay }: { t: typeof testimonials[0]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-xl border border-white/[0.08] bg-white/[0.04] flex flex-col"
    >
      <StarRating />
      <blockquote className="font-sans text-base text-white/90 leading-relaxed mt-4 mb-6 flex-1">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
          <span className="font-sans text-sm text-white/70">{t.name.charAt(0)}</span>
        </div>
        <div>
          <p className="font-sans text-sm text-white/90">{t.name}</p>
          <p className="font-sans text-xs text-slate-500">{t.role} · {t.detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialSection() {
  const ref = useScrollReveal();
  const gridRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(gridRef, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="relative z-10 px-6 sm:px-8 py-20 lg:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 mkt-reveal">
          <p className="font-display text-[11px] sm:text-xs text-violet-400 uppercase tracking-[0.15em] mb-3">
            From operators
          </p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight">
            They had the same problems you do.
          </h2>
        </div>

        {/* Bento grid: 3 cols on desktop, 2 on tablet, 1 on mobile */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {/* Card 1 */}
          <TestimonialCard t={testimonials[0]} delay={0} />

          {/* Stat callout — center top */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="p-6 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] flex flex-col items-center justify-center text-center md:col-span-2 lg:col-span-1"
          >
            <p className="font-display text-5xl sm:text-6xl tracking-tight text-white mb-2">50+</p>
            <p className="font-sans text-sm text-slate-400 max-w-[180px]">
              Salon locations running on {PLATFORM_NAME}
            </p>
          </motion.div>

          {/* Card 2 */}
          <TestimonialCard t={testimonials[1]} delay={0.15} />

          {/* Card 3 */}
          <TestimonialCard t={testimonials[2]} delay={0.2} />

          {/* Card 4 */}
          <TestimonialCard t={testimonials[3]} delay={0.25} />

          {/* Card 5 */}
          <TestimonialCard t={testimonials[4]} delay={0.3} />
        </div>
      </div>
    </section>
  );
}
