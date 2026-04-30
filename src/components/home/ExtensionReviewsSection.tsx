import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { Star, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useVisibleTestimonials } from "@/hooks/useTestimonials";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { useExtensionReviewsConfig, DEFAULT_EXTENSION_REVIEWS } from "@/hooks/useSectionConfig";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";
import { InlineEditableText } from "./InlineEditableText";

interface ReviewItem {
  id: string;
  title: string;
  author: string;
  body: string;
  rating: number;
  source_url: string | null;
  sort_order: number;
}

const StarRating = () => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className="w-4 h-4 fill-foreground text-foreground" />
    ))}
  </div>
);


export function ExtensionReviewsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const prefersReducedMotion = useReducedMotion();
  const isPreview = useIsEditorPreview();

  // Items: DB-backed + bridge override for live edits.
  const { data: dbItems } = useVisibleTestimonials('extensions');
  const liveItems = useLiveOverride<ReviewItem[]>('testimonial_items:extensions', dbItems);
  const items = (liveItems ?? dbItems ?? []) as ReviewItem[];
  // Doctrine: silence is valid output. No fallback reviews — empty list yields
  // an empty carousel (or preview-only stub upstream when chips render alone).
  const extensionReviews = items;

  // Chip categories config.
  const { data: dbChipsConfig } = useExtensionReviewsConfig();
  const chipsConfig = useLiveOverride('section_extension_reviews', dbChipsConfig) ?? dbChipsConfig ?? DEFAULT_EXTENSION_REVIEWS;
  const extensionTypes = chipsConfig?.extension_categories ?? DEFAULT_EXTENSION_REVIEWS.extension_categories;
  const showCategories = chipsConfig?.show_categories ?? true;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const isAutoScrolling = useRef(false);
  
  // Momentum tracking
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const momentumRef = useRef<number | null>(null);

  // Apply momentum after drag release
  const applyMomentum = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const friction = 0.95;
    const minVelocity = 0.5;
    
    const animate = () => {
      if (Math.abs(velocityRef.current) < minVelocity) {
        momentumRef.current = null;
        container.style.scrollBehavior = 'smooth';
        return;
      }
      
      container.scrollLeft -= velocityRef.current;
      velocityRef.current *= friction;
      momentumRef.current = requestAnimationFrame(animate);
    };
    
    momentumRef.current = requestAnimationFrame(animate);
  }, []);

  const stopMomentum = useCallback(() => {
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
    velocityRef.current = 0;
  }, []);

  const scrollToCard = useCallback((index: number, smooth = true) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('[data-review-card]');
    const card = cards[index] as HTMLElement;
    
    if (!card) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollLeftPos = card.offsetLeft - (containerRect.width / 2) + (cardRect.width / 2);

    isAutoScrolling.current = true;
    
    if (smooth && !prefersReducedMotion) {
      container.scrollTo({
        left: Math.max(0, scrollLeftPos),
        behavior: 'smooth'
      });
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 800);
    } else {
      container.scrollLeft = Math.max(0, scrollLeftPos);
      isAutoScrolling.current = false;
    }
    
    setCurrentIndex(index);
  }, [prefersReducedMotion]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (!isInView || isPaused || prefersReducedMotion) return;

    const intervalId = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % extensionReviews.length;
        scrollToCard(nextIndex);
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(intervalId);
  }, [isInView, isPaused, prefersReducedMotion, scrollToCard, extensionReviews.length]);

  const handleUserScroll = useCallback(() => {
    if (!isAutoScrolling.current) {
      setIsPaused(true);
    }
    
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('[data-review-card]');
    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      const cardCenter = cardElement.offsetLeft + cardElement.offsetWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    
    setCurrentIndex(closestIndex);
  }, []);

  const goToPrevious = () => {
    setIsPaused(true);
    const newIndex = currentIndex === 0 ? extensionReviews.length - 1 : currentIndex - 1;
    scrollToCard(newIndex);
  };

  const goToNext = () => {
    setIsPaused(true);
    const newIndex = (currentIndex + 1) % extensionReviews.length;
    scrollToCard(newIndex);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    e.preventDefault();
    stopMomentum();
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setIsPaused(true);
    lastXRef.current = e.pageX;
    lastTimeRef.current = Date.now();
    scrollContainerRef.current.style.scrollBehavior = 'auto';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    
    if (dt > 0) {
      velocityRef.current = (e.pageX - lastXRef.current) / dt * 16;
    }
    
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;
    
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(velocityRef.current) > 1) {
      applyMomentum();
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (Math.abs(velocityRef.current) > 1) {
        applyMomentum();
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.style.scrollBehavior = 'smooth';
      }
    }
    setIsPaused(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    stopMomentum();
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setIsPaused(true);
    lastXRef.current = e.touches[0].pageX;
    lastTimeRef.current = Date.now();
    scrollContainerRef.current.style.scrollBehavior = 'auto';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    
    if (dt > 0) {
      velocityRef.current = (e.touches[0].pageX - lastXRef.current) / dt * 16;
    }
    
    lastXRef.current = e.touches[0].pageX;
    lastTimeRef.current = now;
    
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(velocityRef.current) > 1) {
      applyMomentum();
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
    }
  };

  return (
    <section 
      ref={sectionRef} 
      className="py-20 lg:py-32 overflow-hidden bg-background"
    >
      {/* Navigation Arrows & Progress - Desktop */}
      <div className="hidden md:flex container mx-auto px-6 mb-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              className="p-3 border border-border bg-background hover:bg-muted transition-colors"
              aria-label="Previous review"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="p-3 border border-border bg-background hover:bg-muted transition-colors"
              aria-label="Next review"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress Dots - Desktop */}
          <div className="flex items-center gap-2">
            {extensionReviews.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsPaused(true);
                  scrollToCard(index);
                }}
                className={`h-1 transition-all duration-500 ${
                  index === currentIndex
                    ? 'w-8 bg-foreground'
                    : 'w-2 bg-foreground/30 hover:bg-foreground/50'
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Review Counter */}
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {extensionReviews.length}
        </span>
      </div>

      {/* Scrolling Cards */}
      <div
        ref={scrollContainerRef}
        onScroll={handleUserScroll}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex gap-4 overflow-x-auto pb-4 select-none transition-all ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          paddingLeft: 'max(1.5rem, calc((100vw - 1280px) / 2 + 1.5rem))',
          paddingRight: '1.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {extensionReviews.map((review, index) => (
          <motion.div
            key={index}
            data-review-card
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.1 * index,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            className="flex-shrink-0 w-[320px] md:w-[380px] bg-background p-6 md:p-8"
            style={{ scrollSnapAlign: 'center' }}
          >
            <h3 className="text-xl md:text-2xl font-serif mb-4">{review.title}</h3>
            
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium">{review.author}</span>
              <span className="text-xs text-muted-foreground">Verified Customer</span>
            </div>
            
            <div className="mb-4">
              <StarRating />
            </div>
            
            <p className="text-sm text-foreground/80 leading-relaxed">
              {review.body}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Progress Dots - Mobile */}
      <div className="md:hidden flex justify-center items-center gap-4 mt-6">
        <div className="flex items-center gap-2">
          {extensionReviews.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsPaused(true);
                scrollToCard(index);
              }}
              className={`h-1 transition-all duration-500 ${
                index === currentIndex
                  ? 'w-8 bg-foreground'
                  : 'w-2 bg-foreground/30'
              }`}
              aria-label={`Go to review ${index + 1}`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {extensionReviews.length}
        </span>
      </div>

      {/* Extension Types Pills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="container mx-auto px-6 mt-16"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {extensionTypes.map((type, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-background text-sm"
            >
              <Check className="w-4 h-4 text-foreground" strokeWidth={2} />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
