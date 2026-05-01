import { Link } from "react-router-dom";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { ConsultationFormDialog } from "@/components/ConsultationFormDialog";
import { HeroEyebrow } from "@/components/home/HeroEyebrow";
import { useHeroConfig, DEFAULT_HERO } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "@/components/home/InlineEditableText";
import { HeroBackground } from "@/components/home/HeroBackground";
import { HeroSlideRotator } from "@/components/home/HeroSlideRotator";
import { HeroNotes } from "@/components/home/HeroNotes";
import { HeroScrollIndicator } from "@/components/home/HeroScrollIndicator";
import { HeroRotatingWord } from "@/components/home/HeroRotatingWord";
import { resolveHeroColors } from "@/lib/heroColors";
import { resolveHeroAlignment } from "@/lib/heroAlignment";
import { cn } from "@/lib/utils";

const rotatingWords = ["Salon", "Extensions", "Salon", "Blonding", "Salon", "Color", "Salon", "Results"];

interface HeroSectionProps {
  videoSrc?: string;
  isPreview?: boolean;
}

export function HeroSection({ videoSrc, isPreview = false }: HeroSectionProps) {
  const { data: dbHeroConfig } = useHeroConfig();
  // In editor preview mode, merge unsaved edits broadcast from the editor.
  const heroConfig = useLiveOverride('section_hero', dbHeroConfig) ?? dbHeroConfig ?? DEFAULT_HERO;
  const headlineText = heroConfig?.headline_text ?? DEFAULT_HERO.headline_text;
  const eyebrowText = heroConfig?.eyebrow ?? DEFAULT_HERO.eyebrow;
  const showEyebrow = heroConfig?.show_eyebrow ?? DEFAULT_HERO.show_eyebrow;
  const showSubheadline = heroConfig?.show_subheadline ?? DEFAULT_HERO.show_subheadline;
  // Use ?? not || so an explicit empty string (operator cleared the field) is honored
  // and does not fall back to the DEFAULT_HERO copy.
  const subheadlineLine1 = heroConfig?.subheadline_line1 ?? DEFAULT_HERO.subheadline_line1;
  const subheadlineLine2 = heroConfig?.subheadline_line2 ?? DEFAULT_HERO.subheadline_line2;
  const hasSubheadlineContent = showSubheadline && (subheadlineLine1.trim() !== '' || subheadlineLine2.trim() !== '');
  const slides = heroConfig?.slides ?? [];
  const hasSlides = slides.length > 0;

  // HOOK ORDER CONTRACT — every hook below MUST run on every render. Earlier
  // versions early-returned <HeroSlideRotator/> here when slides existed,
  // which silently changed the hook count when an operator added/removed
  // slides ("Rendered fewer hooks than expected" crash). Compute everything
  // unconditionally; the rotator branch is taken at the JSX return below.

  const bgType = heroConfig?.background_type ?? 'none';
  const bgUrl = heroConfig?.background_url ?? '';
  const bgPoster = heroConfig?.background_poster_url ?? '';
  const bgFit = heroConfig?.background_fit ?? 'cover';
  const focalX = heroConfig?.background_focal_x ?? 50;
  const focalY = heroConfig?.background_focal_y ?? 50;
  const overlayMode = heroConfig?.overlay_mode ?? 'darken';
  const overlayOpacity = heroConfig?.overlay_opacity ?? 0.4;
  const scrimStyle = heroConfig?.scrim_style ?? 'gradient-bottom';
  const scrimStrength = heroConfig?.scrim_strength ?? 0.55;
  const mediaWidth = heroConfig?.media_width ?? null;
  const hasMediaBackground = bgType !== 'none' && !!bgUrl;
  // Resolve auto-contrast + operator color overrides for headline, subheadline,
  // and CTA buttons. See src/lib/heroColors.ts for the merge rules.
  const heroColors = resolveHeroColors(heroConfig?.text_colors ?? {}, hasMediaBackground);
  const alignment = resolveHeroAlignment(heroConfig?.content_alignment);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  const animDelay = isPreview ? 0 : 1;

  // Start word rotation after initial heading animation completes
  useEffect(() => {
    const startDelay = setTimeout(() => {
      setIsAnimationReady(true);
    }, isPreview ? 500 : 4000);

    return () => clearTimeout(startDelay);
  }, [isPreview]);

  // Cycle through words. word_rotation_interval is stored in SECONDS — convert to ms.
  const wordIntervalMs = Math.max(1500, (heroConfig.word_rotation_interval ?? 5.5) * 1000);
  useEffect(() => {
    if (!isAnimationReady) return;

    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, wordIntervalMs);

    return () => clearInterval(interval);
  }, [isAnimationReady, wordIntervalMs, rotatingWords.length]);
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  // Transform scroll progress to opacity and blur
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.5], [0, 20]);
  const blurFilter = useTransform(blur, (v) => `blur(${v}px)`);
  
  // Heading-specific blur (starts earlier, more intense)
  const headingBlur = useTransform(scrollYProgress, [0, 0.3], [0, 15]);
  const headingBlurFilter = useTransform(headingBlur, (v) => `blur(${v}px)`);
  
  // Parallax transforms - different speeds for depth effect
  const taglineY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const headlineY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const subheadlineY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const ctaY = useTransform(scrollYProgress, [0, 1], [0, -200]);

  // Directional scroll transforms for headline split animation
  const topLineX = useTransform(scrollYProgress, [0, 0.4], [0, -150]);
  const bottomLineX = useTransform(scrollYProgress, [0, 0.4], [0, 150]);
  const headlineScrollOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 100,
      behavior: "smooth",
    });
  };

  // Shared spring config for organic animations
  const springTransition = { type: "spring" as const, stiffness: 50, damping: 20 };

  // Multi-slide rotator takes over when operators have configured slides.
  // Branch AFTER all hooks above to keep hook order stable across renders.
  if (hasSlides) {
    return <HeroSlideRotator config={heroConfig} isPreview={isPreview} />;
  }

  // In preview/editor mode, render static HTML — no Framer Motion at all
  if (isPreview) {
    return (
      <section data-theme={hasMediaBackground ? 'dark' : 'light'} className="relative z-10 flex flex-col overflow-visible min-h-[500px] bg-background">
        <HeroBackground type={bgType} url={bgUrl} posterUrl={bgPoster} fit={bgFit} focalX={focalX} focalY={focalY} overlayMode={overlayMode} overlayOpacity={overlayOpacity} scrimStyle={scrimStyle} scrimStrength={scrimStrength} mediaWidth={mediaWidth} preload />
        <div className="flex-1 flex items-center justify-center relative z-10 py-16">
          <div className="container mx-auto px-6 lg:px-12">
            <div className={alignment.wrapper}>
              <HeroEyebrow
                show={showEyebrow}
                text={eyebrowText}
                editable
                fieldPath="eyebrow"
                className="mb-8"
              />
              <h1
                className={cn("font-display font-normal leading-[0.95] flex flex-col", alignment.headline, heroColors.headlineClass)}
                // Heading scale opt-in — multiplied by `--section-heading-scale`
                // (set on the SectionStyleWrapper); defaults to 1 so existing
                // sections see no change. Section-level "H" chip cycles Sm→XL.
                style={{ fontSize: 'calc(clamp(2.25rem, 8vw, 5.5rem) * var(--section-heading-scale, 1))', ...heroColors.headlineStyle }}
              >
                <InlineEditableText
                  as="span"
                  className="whitespace-nowrap block"
                  value={headlineText}
                  sectionKey="section_hero"
                  fieldPath="headline_text"
                  placeholder="Headline"
                />
                <HeroRotatingWord show={true} words={rotatingWords} index={currentWordIndex} isOverDark={hasMediaBackground} colorOverride={!!heroColors.headlineStyle.color} />
              </h1>
              {hasSubheadlineContent && (
                <p
                  className={cn("mt-10 text-sm md:text-base font-sans font-light leading-relaxed", alignment.subheadline, heroColors.subheadlineClass)}
                  style={heroColors.subheadlineStyle}
                >
                  {subheadlineLine1}
                  {subheadlineLine1 && subheadlineLine2 && <br />}
                  {subheadlineLine2}
                </p>
              )}
              <div className={cn("mt-10 flex flex-col gap-6", alignment.cta)}>
                <div className={cn("flex flex-col sm:flex-row items-center gap-4", alignment.ctaRow)}>
                  <button
                    onClick={() => setConsultationOpen(true)}
                    className={cn("w-full sm:w-auto px-8 py-4 text-base font-sans font-normal rounded-full", heroColors.primaryButtonClass)}
                    style={heroColors.primaryButtonStyle}
                  >
                    I am a new client
                  </button>
                  <Link
                    to="/booking"
                    className={cn("w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border rounded-full", heroColors.secondaryButtonClass)}
                    style={heroColors.secondaryButtonStyle}
                  >
                    I am a returning client
                  </Link>
                </div>
                <HeroNotes
                  alignment={alignment}
                  line1="New clients begin with a $15 consultation"
                  line2="Returning clients are free to book their known services"
                />
              </div>
            </div>
          </div>
        </div>
        <ConsultationFormDialog open={consultationOpen} onOpenChange={setConsultationOpen} />
      </section>
    );
  }

  return (
    <section ref={sectionRef} data-theme={hasMediaBackground ? 'dark' : 'light'} className="relative z-10 flex flex-col overflow-visible min-h-screen">
      {/* Operator-configured background (image or video) */}
      <HeroBackground type={bgType} url={bgUrl} posterUrl={bgPoster} fit={bgFit} focalX={focalX} focalY={focalY} overlayMode={overlayMode} overlayOpacity={overlayOpacity} scrimStyle={scrimStyle} scrimStrength={scrimStrength} mediaWidth={mediaWidth} preload />

      {/* Legacy explicit videoSrc prop (back-compat) */}
      {!hasMediaBackground && videoSrc && (
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-background/60" />
        </motion.div>
      )}

      {/* Subtle gradient orbs - only show when no video */}
      {!videoSrc && !hasMediaBackground && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute w-[600px] h-[600px] -top-[200px] -right-[200px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--foreground) / 0.02) 0%, transparent 60%)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              opacity: { duration: 15, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 15, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] -bottom-[150px] -left-[150px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--foreground) / 0.02) 0%, transparent 60%)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0.6, 0.4, 0.6],
              scale: [1.2, 1, 1.2],
            }}
            transition={{
              opacity: { duration: 18, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 18, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </div>
      )}

      <motion.div 
        className="flex-1 flex items-center justify-center relative z-0 py-16"
        style={{ opacity }}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div className={alignment.wrapper}>
            {/* Tagline */}
            {showEyebrow && (
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 2.0 }}
                style={{ y: taglineY }}
              >
                <HeroEyebrow show={true} text={eyebrowText} className="mb-8" />
              </motion.div>
            )}

            {/* Main headline */}
            <motion.h1
              className={cn("font-display font-normal leading-[0.95] flex flex-col", alignment.headline, heroColors.headlineClass)}
              style={{
                y: headlineY,
                filter: headingBlurFilter,
                fontSize: 'calc(clamp(2.25rem, 8vw, 5.5rem) * var(--section-heading-scale, 1))',
                ...heroColors.headlineStyle,
              }}
            >
              {/* eslint-disable-next-line no-restricted-syntax -- headline-line scroll-parallax wrapper, not a rotating-word render. */}
              <motion.span 
                className="whitespace-nowrap block"
                initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 2.5 }}
                style={{ x: topLineX, opacity: headlineScrollOpacity }}
              >
                {headlineText}
              </motion.span>
              {/* eslint-disable-next-line no-restricted-syntax -- headline-line scroll-parallax wrapper, not a rotating-word render. */}
              <motion.span 
                className="block"
                initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 2.5 }}
                style={{ x: bottomLineX, opacity: headlineScrollOpacity }}
              >
                <HeroRotatingWord show={true} words={rotatingWords} index={currentWordIndex} isOverDark={hasMediaBackground} colorOverride={!!heroColors.headlineStyle.color} />
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            {hasSubheadlineContent && (
              <motion.p
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 3.6 }}
                className={cn("mt-10 text-sm md:text-base font-sans font-light leading-relaxed", alignment.subheadline, heroColors.subheadlineClass)}
                style={{ y: subheadlineY, ...heroColors.subheadlineStyle }}
              >
                {subheadlineLine1}
                {subheadlineLine1 && subheadlineLine2 && <br />}
                {subheadlineLine2}
              </motion.p>
            )}

            {/* CTAs */}
            <motion.div
              className={cn("mt-10 flex flex-col gap-6", alignment.cta)}
              style={{ y: ctaY }}
            >
              <div className={cn("flex flex-col sm:flex-row items-center gap-4", alignment.ctaRow)}>
                <motion.div
                  initial={{ opacity: 0, y: 25, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ ...springTransition, delay: 4.2 }}
                >
                  <button
                    onClick={() => setConsultationOpen(true)}
                    // eslint-disable-next-line no-restricted-syntax -- inline-flex items-center is button-internal icon+text cross-axis centering, not hero content alignment
                    className={cn(
                      "group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal rounded-full hover:shadow-xl transition-all duration-300 text-center active:scale-[0.98] inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6",
                      heroColors.primaryButtonClass,
                    )}
                    style={heroColors.primaryButtonStyle}
                  >
                    <span className="relative z-10">I am a new client</span>
                    <ArrowRight className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-300" />
                  </button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 25, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ ...springTransition, delay: 4.6 }}
                >
                  <Link
                    to="/booking"
                    // eslint-disable-next-line no-restricted-syntax -- inline-flex items-center is button-internal icon+text cross-axis centering, not hero content alignment
                    className={cn(
                      "group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border rounded-full transition-all duration-300 text-center relative overflow-hidden inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6",
                      heroColors.secondaryButtonClass,
                    )}
                    style={heroColors.secondaryButtonStyle}
                  >
                    <span className="relative z-10">I am a returning client</span>
                    <ArrowRight className="w-0 h-4 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-300" />
                  </Link>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 5.1 }}
              >
                <HeroNotes
                  alignment={alignment}
                  line1="New clients begin with a $15 consultation"
                  line2="Returning clients are free to book their known services"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator (operator-toggled, parity-shared with rotator) */}
      <HeroScrollIndicator
        show={heroConfig?.show_scroll_indicator ?? true}
        text={heroConfig?.scroll_indicator_text}
        onMedia={hasMediaBackground}
        onClick={scrollToContent}
      />

      {/* Consultation Form Dialog */}
      <ConsultationFormDialog open={consultationOpen} onOpenChange={setConsultationOpen} />
    </section>
  );
}
