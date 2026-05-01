import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { HeroConfig } from '@/hooks/useSectionConfig';
import { resolveHeroAlignment } from '@/lib/heroAlignment';
import { cn } from '@/lib/utils';

interface HeroSectionPreviewProps {
  config: HeroConfig;
}

export function HeroSectionPreview({ config }: HeroSectionPreviewProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    if (config.rotating_words.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % config.rotating_words.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [config.rotating_words.length]);

  // Reset index if words change
  useEffect(() => {
    setCurrentWordIndex(0);
  }, [config.rotating_words]);

  const currentWord = config.rotating_words[currentWordIndex] || 'Salon';

  const alignment = resolveHeroAlignment(config.content_alignment);

  return (
    <section data-theme="light" className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex-1 flex items-start justify-center pt-28 pb-32 lg:pt-36 lg:pb-48 relative z-0">
        <div className="container mx-auto px-6 lg:px-12">
          <div className={alignment.wrapper}>
            {/* Tagline */}
            <div>
              <Eyebrow className="text-muted-foreground mb-6">
                {config.eyebrow}
              </Eyebrow>
            </div>

            {/* Main headline */}
            <h1 className={cn("font-display text-[clamp(2.25rem,8vw,5.5rem)] font-normal text-foreground leading-[0.95] flex flex-col", alignment.headline)}>
              <span className="whitespace-nowrap block">{config.headline_text}</span>
              <span className="block overflow-hidden h-[1.15em]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWord}
                    className="block"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {currentWord}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* Subheadline */}
            <p className={cn("mt-8 text-sm md:text-base text-muted-foreground font-sans font-light leading-relaxed", alignment.subheadline)}>
              {config.subheadline_line1}
              <br />
              {config.subheadline_line2}
            </p>

            {/* CTAs */}
            <div className={cn("mt-10 flex flex-col gap-3", alignment.cta)}>
              <div className={cn("flex flex-col sm:flex-row items-center gap-3", alignment.ctaRow)}>
                <button className="group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal bg-foreground text-background rounded-full hover:bg-foreground/90 transition-all duration-300 text-center inline-flex items-center justify-center gap-0">
                  <span className="relative z-10">{config.cta_new_client}</span>
                  <ArrowRight className="w-0 h-4 opacity-0 transition-all duration-300" />
                </button>
                <button className="group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border border-foreground text-foreground rounded-full transition-all duration-300 text-center inline-flex items-center justify-center gap-0">
                  <span className="relative z-10">{config.cta_returning_client}</span>
                  <ArrowRight className="w-0 h-4 opacity-0 transition-all duration-300" />
                </button>
              </div>
              <div className={cn("flex flex-col gap-1 text-xs md:text-sm text-muted-foreground font-sans", alignment.notes)}>
                <p>{config.consultation_note_line1}</p>
                <p>{config.consultation_note_line2}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button className="absolute bottom-8 inset-x-0 mx-auto w-fit flex flex-col items-center gap-2 text-muted-foreground z-20">
        <span className="text-xs uppercase tracking-normal md:tracking-[0.2em] font-display">Scroll</span>
        <ChevronDown size={20} />
      </button>
    </section>
  );
}
