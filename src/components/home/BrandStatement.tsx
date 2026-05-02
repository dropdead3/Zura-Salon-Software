import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect, useMemo } from "react";
import { Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";
import { useBrandStatementConfig } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "@/components/home/InlineEditableText";
import { SectionStyleWrapper } from "@/components/home/SectionStyleWrapper";
import { pickReadableForeground } from "@/lib/color-contrast";

export function BrandStatement() {
  const isPreview = useIsEditorPreview();
  const { data: dbConfig } = useBrandStatementConfig();
  const config = useLiveOverride('section_brand_statement', dbConfig) ?? dbConfig;

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const rotatingWords = config.show_headline && config.rotating_words.length > 0
    ? config.rotating_words
    : [""];

  // Scroll-based opacity and blur
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start 0.6"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1]);
  const blur = useTransform(scrollYProgress, [0, 0.5], [8, 0]);
  const blurFilter = useTransform(blur, (v) => `blur(${v}px)`);
  const y = useTransform(scrollYProgress, [0, 0.7], [40, 0]);

  // Reset typewriter index if rotating-words list shrinks while editing
  useEffect(() => {
    if (currentWordIndex >= rotatingWords.length) {
      setCurrentWordIndex(0);
      setDisplayText("");
      setIsDeleting(false);
    }
  }, [rotatingWords.length, currentWordIndex]);

  // Typewriter effect with natural variation
  useEffect(() => {
    const currentWord = rotatingWords[currentWordIndex] ?? "";
    const baseTypingSpeed = config.typewriter_speed ?? 100;
    const baseDeletingSpeed = 60;
    const pauseDuration = (config.typewriter_pause ?? 2) * 1000;

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
  }, [displayText, isDeleting, currentWordIndex, rotatingWords, config.typewriter_speed, config.typewriter_pause]);

  // Container frame defaults preserve the original dark card look (foreground
  // fill, generous padding, soft radius). Operator overrides win — picking a
  // Color / Gradient / Image / Video in the editor's Container Frame panel
  // replaces the fill; toggling the Container Frame switch off removes it
  // entirely. Text color stays light by default (`text-background`) so the
  // dark fill reads correctly; switch to Text Color Override in the editor
  // when picking a light container color.
  const containerDefaults: Partial<typeof config.style_overrides> = {
    container_enabled: true,
    container_background_type: 'color',
    container_background_value: 'hsl(var(--foreground))',
    container_padding: 80,
    container_radius: 16,
    container_max_width: 'full',
  };
  const mergedOverrides = { ...containerDefaults, ...(config.style_overrides ?? {}) };

  return (
    <SectionStyleWrapper styleOverrides={mergedOverrides}>
    <Section theme="light">
      <motion.div
        ref={containerRef}
        className="text-background"
        style={isPreview ? { opacity: 1, filter: 'none', y: 0 } : { opacity, filter: blurFilter, y }}
      >
        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 lg:gap-12 items-center">
          {/* Left side - Title */}
          <motion.div
            initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
            animate={isInView ? { opacity: 1, x: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {config.show_eyebrow && config.eyebrow && (
              <Eyebrow
                className="text-background/60 mb-4"
                style={config.text_colors?.eyebrow ? { color: config.text_colors.eyebrow } : undefined}
              >
                {config.eyebrow}
              </Eyebrow>
            )}
            {config.show_headline && (
              <h2
                className="font-display font-normal tracking-tight leading-[1.1]"
                // Heading scale opt-in — multiplies the base size via the
                // `--section-heading-scale` CSS var on the section wrapper.
                style={{ fontSize: 'calc(clamp(1.875rem, 4vw, 3rem) * var(--section-heading-scale, 1))' }}
              >
                <InlineEditableText
                  as="span"
                  value={config.headline_prefix}
                  sectionKey="section_brand_statement"
                  fieldPath="headline_prefix"
                  placeholder="Headline prefix"
                />
                <br />
                <span className="font-light">
                  {displayText}
                  {config.show_typewriter_cursor && (
                    <span className="inline-block w-[2px] h-[0.9em] bg-current ml-1 animate-pulse align-middle" />
                  )}
                </span>
                {(config.headline_suffix || isPreview) && (
                  <>
                    <br />
                    <InlineEditableText
                      as="span"
                      className="font-light"
                      value={config.headline_suffix ?? ''}
                      sectionKey="section_brand_statement"
                      fieldPath="headline_suffix"
                      placeholder="Headline suffix (optional)"
                    />
                  </>
                )}
              </h2>
            )}
          </motion.div>

          {/* Right side - Description */}
          {config.show_paragraphs && config.paragraphs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
              animate={isInView ? { opacity: 1, x: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-6"
            >
              {config.paragraphs.map((paragraph, i) => (
                <InlineEditableText
                  key={i}
                  as="p"
                  multiline
                  className="text-base md:text-lg font-sans font-light leading-relaxed text-background/80"
                  value={paragraph}
                  sectionKey="section_brand_statement"
                  fieldPath={`paragraphs.${i}`}
                  placeholder="Paragraph text"
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </Section>
    </SectionStyleWrapper>
  );
}
