/**
 * HeroSlideRotator — Revolution-Slider-style multi-slide hero.
 *
 * Each slide carries its own background media + foreground text + CTAs.
 * Slides cross-fade on a configurable interval; pagination dots and prev/next
 * arrows expose manual control. In editor preview, auto-rotate is suppressed
 * so operators can edit the active slide without it sliding away.
 */
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConsultationFormDialog } from '@/components/ConsultationFormDialog';
import { HeroEyebrow } from '@/components/home/HeroEyebrow';
import type { HeroConfig, HeroSlide } from '@/hooks/useSectionConfig';
import { HeroBackground } from './HeroBackground';
import { resolveScrim } from './heroScrim';
import { InlineEditableText } from './InlineEditableText';
import { mergeHeroColors, resolveHeroColors } from '@/lib/heroColors';
import { resolveHeroAlignmentWithWidth } from '@/lib/heroAlignment';
import { publishHeroAlignment, clearHeroAlignment } from '@/lib/heroAlignmentSignal';
import { resolveHeroSpacing, COMPACT_FORCE_BREAKPOINT } from '@/lib/heroSpacing';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import { cn } from '@/lib/utils';
import { HeroScrollIndicator } from './HeroScrollIndicator';
import { HERO_OVERLAY_ANCHORS } from './heroOverlayAnchors';
import { HeroNotes } from './HeroNotes';
import { HeroRotatingWord } from './HeroRotatingWord';

interface HeroSlideRotatorProps {
  config: HeroConfig;
  isPreview?: boolean;
}

export function HeroSlideRotator({ config, isPreview = false }: HeroSlideRotatorProps) {
  // Inactive slides (active === false) are excluded from the live rotator;
  // they remain in `config.slides` so the editor can re-enable them.
  // `undefined`/`null` is treated as active for legacy slides.
  const slides = (config.slides ?? []).filter((s) => s.active !== false);
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
  // Auto-rotate is suppressed in editor preview ONLY for multi_slide mode,
  // where each slide owns its own editable copy and rotation under the
  // operator's cursor would yank the active edit target away. In
  // background_only mode the foreground is shared/static across all slides,
  // so rotating the BACKGROUND in preview is safe — and necessary, because
  // otherwise operators uploading multiple rotating backgrounds see the
  // first one and conclude "the rotator is broken." (May 2026 bug report.)
  const rotatorModeForAutoRotate = config.rotator_mode ?? 'multi_slide';
  const suppressForPreview = isPreview && rotatorModeForAutoRotate !== 'background_only';
  const autoRotate = !!config.auto_rotate && slides.length > 1 && !suppressForPreview && !reduceMotion;

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

  const rawSlide: HeroSlide | undefined = slides[activeIndex];

  // Background-only mode: the FOREGROUND (eyebrow/headline/subheadline/CTAs/
  // text colors) is owned exclusively by the master slide (slides[0]) merged
  // with section-level shared fields. The active slide is consulted ONLY for
  // background fields (handled below in the bgType/bgUrl/etc. derivations).
  // This guarantees that rotating to a non-master background never bleeds
  // that slide's per-slide copy or text-color override into the shared
  // foreground.
  const rotatorMode = config.rotator_mode ?? 'multi_slide';
  const masterSlide = slides[0];
  const slide: HeroSlide | undefined = useMemo(() => {
    if (rotatorMode !== 'background_only') return rawSlide;
    if (!masterSlide) return rawSlide;
    return {
      ...masterSlide,
      eyebrow: config.eyebrow ?? '',
      show_eyebrow: !!config.show_eyebrow,
      headline_text: config.headline_text ?? '',
      subheadline_line1: config.subheadline_line1 ?? '',
      subheadline_line2: config.subheadline_line2 ?? '',
      cta_new_client: config.cta_new_client ?? '',
      cta_new_client_url: config.cta_new_client_url ?? '',
      cta_returning_client: config.cta_returning_client ?? '',
      cta_returning_client_url: config.cta_returning_client_url ?? '',
      show_secondary_button: !!config.show_secondary_button,
    };
  }, [
    rawSlide,
    masterSlide,
    rotatorMode,
    config.eyebrow,
    config.show_eyebrow,
    config.headline_text,
    config.subheadline_line1,
    config.subheadline_line2,
    config.cta_new_client,
    config.cta_new_client_url,
    config.cta_returning_client,
    config.cta_returning_client_url,
    config.show_secondary_button,
  ]);

  // Slide background overlay falls back to section default when null. Same
  // pattern for scrim style/strength: per-slide null → inherit section.
  const overlay = useMemo(() => {
    if (!slide) return config.overlay_opacity ?? 0.4;
    return slide.overlay_opacity ?? config.overlay_opacity ?? 0.4;
  }, [slide, config.overlay_opacity]);

  // Slide-level scrim resolution lives in `heroScrim.ts` so the live
  // renderer + the editor previews stay in lockstep. The shared helper also
  // heals legacy slides that wrote `scrim_strength: 0` (instead of `null`)
  // to express "inherit", which silently shadowed the section setting.
  const { style: scrimStyle, strength: scrimStrength } = useMemo(() => {
    return resolveScrim({
      slideStyle: slide?.scrim_style,
      slideStrength: slide?.scrim_strength,
      sectionStyle: config.scrim_style,
      sectionStrength: config.scrim_strength,
    });
  }, [slide, config.scrim_style, config.scrim_strength]);

  // Background-only mode splits ownership:
  //   - `slide` (above) stays the foreground source, always anchored to the
  //     master slide + section-level shared fields.
  //   - `backgroundSlide` below stays the MEDIA source, always anchored to the
  //     active rotating slide. If we derive media from `slide`, every cycle
  //     reuses the master slide image — the exact May 2026 regression.
  const backgroundSlide = rotatorMode === 'background_only' ? rawSlide : slide;

  const bgType = useMemo(() => {
    if (!backgroundSlide) return 'none' as const;
    if (backgroundSlide.background_type === 'inherit') return config.background_type;
    return backgroundSlide.background_type;
  }, [backgroundSlide, config.background_type]);

  const bgUrl = useMemo(() => {
    if (!backgroundSlide) return '';
    if (backgroundSlide.background_type === 'inherit') return config.background_url;
    return backgroundSlide.background_url;
  }, [backgroundSlide, config.background_url]);

  const bgPoster = useMemo(() => {
    if (!backgroundSlide) return '';
    if (backgroundSlide.background_type === 'inherit') return config.background_poster_url;
    return backgroundSlide.background_poster_url;
  }, [backgroundSlide, config.background_poster_url]);

  const focalX = useMemo(() => {
    const sectionFx = config.background_focal_x ?? 50;
    if (!backgroundSlide) return sectionFx;
    return backgroundSlide.background_focal_x ?? sectionFx;
  }, [backgroundSlide, config.background_focal_x]);

  const focalY = useMemo(() => {
    const sectionFy = config.background_focal_y ?? 50;
    if (!backgroundSlide) return sectionFy;
    return backgroundSlide.background_focal_y ?? sectionFy;
  }, [backgroundSlide, config.background_focal_y]);

  const overlayMode = useMemo<'darken' | 'lighten'>(() => {
    const sectionMode = config.overlay_mode ?? 'darken';
    if (!backgroundSlide) return sectionMode;
    return backgroundSlide.overlay_mode ?? sectionMode;
  }, [backgroundSlide, config.overlay_mode]);

  const fit = useMemo<'cover' | 'contain'>(() => {
    const sectionFit = config.background_fit ?? 'cover';
    if (!backgroundSlide) return sectionFit;
    return backgroundSlide.background_fit ?? sectionFit;
  }, [backgroundSlide, config.background_fit]);

  // Resolve the master width for srcSet capping: per-slide media owns its own
  // width; inherited slides borrow the section background's master width.
  const mediaWidth = useMemo<number | null>(() => {
    if (!backgroundSlide) return config.media_width ?? null;
    if (backgroundSlide.background_type === 'inherit') return config.media_width ?? null;
    return backgroundSlide.media_width ?? null;
  }, [backgroundSlide, config.media_width]);

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
  // Per-slide alignment + width override the section default; null/undefined inherits.
  const effectiveAlignment = slide.content_alignment ?? config.content_alignment ?? 'center';
  const alignment = resolveHeroAlignmentWithWidth(
    effectiveAlignment,
    slide.content_width ?? config.content_width,
  );
  // Container-aware spacing — see HeroSection for full rationale.
  const { ref: contentWrapRef, width: contentWidth } = useContainerWidth<HTMLDivElement>();
  const forceCompact = contentWidth !== null && contentWidth < COMPACT_FORCE_BREAKPOINT;
  const spacing = resolveHeroSpacing(config.content_spacing, forceCompact);

  // Publish the active alignment for global overlays (e.g. promo FAB) to
  // shift out of the way when right-aligned content would crowd them.
  // Cleared on unmount so non-public-site routes don't carry stale state.
  useEffect(() => {
    publishHeroAlignment(effectiveAlignment);
    return () => clearHeroAlignment();
  }, [effectiveAlignment]);

  // Stable foreground min-height: when slides change alignment (left → right),
  // the outgoing slide fades out at its anchor and the incoming slide fades
  // in at the new anchor. Holding a measured min-height on the shell prevents
  // the section from collapsing in the gap between exit and enter.
  const slideContentRef = useRef<HTMLDivElement | null>(null);
  const [shellMinHeight, setShellMinHeight] = useState<number>(0);
  useEffect(() => {
    const el = slideContentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.ceil(entry.contentRect.height);
        // Only grow — never shrink mid-transition (would cause its own jump).
        setShellMinHeight((prev) => (h > prev ? h : prev));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeIndex]);

  /*
   * Scroll-driven exit choreography (live site only).
   *
   * Mirrors the legacy single-slide HeroSection so the canonical multi-slide
   * rotator keeps the signature "headline splits + blurs + parallax fade-out
   * on scroll up" feel. Suppressed in editor preview (operators need a static
   * canvas to edit) and when the user prefers reduced motion.
   */
  const sectionRef = useRef<HTMLElement>(null);
  const enableScrollFx = !isPreview && !reduceMotion;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const sectionOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const headingBlur = useTransform(scrollYProgress, [0, 0.3], [0, 15]);
  const headingBlurFilter = useTransform(headingBlur, (v) => `blur(${v}px)`);
  const headlineScrollOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const taglineY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const subheadlineY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const ctaY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const topLineX = useTransform(scrollYProgress, [0, 0.4], [0, -150]);
  const bottomLineX = useTransform(scrollYProgress, [0, 0.4], [0, 150]);

  return (
    <section
      ref={sectionRef}
      data-theme={hasBackground ? 'dark' : 'light'}
      className="relative z-10 flex flex-col overflow-visible min-h-[600px] lg:min-h-screen"
      onMouseEnter={handleHoverEnter}
      onMouseLeave={handleHoverLeave}
    >
      {/*
       * Cross-fade base layer.
       *
       * Both the outgoing and incoming background motion.divs animate opacity
       * 1→0 and 0→1 simultaneously (mode="sync", 0.9s). At the midpoint each
       * sits near ~0.5 opacity, exposing whatever is BEHIND the section. With
       * no base layer that bleed-through is the page background (often light),
       * which reads as a white flash between dark scrimmed slides.
       *
       * We park a static, opaque base layer behind the rotator that matches
       * the scrim's intent: black for `darken` overlays (the common case for
       * dark, legible hero copy), white for `lighten` overlays. The base sits
       * BEHIND the cross-fading slides, so it only shows during the dip — the
       * fully-loaded incoming slide hides it the rest of the time.
       */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: overlayMode === 'lighten' ? '#ffffff' : '#000000' }}
      />

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

      {/* Foreground content
       *
       * Sequential handoff (NOT crossfade):
       *   1. Outgoing slide fades to opacity 0 at its current alignment.
       *   2. Once gone, incoming slide fades from opacity 0 to 1 at its new
       *      alignment.
       *
       * This eliminates the visible "passes through center" artifact when
       * left-aligned content transitions to right-aligned (or vice versa).
       * The previous overlapping crossfade made both alignments visible at
       * once, which the eye reads as a horizontal slide through the middle.
       *
       * Layout ownership:
       *   - The OUTER shell (`alignment.shellWrapper`) is centered + width-
       *     clamped and never changes between slides — keeps the foreground
       *     region stable.
       *   - The INNER per-slide wrapper (`alignment.innerWrapper`) carries
       *     left/center/right anchoring so each slide owns its anchor for
       *     its full lifecycle (no mid-transition flip).
       *   - A measured `min-height` on the shell prevents the section from
       *     collapsing in the gap between exit and enter.
       */}
      <motion.div
        className="flex-1 flex items-center justify-center relative z-10 py-16"
        style={enableScrollFx ? { opacity: sectionOpacity } : undefined}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div
            ref={contentWrapRef}
            className={cn(alignment.shellWrapper, 'relative w-full')}
            style={shellMinHeight > 0 ? { minHeight: shellMinHeight } : undefined}
          >
            {/* Foreground.
                In background_only mode the key is stable (`fg-shared`) across
                activeIndex changes, so AnimatePresence never triggers an
                exit/enter — the foreground stays mounted while only the
                background layer above cross-fades. In multi_slide mode the
                key changes per slide, producing the standard sequential
                hand-off. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={rotatorMode === 'background_only' ? 'fg-shared' : `fg-${activeIndex}`}
                data-hero-foreground={rotatorMode === 'background_only' ? 'shared' : 'per-slide'}
                ref={slideContentRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className={cn('w-full', alignment.innerWrapper)}
              >
                <motion.div style={enableScrollFx ? { y: taglineY } : undefined}>
                  <HeroEyebrow
                    show={!!slide.show_eyebrow}
                    text={slide.eyebrow}
                    toneClass={heroColors.eyebrowToneClass || mutedTone}
                    style={heroColors.eyebrowStyle}
                    editable={isPreview}
                    fieldPath={rotatorMode === 'background_only' ? 'eyebrow' : `slides.${activeIndex}.eyebrow`}
                    className={spacing.eyebrow}
                  />
                </motion.div>

                <motion.h1
                  className={cn("font-display font-normal leading-[0.95] flex flex-col", alignment.headline, heroColors.headlineClass)}
                  style={{
                    fontSize: 'calc(clamp(2.25rem, 8vw, 5.5rem) * var(--section-heading-scale, 1))',
                    ...heroColors.headlineStyle,
                    ...(enableScrollFx ? { y: headlineY, filter: headingBlurFilter } : {}),
                  }}
                >
                  {/* eslint-disable-next-line no-restricted-syntax -- headline-line scroll-parallax wrapper, not a rotating-word render. */}
                  <motion.span
                    className="whitespace-nowrap block"
                    style={enableScrollFx ? { x: topLineX, opacity: headlineScrollOpacity } : undefined}
                  >
                    {isPreview ? (
                      <InlineEditableText
                        as="span"
                        className="whitespace-nowrap block"
                        value={slide.headline_text}
                        sectionKey="section_hero"
                        fieldPath={rotatorMode === 'background_only' ? 'headline_text' : `slides.${activeIndex}.headline_text`}
                        placeholder="Headline"
                      />
                    ) : (
                      slide.headline_text
                    )}
                  </motion.span>
                  {/* eslint-disable-next-line no-restricted-syntax -- headline-line scroll-parallax wrapper, not a rotating-word render. */}
                  <motion.span
                    className="block"
                    style={enableScrollFx ? { x: bottomLineX, opacity: headlineScrollOpacity } : undefined}
                  >
                    <HeroRotatingWord
                      show={showRotatingWords}
                      words={rotatingWords}
                      index={wordIndex}
                      isOverDark={hasBackground}
                      colorOverride={!!heroColors.headlineStyle.color}
                    />
                  </motion.span>
                </motion.h1>

                {(slide.subheadline_line1 || slide.subheadline_line2) && (
                  <motion.p
                    className={cn(spacing.subheadline, "text-sm md:text-base font-sans font-light leading-relaxed", alignment.subheadline, heroColors.subheadlineClass)}
                    style={{ ...heroColors.subheadlineStyle, ...(enableScrollFx ? { y: subheadlineY } : {}) }}
                  >
                    {isPreview ? (
                      <InlineEditableText
                        as="span"
                        value={slide.subheadline_line1}
                        sectionKey="section_hero"
                        fieldPath={rotatorMode === 'background_only' ? 'subheadline_line1' : `slides.${activeIndex}.subheadline_line1`}
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
                            fieldPath={rotatorMode === 'background_only' ? 'subheadline_line2' : `slides.${activeIndex}.subheadline_line2`}
                            placeholder="Subheadline line 2"
                          />
                        ) : (
                          slide.subheadline_line2
                        )}
                      </>
                    )}
                  </motion.p>
                )}

                <motion.div
                  className={cn(spacing.cta, "flex flex-col", spacing.notesGap, alignment.cta)}
                  style={enableScrollFx ? { y: ctaY } : undefined}
                >
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
                        heroColors.hasPrimaryHover && "hero-cta-hover",
                        heroColors.hasPrimaryHoverFg && "hero-cta-hover-fg",
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
                          heroColors.hasSecondaryHover && "hero-cta-hover",
                          heroColors.hasSecondaryHoverBorder && "hero-cta-hover-border",
                          heroColors.hasSecondaryHoverFg && "hero-cta-hover-fg",
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
                      toneClass={heroColors.notesToneClass}
                      style={heroColors.notesStyle}
                    />
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Pagination + arrows.
          In background_only mode the rotator iterates BACKGROUNDS, not slides:
          the foreground is shared and never changes. Aria labels reflect that
          so screen readers + the editor's mental model stay aligned. */}
      {slides.length > 1 && (
        <div
          className={`${HERO_OVERLAY_ANCHORS.bottomLeft} flex items-center gap-6`}
          data-rotator-mode={rotatorMode}
        >
          <button
            onClick={() => goTo(activeIndex - 1)}
            aria-label={rotatorMode === 'background_only' ? 'Previous background' : 'Previous slide'}
            className={`p-2 rounded-full transition-colors ${hasBackground ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={
                  rotatorMode === 'background_only'
                    ? `Go to background ${i + 1}`
                    : `Go to slide ${i + 1}`
                }
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
            aria-label={rotatorMode === 'background_only' ? 'Next background' : 'Next slide'}
            className={`p-2 rounded-full transition-colors ${hasBackground ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          {/* Editor preview affordance: when auto-rotate is suppressed for
              multi_slide editing, operators otherwise see "is the rotator
              broken?" The hint is gated to the exact suppression condition
              so it never appears on the live site. */}
          {suppressForPreview && !!config.auto_rotate && (
            <span
              data-testid="hero-rotator-paused-hint"
              className={`ml-2 text-[10px] font-sans tracking-wide px-2 py-1 rounded-full ${
                hasBackground
                  ? 'bg-white/15 text-white/85 backdrop-blur-sm'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Auto-rotate paused while editing — use ◀ ▶ to preview
            </span>
          )}
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
