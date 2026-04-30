import { Link } from "react-router-dom";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { ConsultationFormDialog } from "@/components/ConsultationFormDialog";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useHeroConfig, DEFAULT_HERO } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";

const rotatingWords = ["Salon", "Extensions", "Salon", "Blonding", "Salon", "Color", "Salon", "Results"];

interface HeroSectionProps {
  videoSrc?: string;
  isPreview?: boolean;
}

export function HeroSection({ videoSrc, isPreview = false }: HeroSectionProps) {
  const { data: dbHeroConfig } = useHeroConfig();
  // In editor preview mode, merge unsaved edits broadcast from the editor.
  const heroConfig = useLiveOverride('section_hero', dbHeroConfig);
  const headlineText = heroConfig?.headline_text ?? DEFAULT_HERO.headline_text;
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

  // Cycle through words
  useEffect(() => {
    if (!isAnimationReady) return;
    
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isAnimationReady]);
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

  // In preview/editor mode, render static HTML — no Framer Motion at all
  if (isPreview) {
    return (
      <section data-theme="light" className="relative flex flex-col overflow-hidden min-h-[500px] bg-background">
        <div className="flex-1 flex items-start justify-center relative z-0 pt-16 pb-16">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-xs uppercase tracking-[0.2em] font-display text-muted-foreground mb-6">
                Hair • Color • Artistry
              </p>
              <h1 className="font-display text-[clamp(2.25rem,8vw,5.5rem)] font-normal text-foreground leading-[0.95] flex flex-col items-center">
                <span className="whitespace-nowrap block">{headlineText}</span>
                <span className="block">{rotatingWords[currentWordIndex]}</span>
              </h1>
              <p className="mt-8 text-sm md:text-base text-muted-foreground font-sans font-light max-w-md mx-auto leading-relaxed">
                Where technical talent meets artistry.
                <br />
                We believe in more than just the status quo.
              </p>
              <div className="mt-10 flex flex-col items-center gap-3">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setConsultationOpen(true)}
                    className="w-full sm:w-auto px-8 py-4 text-base font-sans font-normal bg-foreground text-background rounded-full"
                  >
                    I am a new client
                  </button>
                  <Link
                    to="/booking"
                    className="w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border border-foreground text-foreground rounded-full"
                  >
                    I am a returning client
                  </Link>
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-sans">
                  <p>New clients begin with a $15 consultation</p>
                  <p>Returning clients are free to book their known services</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ConsultationFormDialog open={consultationOpen} onOpenChange={setConsultationOpen} />
      </section>
    );
  }

  return (
    <section ref={sectionRef} data-theme="light" className="relative flex flex-col overflow-hidden min-h-screen">
      {/* Video Background */}
      {videoSrc && (
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
      {!videoSrc && (
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
        className="flex-1 flex items-start justify-center relative z-0 pt-28 pb-32 lg:pt-36 lg:pb-48"
        style={{ opacity }}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ ...springTransition, delay: 2.0 }}
              style={{ y: taglineY }}
            >
              <Eyebrow className="text-muted-foreground mb-6">
                Hair • Color • Artistry
              </Eyebrow>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              className="font-display text-[clamp(2.25rem,8vw,5.5rem)] font-normal text-foreground leading-[0.95] flex flex-col items-center"
              style={{ y: headlineY, filter: headingBlurFilter }}
            >
              <motion.span 
                className="whitespace-nowrap block"
                initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 2.5 }}
                style={{ x: topLineX, opacity: headlineScrollOpacity }}
              >
                {headlineText}
              </motion.span>
              <motion.span 
                className="block overflow-hidden h-[1.15em]"
                initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...springTransition, delay: 2.5 }}
                style={{ x: bottomLineX, opacity: headlineScrollOpacity }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={rotatingWords[currentWordIndex]}
                    className="block"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      ease: [0.22, 1, 0.36, 1] 
                    }}
                  >
                    {rotatingWords[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ ...springTransition, delay: 3.6 }}
              className="mt-8 text-sm md:text-base text-muted-foreground font-sans font-light max-w-md mx-auto leading-relaxed"
              style={{ y: subheadlineY }}
            >
              Where technical talent meets artistry.
              <br />
              We believe in more than just the status quo.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="mt-10 flex flex-col items-center gap-3"
              style={{ y: ctaY }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 25, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ ...springTransition, delay: 4.2 }}
                >
                  <button
                    onClick={() => setConsultationOpen(true)}
                    className="group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal bg-foreground text-background rounded-full hover:bg-foreground/90 hover:shadow-xl transition-all duration-300 text-center active:scale-[0.98] inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6"
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
                    className="group w-full sm:w-auto px-8 py-4 text-base font-sans font-normal border border-foreground text-foreground rounded-full transition-all duration-300 text-center relative overflow-hidden inline-flex items-center justify-center gap-0 hover:gap-2 hover:pr-6"
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
                className="flex flex-col items-center gap-1 text-xs md:text-sm text-muted-foreground font-sans"
              >
                <p>New clients begin with a $15 consultation</p>
                <p>Returning clients are free to book their known services</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 5.8 }}
        onClick={scrollToContent}
        className="absolute bottom-8 inset-x-0 mx-auto w-fit flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-20"
        aria-label="Scroll down"
      >
        <span className="text-xs uppercase tracking-normal md:tracking-[0.2em] font-display">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.button>

      {/* Consultation Form Dialog */}
      <ConsultationFormDialog open={consultationOpen} onOpenChange={setConsultationOpen} />
    </section>
  );
}
