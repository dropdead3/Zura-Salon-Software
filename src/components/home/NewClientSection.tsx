import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";

const benefits = [
  "Complimentary Drinks & Snacks",
  "Fun & Friendly Staff",
  "No Judgement, All Are Welcome"
];

const rotatingWords = ["Start Here", "Wanted", "Are The Best"];

export const NewClientSection = () => {
  const isPreview = useIsEditorPreview();
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });
  const { ref: scrollRef, opacity, y, blurFilter } = useScrollReveal();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect with natural variation
  useEffect(() => {
    const currentWord = rotatingWords[currentWordIndex];
    const baseTypingSpeed = 100;
    const baseDeletingSpeed = 60;
    const pauseDuration = 2500;

    const getTypingSpeed = () => baseTypingSpeed + Math.random() * 80 - 40;
    const getDeletingSpeed = () => baseDeletingSpeed + Math.random() * 30 - 15;

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, getTypingSpeed());
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, getDeletingSpeed());
      } else {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentWordIndex]);

  return (
    <section 
      className="py-12 md:py-16 pb-16 md:pb-20 lg:pb-24 relative z-10"
      style={{ 
        background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)' 
      }}
    >
      <div className="container mx-auto px-6">
        <motion.div 
          ref={scrollRef}
          data-theme="light"
          className="relative rounded-t-2xl p-12 md:p-16 lg:p-20 pb-20 md:pb-28 lg:pb-36 overflow-visible"
          style={isPreview ? { 
            opacity: 1, 
            y: 0, 
            filter: 'none',
            background: 'linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--secondary)) 70%, transparent 100%)'
          } : {
            opacity, 
            y, 
            filter: blurFilter,
            background: 'linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--secondary)) 70%, transparent 100%)'
          }}
        >
          <div ref={contentRef} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">
            {/* Content */}
            <div className="flex-1 max-w-2xl">
              <motion.h2
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(4px)" }}
                transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-3xl md:text-4xl lg:text-5xl font-display mb-6"
              >
                <span className="whitespace-nowrap">New Clients</span>{" "}
                <span className="inline-block min-w-[180px] md:min-w-[220px]">{displayText}</span>
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
                className="text-foreground/80 text-base md:text-lg leading-relaxed mb-8"
              >
                Let's get you matched to a stylist right for you. We just need a some details from you. 
                You may be required to come in for a consultation to best understand your needs and 
                perhaps even perform a strand test for any lightening or custom color services.
              </motion.p>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
                className="flex flex-wrap gap-3"
              >
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-background border border-oat/60 rounded-full px-4 py-2.5 text-sm"
                  >
                    <Check className="w-4 h-4 text-oat-foreground" strokeWidth={2} />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
              className="flex-shrink-0"
            >
              <Link
                to="/booking"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-full px-8 py-4 text-base font-medium hover:bg-primary/90 transition-colors duration-300 group"
              >
                <span>Let's Get Started</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
