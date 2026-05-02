import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Star, ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useVisibleTestimonials } from "@/hooks/useTestimonials";
import { useTestimonialsConfig } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { InlineEditableText } from "@/components/home/InlineEditableText";
import { SectionStyleWrapper } from "@/components/home/SectionStyleWrapper";

interface ReviewItem {
  id: string;
  title: string;
  author: string;
  body: string;
  rating: number;
  source_url: string | null;
  sort_order: number;
}

const FALLBACK_REVIEWS: ReviewItem[] = [
  {
    id: 'fallback-1',
    title: "Love this place!",
    author: "Lexi V.",
    body: "I love this place! The owner picks literally THE BEST hair stylist and lash and brow artists. You really can't go wrong with going to anyone inside the studio, everyone is so welcoming and friendly.",
    rating: 5,
    source_url: null,
    sort_order: 0,
  },
  {
    id: 'fallback-2',
    title: "You won't be disappointed",
    author: "Melissa C.",
    body: "The salon itself is beautiful and so unique. The atmosphere is comforting and fun!! Never have I loved my hair this much!! Definitely recommend to anyone wanting to a new salon!! You won't be disappointed.",
    rating: 5,
    source_url: null,
    sort_order: 1,
  },
  {
    id: 'fallback-3',
    title: "Hair transformation goals",
    author: "Jamie L.",
    body: "Went from damaged, over-processed hair to the healthiest it's ever been. The team really knows their stuff and takes the time to educate you on proper hair care.",
    rating: 5,
    source_url: null,
    sort_order: 2,
  },
];

const StarRating = ({ rating, show }: { rating: number; show: boolean }) => {
  if (!show) return null;
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? "w-4 h-4 fill-oat text-oat"
              : "w-4 h-4 text-foreground/20"
          }
        />
      ))}
    </div>
  );
};

const ReviewCard = ({
  review,
  showStars,
  verifiedText,
}: {
  review: ReviewItem;
  showStars: boolean;
  verifiedText: string;
}) => (
  <div className="flex-shrink-0 w-[320px] md:w-[380px] bg-background border border-border rounded-2xl p-6 md:p-8">
    <h3 className="text-xl md:text-2xl font-display mb-4">{review.title}</h3>

    <div className="flex items-center gap-3 mb-3">
      <span className="text-sm font-medium">{review.author}</span>
      {verifiedText && (
        <span className="text-xs text-muted-foreground">{verifiedText}</span>
      )}
    </div>

    {showStars && (
      <div className="mb-4">
        <StarRating rating={review.rating} show={showStars} />
      </div>
    )}

    <p className="text-sm text-foreground/80 leading-relaxed">{review.body}</p>
  </div>
);

export function TestimonialSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [isPaused, setIsPaused] = useState(false);

  // Chrome config (eyebrow / headline / google review link / display options).
  const { data: dbConfig } = useTestimonialsConfig();
  const config = useLiveOverride('section_testimonials', dbConfig) ?? dbConfig;

  // Items: DB-backed + bridge override for live edits.
  const { data: dbItems } = useVisibleTestimonials('general');
  const liveItems = useLiveOverride<ReviewItem[]>('testimonial_items:general', dbItems);
  const items = (liveItems ?? dbItems ?? []) as ReviewItem[];
  const reviews = items.length > 0 ? items : FALLBACK_REVIEWS;

  // Cap visible items based on config.
  const cap = config?.max_visible_testimonials ?? 20;
  const cappedReviews = reviews.slice(0, cap);

  // Duplicate reviews for seamless infinite scroll.
  const duplicatedReviews = [...cappedReviews, ...cappedReviews];

  const animationDuration = config?.scroll_animation_duration ?? 60;
  const showStars = config?.show_star_ratings ?? true;
  const verifiedText = config?.verified_badge_text ?? 'Verified Customer';

  return (
    <SectionStyleWrapper styleOverrides={config?.style_overrides}>
    <section
      ref={sectionRef}
      data-theme="light"
      className="py-20 lg:py-32 overflow-hidden"
    >
      {/* Header */}
      <div className="container mx-auto px-6 lg:px-12 mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex flex-col gap-3">
            {config?.show_eyebrow && config.eyebrow && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6 }}
              >
                <Eyebrow>
                  <InlineEditableText
                    value={config.eyebrow}
                    sectionKey="section_testimonials"
                    fieldPath="eyebrow"
                  />
                </Eyebrow>
              </motion.div>
            )}
            {config?.show_headline && config.headline && (
              <motion.h2
                initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-3xl md:text-4xl lg:text-5xl font-display"
              >
                <InlineEditableText
                  value={config.headline}
                  sectionKey="section_testimonials"
                  fieldPath="headline"
                />
              </motion.h2>
            )}
          </div>

          {config?.show_google_review_link && config.google_review_url && (
            <motion.a
              href={config.google_review_url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 text-sm font-medium link-underline group"
            >
              {config.link_text || 'Leave a review'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </motion.a>
          )}
        </div>
      </div>

      {/* Infinite Scrolling Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="hidden md:block absolute left-0 top-0 bottom-0 md:w-64 lg:w-80 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
        <div className="hidden md:block absolute right-0 top-0 bottom-0 md:w-64 lg:w-80 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

        <div
          className="flex gap-4"
          style={{
            animation: `scroll ${animationDuration}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            width: 'max-content',
          }}
        >
          {duplicatedReviews.map((review, index) => (
            <ReviewCard
              key={`${review.id}-${index}`}
              review={review}
              showStars={showStars}
              verifiedText={verifiedText}
            />
          ))}
        </div>
      </motion.div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
    </SectionStyleWrapper>
  );
}
