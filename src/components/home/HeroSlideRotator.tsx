/**
 * HeroSlideRotator — Revolution-Slider-style multi-slide hero.
 *
 * Each slide carries its own background media + foreground text + CTAs.
 * Slides cross-fade on a configurable interval; pagination dots and prev/next
 * arrows expose manual control. In editor preview, auto-rotate is suppressed
 * so operators can edit the active slide without it sliding away.
 */
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConsultationFormDialog } from '@/components/ConsultationFormDialog';
import { HeroEyebrow } from '@/components/home/HeroEyebrow';
import type { HeroConfig, HeroSlide } from '@/hooks/useSectionConfig';
import { HeroBackground } from './HeroBackground';
import { InlineEditableText } from './InlineEditableText';
import { mergeHeroColors, resolveHeroColors } from '@/lib/heroColors';
import { resolveHeroAlignment } from '@/lib/heroAlignment';
import { cn } from '@/lib/utils';
import { HeroScrollIndicator } from './HeroScrollIndicator';
import { HeroNotes } from './HeroNotes';
import { HeroRotatingWord } from './HeroRotatingWord';

interface HeroSlideRotatorProps {
  config: HeroConfig;
  isPreview?: boolean;
}

export function HeroSlideRotator({ config, isPreview = false }: HeroSlideRotatorProps) {
  const slides = config.slides ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Section-level rotating words — globals shared across all slides (per
  // Slider-Revolution doctrine: per-slide owns text/image, global decoration
  // like the rotating word + consultation notes lives once at the section).
  const rotatingWords = useMemo(
    () => (config.rotating_words ?? []).filter((w) => w && w.trim() !== ''),
    [config.rotating_words],
  );
  const showRotatingWords = !!config.show_rotating_words && rotatingWords.length > 0;
  // word_rotation_interval is stored in SECONDS (DB default 5.5, slider unit "s").
  // Convert to ms for setInterval; floor at 1500ms to prevent strobe.
  const wordInterval = Math.max(1500, (config.word_rotation_interval ?? 5.5) * 1000);
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    if (!showRotatingWords || isPreview || reduceMotion) return;
    const id = window.setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingWords.length);
    }, wordInterval);
    return () => window.clearInterval(id);
  }, [showRotatingWords, isPreview, reduceMotion, wordInterval, rotatingWords.length]);
  useEffect(() => {
    if (wordIndex >= rotatingWords.length && rotatingWords.length > 0) setWordIndex(0);
  }, [rotatingWords.length, wordIndex]);

  // Clamp the active index if slides shrink.
  useEffect(() => {
    if (activeIndex >= slides.length && slides.length > 0) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  const interval = Math.max(2000, config.slide_interval_ms ?? 6000);
  const autoRotate = !!config.auto_rotate && slides.length > 1 && !isPreview && !reduceMotion;

  useEffect(() => {
    if (!autoRotate || isPaused) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [autoRotate, isPaused, interval, slides.length]);

  const goTo = useCallback((i: number) => {
    if (slides.length === 0) return;
    setActiveIndex(((i % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  const slide: HeroSlide | undefined = slides[activeIndex];

  // Slide background overlay falls back to section default when null. Same
  // pattern for scrim style/strength: per-slide null → inherit section.
  const overlay = useMemo(() => {
    if (!slide) return config.overlay_opacity ?? 0.4;
    return slide.overlay_opacity ?? config.overlay_opacity ?? 0.4;
  }, [slide, config.overlay_opacity]);

  const scrimStyle = useMemo(() => {
    if (!slide) return config.scrim_style ?? 'gradient-bottom';
    return slide.scrim_style ?? config.scrim_style ?? 'gradient-bottom';
  }, [slide, config.scrim_style]);

  const scrimStrength = useMemo(() => {
    if (!slide) return config.scrim_strength ?? 0.55;
    return slide.scrim_strength ?? config.scrim_strength ?? 0.55;
  }, [slide, config.scrim_strength]);

  const bgType = useMemo(() => {
    if (!slide) return 'none' as const;
    if (slide.background_type === 'inherit') return config.background_type;
    return slide.background_type;
  }, [slide, config.background_type]);

  const bgUrl = useMemo(() => {
    if (!slide) return '';
    if (slide.background_type === 'inherit') return config.background_url;
    return slide.background_url;
  }, [slide, config.background_url]);

  const bgPoster = useMemo(() => {
    if (!slide) return '';
    if (slide.background_type === 'inherit') return config.background_poster_url;
    return slide.background_poster_url;
  }, [slide, config.background_poster_url]);

  const focalX = useMemo(() => {
    const sectionFx = config.background_focal_x ?? 50;
    if (!slide) return sectionFx;
    return slide.background_focal_x ?? sectionFx;
  }, [slide, config.background_focal_x]);

  const focalY = useMemo(() => {
    const sectionFy = config.background_focal_y ?? 50;
    if (!slide) return sectionFy;
    return slide.background_focal_y ?? sectionFy;
  }, [slide, config.background_focal_y]);

  const overlayMode = useMemo<'darken' | 'lighten'>(() => {
    const sectionMode = config.overlay_mode ?? 'darken';
    if (!slide) return sectionMode;
    return slide.overlay_mode ?? sectionMode;
  }, [slide, config.overlay_mode]);

  const fit = useMemo<'cover' | 'contain'>(() => {
    const sectionFit = config.background_fit ?? 'cover';
    if (!slide) return sectionFit;
    return slide.background_fit ?? sectionFit;
  }, [slide, config.background_fit]);

  // Resolve the master width for srcSet capping: per-slide media owns its own
  // width; inherited slides borrow the section background's master width.
  const mediaWidth = useMemo<number | null>(() => {
    if (!slide) return config.media_width ?? null;
    if (slide.background_type === 'inherit') return config.media_width ?? null;
    return slide.media_width ?? null;
  }, [slide, config.media_width]);

  if (!slide) return null;

  const handleHoverEnter = () => config.pause_on_hover && setIsPaused(true);
  const handleHoverLeave = () => config.pause_on_hover && setIsPaused(false);

  // Foreground text gets contrast against background media. The shared
  // resolver merges section-level + per-slide overrides on top of the
  // auto-contrast default (white when there's a media background, theme
  // foreground otherwise).
  const hasBackground = bgType !== 'none' && !!bgUrl;
  const mergedColors = mergeHeroColors(config.text_colors, slide.text_colors);
  const heroColors = resolveHeroColors(mergedColors, hasBackground);
  // Eyebrow + nav use the same muted tone as the subheadline; reuse its class.
  const mutedTone = heroColors.subheadlineClass || '';
  // Per-slide alignment overrides the section default; null/undefined inherits.
  const alignment = resolveHeroAlignment(slide.content_alignment ?? config.content_alignment);

  return (
    <section
      data-theme={hasBackground ? 'dark' : 'light'}
      className="relative z-10 flex flex-col overflow-visible min-h-[600px] lg:min-h-screen"
      onMouseEnter={handleHoverEnter}
      onMouseLeave={handleHoverLeave}
    >
      {/* Background layer — cross-faded between slides */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${activeIndex}`}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        >
          <HeroBackground
            type={bgType}
            url={bgUrl}
            posterUrl={bgPoster}
            fit={fit}
            focalX={focalX}
            focalY={focalY}
            overlayMode={overlayMode}
            overlayOpacity={overlay}
            scrimStyle={scrimStyle}
            scrimStrength={scrimStrength}
            mediaWidth={mediaWidth}
            // Preload only the first slide so the LCP fetch happens once,
            // before hydration. Rotated slides cross-fade in via JS and don't
            // benefit from a preload tag injected after-the-fact.
            preload={activeIndex === 0}
          />
        </motion.div>
      </AnimatePresence>

      {/* Foreground content */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-16">
        <div className="container mx-auto px-6 lg:px-12">
          <div className={alignment.wrapper}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`fg-${activeIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <HeroEyebrow
                  show={!!slide.show_eyebrow}
                  text={slide.eyebrow}
                  toneClass={mutedTone}
                  editable={isPreview}
                  fieldPath={`slides.${activeIndex}.eyebrow`}
                  className="mb-8"
                />

                <h1
                  className={cn("font-display font-normal leading-[0.95] flex flex-col", alignment.headline, heroColors.headlineClass)}
                  style={{ fontSize: 'calc(clamp(2.25rem, 8vw, 5.5rem) * var(--section-heading-scale, 1))', ...heroColors.headlineStyle }}
                >
                  {isPreview ? (
                    <InlineEditableText
                      as="span"
                      className="whitespace-nowrap block"
                      value={slide.headline_text}
                      sectionKey="section_hero"
                      fieldPath={`slides.${activeIndex}.headline_text`}
                      placeholder="Headline"
                    />
                  ) : (
                    <span className="whitespace-nowrap block">{slide.headline_text}</span>
                  )}
                  <HeroRotatingWord
                    show={showRotatingWords}
                    words={rotatingWords}
                    index={wordIndex}
                    isOverDark={hasBackground}
                    colorOverride={!!heroColors.headlineStyle.color}
                  />
                </h1>

                {(slide.subheadline_line1 || slide.subheadline_line2) && (
                  <p
                    className={cn("mt-10 text-sm md:text-base font-sans font-light leading-relaxed", alignment.subheadline, heroColors.subheadlineClass)}
                    style={heroColors.subheadlineStyle}
                  >
                    {isPreview ? (
                      <InlineEditableText
                        as="span"
                        value={slide.subheadline_line1}
                        sectionKey="section_hero"
                        fieldPath={`slides.${activeIndex}.subheadline_line1`}
                        placeholder="Subheadline line 1"
                      />
                    ) : (
                      slide.subheadline_line1
                    )}
                    {slide.subheadline_line2 && (
                      <>
                        <br />
                        {isPreview ? (
                          <InlineEditableText
                            as="span"
                            value={slide.subheadline_line2}
                            sectionKey="section_hero"
                            fieldPath={`slides.${activeIndex}.subheadline_line2`}
                            placeholder="Subheadline line 2"
                          />
                        ) : (
                          slide.subheadline_line2
                        )}
                      </>
                    )}
                  </p>
                )}

                <div className={cn("mt-10 flex flex-col gap-6", alignment.cta)}>
                  <div className={cn("flex flex-col sm:flex-row items-center gap-4", alignment.ctaRow)}>
                    <button
                      onClick={() => {
                        if (slide.cta_new_client_url) {
                          window.location.href = slide.cta_new_client_url;
                        } else {
                          setConsultationOpen(true);
                        }
                      }}
                      className={cn(
                        "group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal rounded-full transition-all duration-300 inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6",
                        heroColors.primaryButtonClass,
                      )}
                      style={heroColors.primaryButtonStyle}
                    >
                      <span className="relative z-10">{slide.cta_new_client || 'Get Started'}</span>
                      <ArrowRight className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-300" />
                    </button>
                    {slide.show_secondary_button && (
                      <Link
                        to={slide.cta_returning_client_url || '/booking'}
                        className={cn(
                          "group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border rounded-full transition-all duration-300 inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6",
                          heroColors.secondaryButtonClass,
                        )}
                        style={heroColors.secondaryButtonStyle}
                      >
                        <span className="relative z-10">{slide.cta_returning_client || 'Learn More'}</span>
                        <ArrowRight className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-300" />
                      </Link>
                    )}
                  </div>
                  {config.show_consultation_notes && (config.consultation_note_line1 || config.consultation_note_line2) && (
                    <HeroNotes
                      alignment={alignment}
                      line1={config.consultation_note_line1 ?? ''}
                      line2={config.consultation_note_line2 ?? ''}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Pagination + arrows */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 inset-x-0 z-20 flex items-center justify-center gap-6">
          <button
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Previous slide"
            className={`p-2 rounded-full transition-colors ${hasBackground ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1 transition-all duration-500 ${
                  i === activeIndex
                    ? `w-8 ${hasBackground ? 'bg-white' : 'bg-foreground'}`
                    : `w-2 ${hasBackground ? 'bg-white/40 hover:bg-white/60' : 'bg-foreground/30 hover:bg-foreground/50'}`
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Next slide"
            className={`p-2 rounded-full transition-colors ${hasBackground ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Operator-toggled scroll affordance — same component the fallback hero uses */}
      <HeroScrollIndicator
        show={config.show_scroll_indicator ?? true}
        text={config.scroll_indicator_text}
        onMedia={hasBackground}
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: window.innerHeight - 100, behavior: 'smooth' });
          }
        }}
      />

      <ConsultationFormDialog open={consultationOpen} onOpenChange={setConsultationOpen} />
    </section>
  );
}
