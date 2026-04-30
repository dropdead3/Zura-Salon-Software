import { Link } from "react-router-dom";
import { ArrowUpRight, Phone } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useActiveLocations } from "@/hooks/useLocations";
import { useOrgPath } from "@/hooks/useOrgPath";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";
import { useFooterCTAConfig } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "@/components/home/InlineEditableText";

export function FooterCTA() {
  const isPreview = useIsEditorPreview();
  const orgPath = useOrgPath();
  const { data: locations = [] } = useActiveLocations();
  const sectionRef = useRef<HTMLElement>(null);
  const { data: dbConfig } = useFooterCTAConfig();
  const config = useLiveOverride('section_footer_cta', dbConfig) ?? dbConfig;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"]
  });

  // Staggered reveal animations
  const eyebrowOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);
  const eyebrowY = useTransform(scrollYProgress, [0.15, 0.4], [40, 0]);
  const eyebrowBlur = useTransform(scrollYProgress, [0.15, 0.35], [12, 0]);
  const eyebrowFilter = useTransform(eyebrowBlur, (v) => `blur(${v}px)`);

  const topLineOpacity = useTransform(scrollYProgress, [0.25, 0.55], [0, 1]);
  const topLineY = useTransform(scrollYProgress, [0.25, 0.55], [50, 0]);
  const topLineX = useTransform(scrollYProgress, [0.25, 0.55], [-40, 0]);
  const topLineBlur = useTransform(scrollYProgress, [0.25, 0.5], [15, 0]);
  const topLineFilter = useTransform(topLineBlur, (v) => `blur(${v}px)`);

  const bottomLineOpacity = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);
  const bottomLineY = useTransform(scrollYProgress, [0.3, 0.6], [50, 0]);
  const bottomLineX = useTransform(scrollYProgress, [0.3, 0.6], [40, 0]);
  const bottomLineBlur = useTransform(scrollYProgress, [0.3, 0.55], [15, 0]);
  const bottomLineFilter = useTransform(bottomLineBlur, (v) => `blur(${v}px)`);

  const descOpacity = useTransform(scrollYProgress, [0.5, 0.8], [0, 1]);
  const descY = useTransform(scrollYProgress, [0.5, 0.8], [40, 0]);
  const descBlur = useTransform(scrollYProgress, [0.5, 0.75], [12, 0]);
  const descFilter = useTransform(descBlur, (v) => `blur(${v}px)`);

  const ctaOpacity = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.6, 0.9], [40, 0]);
  const ctaBlur = useTransform(scrollYProgress, [0.6, 0.85], [12, 0]);
  const ctaFilter = useTransform(ctaBlur, (v) => `blur(${v}px)`);

  return (
    <section 
      id="section-footer_cta"
      ref={sectionRef}
      className="relative z-10 bg-secondary text-foreground py-28 lg:py-32 text-center overflow-hidden"
      data-theme="light"
    >
      <div className="container mx-auto px-6 lg:px-12">
        {/* Eyebrow */}
        {config.show_eyebrow && config.eyebrow && (
          <motion.p 
            className="text-foreground/50 text-sm md:text-xs uppercase tracking-[0.2em] font-display mb-6"
            style={isPreview ? { opacity: 1, y: 0, filter: 'none' } : { 
              opacity: eyebrowOpacity, 
              y: eyebrowY,
              filter: eyebrowFilter,
            }}
          >
            {config.eyebrow}
          </motion.p>
        )}

        {/* Main headline - Split into two lines */}
        {config.show_headline && (
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-foreground mb-6 flex flex-col items-center leading-[0.95]">
            {config.headline_line1 && (
              <motion.span 
                className="block"
                style={isPreview ? { opacity: 1, y: 0, x: 0, filter: 'none' } : { 
                  opacity: topLineOpacity, 
                  y: topLineY,
                  x: topLineX,
                  filter: topLineFilter,
                }}
              >
                {config.headline_line1}
              </motion.span>
            )}
            {config.headline_line2 && (
              <motion.span 
                className="block"
                style={isPreview ? { opacity: 1, y: 0, x: 0, filter: 'none' } : { 
                  opacity: bottomLineOpacity, 
                  y: bottomLineY,
                  x: bottomLineX,
                  filter: bottomLineFilter,
                }}
              >
                {config.headline_line2}
              </motion.span>
            )}
          </h2>
        )}

        {/* Description */}
        {config.show_description && config.description && (
          <motion.p 
            className="text-foreground/60 text-lg md:text-xl font-sans font-light max-w-xl mx-auto mb-10"
            style={isPreview ? { opacity: 1, y: 0, filter: 'none' } : { 
              opacity: descOpacity, 
              y: descY,
              filter: descFilter,
            }}
          >
            {config.description}
          </motion.p>
        )}

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col items-center justify-center gap-4"
          style={isPreview ? { opacity: 1, y: 0, filter: 'none' } : { 
            opacity: ctaOpacity, 
            y: ctaY,
            filter: ctaFilter,
          }}
        >
          {config.show_cta_button && config.cta_text && (
            <Link
              to={config.cta_url ? orgPath(config.cta_url) : orgPath("/booking")}
              className="group inline-flex items-center gap-3 px-8 py-4 text-base font-sans font-medium bg-foreground text-background rounded-full hover:bg-foreground/90 transition-all duration-300 active:scale-[0.98]"
            >
              <span>{config.cta_text}</span>
              <ArrowUpRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}

          {/* Phone numbers */}
          {config.show_phone_numbers && locations.length > 0 && (
            <div className="flex items-center gap-2 text-foreground/50">
              <span className="text-sm font-sans">or call</span>
              {locations.map((loc, index) => (
                <span key={loc.name} className="inline-flex items-center">
                  <a
                    href={`tel:${loc.phone.replace(/[^0-9]/g, "")}`}
                    className="inline-flex items-center gap-1.5 text-sm font-sans text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <Phone size={14} />
                    <span>{loc.name}</span>
                  </a>
                  {index < locations.length - 1 && <span className="mx-2 text-foreground/30">·</span>}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
