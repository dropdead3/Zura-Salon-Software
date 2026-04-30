import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Section } from "@/components/ui/section";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import { Images, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";
import { useGalleryDisplayConfig, DEFAULT_GALLERY_DISPLAY } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "./InlineEditableText";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

// Gallery images - replace with real salon work
const galleryImages = [
  { 
    id: 1, 
    src: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&h=800&fit=crop",
    alt: "Blonde balayage transformation"
  },
  { 
    id: 2, 
    src: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=800&fit=crop",
    alt: "Creative color work"
  },
  { 
    id: 3, 
    src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=800&fit=crop",
    alt: "Styled hair finish"
  },
];

// Before/after transformations
const transformations = [
  { 
    id: 1, 
    beforeImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=800&fit=crop",
    afterImage: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&h=800&fit=crop",
    beforeLabel: "Before", 
    afterLabel: "Balayage" 
  },
];

export function GallerySection() {
  const isPreview = useIsEditorPreview();
  const contentRef = useRef(null);
  const isInView = useInView(contentRef, { once: true, margin: "-100px" });
  const { ref: scrollRef, opacity, y, blurFilter } = useScrollReveal();
  const { data: dbConfig } = useGalleryDisplayConfig();
  const config = useLiveOverride('section_gallery_display', dbConfig) ?? dbConfig ?? DEFAULT_GALLERY_DISPLAY;

  const titleText = config?.section_title ?? DEFAULT_GALLERY_DISPLAY.section_title;
  const titleHighlightText = config?.section_title_highlight ?? DEFAULT_GALLERY_DISPLAY.section_title_highlight;
  const eyebrowText = config?.section_eyebrow ?? DEFAULT_GALLERY_DISPLAY.section_eyebrow;
  const descriptionText = config?.section_description ?? DEFAULT_GALLERY_DISPLAY.section_description;
  const ctaText = config?.cta_text ?? DEFAULT_GALLERY_DISPLAY.cta_text;
  const showEyebrow = config?.show_eyebrow ?? true;
  const showTitle = config?.show_title ?? true;
  const showDescription = config?.show_description ?? true;
  const showCta = config?.show_cta ?? true;

  return (
    <Section theme="light">
      <motion.div
        ref={scrollRef}
        style={isPreview ? { opacity: 1, y: 0, filter: 'none' } : { opacity, y, filter: blurFilter }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          {isPreview ? (
            <div className="flex-1">
              {showEyebrow && (
                <Eyebrow className="text-muted-foreground mb-4 section-eyebrow">
                  <InlineEditableText
                    value={eyebrowText}
                    sectionKey="section_gallery_display"
                    fieldPath="section_eyebrow"
                  />
                </Eyebrow>
              )}
              {showTitle && (
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.1]">
                  <InlineEditableText
                    value={titleText}
                    sectionKey="section_gallery_display"
                    fieldPath="section_title"
                  />
                  <br />
                  <span className="font-light">
                    <InlineEditableText
                      value={titleHighlightText}
                      sectionKey="section_gallery_display"
                      fieldPath="section_title_highlight"
                    />
                  </span>
                </h2>
              )}
            </div>
          ) : (
            <SectionHeader
              eyebrow={showEyebrow ? eyebrowText : undefined}
              title={showTitle ? titleText : ""}
              titleHighlight={showTitle ? titleHighlightText : undefined}
              animate
              isInView={isInView}
            />
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col gap-4"
          >
            {showDescription && (
              <p className="text-sm text-muted-foreground font-sans max-w-xs">
                {isPreview ? (
                  <InlineEditableText
                    value={descriptionText}
                    sectionKey="section_gallery_display"
                    fieldPath="section_description"
                    multiline
                  />
                ) : descriptionText}
              </p>
            )}
            {showCta && (
              <Link
                to="/gallery"
                className="inline-flex items-center gap-2 text-sm font-sans font-medium text-foreground hover:text-foreground/70 transition-colors group w-fit"
              >
                <Images className="w-4 h-4" />
                <span>
                  {isPreview ? (
                    <InlineEditableText
                      value={ctaText}
                      sectionKey="section_gallery_display"
                      fieldPath="cta_text"
                    />
                  ) : ctaText}
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )}
          </motion.div>
        </div>

        <div
          ref={contentRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Before/After Slider - Featured */}
          {transformations.map((transform, index) => (
            <motion.div
              key={`transform-${transform.id}`}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <BeforeAfterSlider
                beforeImage={transform.beforeImage}
                afterImage={transform.afterImage}
                beforeLabel={transform.beforeLabel}
                afterLabel={transform.afterLabel}
                hoverMode={true}
                badgePositionClass="top-[24px] left-[24px]"
                className="rounded-xl"
              />
            </motion.div>
          ))}

          {/* Regular Gallery Images with Skeleton */}
          {galleryImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: (index + transformations.length) * 0.1 }}
              className="relative aspect-[3/4] overflow-hidden rounded-xl group cursor-pointer"
            >
              <ImageWithSkeleton
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                wrapperClassName="absolute inset-0"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-500" />

              {/* Hover reveal */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="text-xs uppercase tracking-[0.15em] text-background font-display bg-foreground px-2 py-1">
                  View
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}
