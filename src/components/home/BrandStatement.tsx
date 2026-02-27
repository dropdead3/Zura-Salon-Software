import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";

const rotatingWords = [
  "Average",
  "Boring",
  "Mother's",
  "Standard",
  "Typical",
  "Basic",
  "Ordinary",
];

export function BrandStatement() {
  const isPreview = useIsEditorPreview();
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Scroll-based opacity and blur: starts transparent/blurred, fully visible sooner
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start 0.6"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1]);
  const blur = useTransform(scrollYProgress, [0, 0.5], [8, 0]);
  const blurFilter = useTransform(blur, (v) => `blur(${v}px)`);
  const y = useTransform(scrollYProgress, [0, 0.7], [40, 0]);

  // Typewriter effect with natural variation
  useEffect(() => {
    const currentWord = rotatingWords[currentWordIndex];
    const baseTypingSpeed = 100;
    const baseDeletingSpeed = 60;
    const pauseDuration = 2500;

    // Add random variation for natural feel
    const getTypingSpeed = () => baseTypingSpeed + Math.random() * 80 - 40; // 60-140ms
    const getDeletingSpeed = () => baseDeletingSpeed + Math.random() * 30 - 15; // 45-75ms

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      // Typing
      if (displayText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, getTypingSpeed());
      } else {
        // Word complete, pause then start deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, getDeletingSpeed());
      } else {
        // Word deleted, move to next word
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentWordIndex]);

  // Find the longest word to set a fixed width
  const longestWord = rotatingWords.reduce((a, b) => a.length > b.length ? a : b);

  return (
    <Section className="bg-background" theme="light">
      <motion.div 
        ref={containerRef}
        data-theme="dark"
        className="bg-foreground text-background p-12 md:p-20 lg:p-24"
        style={isPreview ? { opacity: 1, filter: 'none', y: 0 } : { opacity, filter: blurFilter, y }}
      >
        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 lg:gap-12 items-center">
          {/* Left side - Title */}
          <motion.div
            initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
            animate={isInView ? { opacity: 1, x: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Eyebrow className="text-background/60 mb-4">
              We are
            </Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.1]">
              Not Your
              <br />
              <span className="font-light">
                {displayText}
              </span>
              <br />
              <span className="font-light">Salon</span>
            </h2>
          </motion.div>

          {/* Right side - Description */}
          <motion.div
            initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
            animate={isInView ? { opacity: 1, x: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-6"
          >
            <p className="text-base md:text-lg font-sans font-light leading-relaxed text-background/80">
              Located in the heart of Mesa and Gilbert, Arizona, our salon has become the Phoenix Valley's destination for transformative hair experiences. Clients travel from Scottsdale, Chandler, Tempe, and across the East Valley to experience our artistry.
            </p>
            <p className="text-base md:text-lg font-sans font-light leading-relaxed text-background/80">
              Experience an extensive range of innovative treatments meticulously crafted by our artist-led team—where science meets beauty in Arizona's premier luxury salon.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </Section>
  );
}
