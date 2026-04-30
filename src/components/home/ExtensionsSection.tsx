import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Section } from "@/components/ui/section";
import { ArrowRight, Star, Zap, MapPin, Play, Award, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { BeforeAfterSlider, BeforeAfterSliderHandle } from "./BeforeAfterSlider";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";
import { useExtensionsConfig } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "@/components/home/InlineEditableText";

const ICON_MAP: Record<string, LucideIcon> = {
  Star,
  Award,
  MapPin,
};

export function ExtensionsSection() {
  const isPreview = useIsEditorPreview();
  const { data: dbConfig } = useExtensionsConfig();
  const config = useLiveOverride('section_extensions', dbConfig) ?? dbConfig;

  const contentRef = useRef(null);
  const featuresRef = useRef(null);
  const sliderRef = useRef<BeforeAfterSliderHandle>(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });
  const featuresInView = useInView(featuresRef, { once: true, margin: "-50px" });
  const { ref: scrollRef, opacity, y, blurFilter } = useScrollReveal();

  return (
    <Section className="bg-background overflow-hidden" theme="light">
      <motion.div 
        ref={scrollRef} 
        className="relative bg-foreground text-background rounded-3xl p-8 md:p-12 lg:p-16 overflow-hidden"
        style={isPreview ? { opacity: 1, y: 0, filter: 'none' } : { opacity, y, filter: blurFilter }}
      >
        {/* Background accent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 0.03, scale: 1 } : {}}
          transition={{ duration: 1.2 }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-oat blur-3xl pointer-events-none"
        />

        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
          {/* Left side - Content */}
          <div className="space-y-8">
            {config.badge_text && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-oat/20 border border-oat-foreground/30 rounded-full badge-shine"
              >
                <Star className="w-4 h-4 fill-oat text-oat" />
                <span className="text-sm font-display uppercase tracking-wide text-oat">{config.badge_text}</span>
              </motion.div>
            )}

            {config.show_eyebrow && config.eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="text-sm font-display uppercase tracking-widest text-oat/70 mb-1"
              >
                {config.eyebrow}
              </motion.p>
            )}

            {config.show_headline && (
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="font-display text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight leading-[1.1]"
              >
                <span className="whitespace-nowrap">{config.headline_line1}</span>
                {config.headline_line2 && (
                  <>
                    <br />
                    <span className="font-light text-oat">{config.headline_line2}</span>
                  </>
                )}
              </motion.h2>
            )}

            {config.show_description && config.description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg md:text-xl font-sans font-light leading-relaxed text-background/80 max-w-xl"
              >
                {config.description}
              </motion.p>
            )}

            {config.show_features && config.features.length > 0 && (
              <div ref={featuresRef} className="space-y-5">
                {config.features.map((feature, index) => {
                  const Icon = ICON_MAP[feature.icon] ?? Star;
                  return (
                    <motion.div
                      key={`${feature.title}-${index}`}
                      initial={{ opacity: 0, x: -30 }}
                      animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ 
                        duration: 0.6, 
                        delay: index * 0.15,
                        ease: [0.25, 0.1, 0.25, 1]
                      }}
                      className="flex items-start gap-4 group"
                    >
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={featuresInView ? { scale: 1, opacity: 1 } : {}}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.15 + 0.1,
                          ease: "easeOut"
                        }}
                        className="flex-shrink-0 w-12 h-12 bg-oat/20 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-oat/30"
                      >
                        <Icon className="w-5 h-5 text-oat" />
                      </motion.div>
                      <div>
                        <motion.h3 
                          initial={{ opacity: 0, y: 10 }}
                          animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ 
                            duration: 0.5, 
                            delay: index * 0.15 + 0.15,
                            ease: "easeOut"
                          }}
                          className="font-medium text-background mb-1"
                        >
                          {feature.title}
                        </motion.h3>
                        <motion.p 
                          initial={{ opacity: 0, y: 10 }}
                          animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                          transition={{ 
                            duration: 0.5, 
                            delay: index * 0.15 + 0.2,
                            ease: "easeOut"
                          }}
                          className="text-sm text-background/60"
                        >
                          {feature.description}
                        </motion.p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="space-y-4 pt-4"
            >
              <div className="flex flex-wrap gap-4">
                {config.show_primary_cta && config.cta_primary && (
                  <Link
                    to={config.cta_primary_url || "/booking"}
                    className="group inline-flex items-center gap-3 bg-oat text-oat-foreground px-6 py-3.5 text-sm font-medium tracking-wide rounded-full hover:bg-oat/90 transition-all duration-300"
                  >
                    <span>{config.cta_primary}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                )}
                {config.show_secondary_cta && config.cta_secondary && (
                  <Link
                    to={config.cta_secondary_url || "/services"}
                    className="group inline-flex items-center gap-3 border border-background/30 text-background px-6 py-3.5 text-sm font-medium tracking-wide rounded-full hover:bg-background/10 transition-all duration-300"
                  >
                    <span>{config.cta_secondary}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
              {config.show_education_link && config.education_link_text && (
                <Link
                  to={config.education_link_url || "/education"}
                  className="group inline-flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors duration-300"
                >
                  <span>{config.education_link_text}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              )}
            </motion.div>
          </div>

          {/* Right side - Before/After Slider */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative"
          >
            <BeforeAfterSlider
              ref={sliderRef}
              beforeImage="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=750&fit=crop"
              afterImage="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=750&fit=crop"
              beforeLabel="Before"
              afterLabel="After Extensions"
              className="aspect-[4/5] rounded-3xl"
              hideDefaultVideoButton={true}
              hoverMode={true}
            />
              
            {/* Floating badge */}
            {config.show_floating_badge && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="absolute bottom-6 left-6 right-6 bg-background/95 backdrop-blur-sm p-5 rounded-2xl z-30"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-oat-foreground" />
                      </div>
                      <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{config.floating_badge_text}</span>
                    </div>
                    {config.floating_badge_description && (
                      <p className="text-sm text-foreground leading-relaxed">
                        {config.floating_badge_description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => sliderRef.current?.playVideo()}
                    className="flex-shrink-0 w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center hover:bg-foreground/90 transition-colors duration-200"
                    aria-label="Watch video"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Decorative element */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 0.6, x: 0 } : {}}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute -top-4 -right-4 w-24 h-24 border border-oat/40 rounded-2xl"
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 0.6, x: 0 } : {}}
              transition={{ duration: 1, delay: 0.6 }}
              className="absolute -bottom-4 -left-4 w-32 h-32 border border-oat/40 rounded-2xl"
            />
          </motion.div>
        </div>
      </motion.div>
    </Section>
  );
}
