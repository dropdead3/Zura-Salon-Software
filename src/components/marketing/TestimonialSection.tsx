import { PLATFORM_NAME } from '@/lib/brand';

export function TestimonialSection() {
  return (
    <section className="relative z-10 px-6 sm:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-3xl mx-auto text-center">
        <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl text-white/90 italic leading-relaxed mb-6">
          &ldquo;{PLATFORM_NAME} showed us exactly where we were losing margin.
          We recovered $84K in the first quarter.&rdquo;
        </blockquote>
        <p className="font-sans text-sm text-slate-400">
          — Multi-location operator, 4 locations
        </p>
      </div>
    </section>
  );
}
