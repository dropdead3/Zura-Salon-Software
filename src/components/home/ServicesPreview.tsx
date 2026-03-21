import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { Section } from "@/components/ui/section";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

const services = [
  {
    category: "Extensions",
    title: "Premium Extensions",
    price: "Clients typically spend $1,200 - $3,500",
    description: "We specialize in seamless, high-quality extensions utilizing both proprietary hand-tied and tape-in methods for natural volume transformations.",
  },
  {
    category: "Color Services",
    title: "Blonding",
    price: "Starting at $250",
    description: "Expert blonding from subtle highlights to full platinum transformations. Our colorists specialize in creating dimensional, natural-looking blonde results.",
  },
  {
    category: "Color Services",
    title: "Creative Color",
    price: "Starting at $175",
    description: "Bold, artistic color work for those who want to make a statement. From vivid fashion colors to unique custom blends that express your personality.",
  },
  {
    category: "Color Services",
    title: "Gray Coverage",
    price: "Starting at $150",
    description: "Seamless, natural-looking gray coverage tailored to your desired look. Whether you want full coverage or a sophisticated blend, we've got you covered.",
  },
  {
    category: "Haircuts",
    title: "Creative Cuts",
    price: "Starting at $185",
    description: "Artistry meets precision. Our stylists specialize in crafting unique shapes and styles that reflect your individuality and elevate your everyday look.",
  },
  {
    category: "Treatments",
    title: "Luxury Hair Treatments",
    price: "Starting at $95",
    description: "Restore and rejuvenate your hair with our curated selection of deep conditioning treatments, masks, and scalp therapies for optimal hair health.",
  },
];

export function ServicesPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const prefersReducedMotion = useReducedMotion();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const isAutoScrolling = useRef(false);

  // Editorial easing - slow start, smooth middle, gentle stop
  const editorialEasing: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

  const scrollToCard = useCallback((targetIndex: number, smooth = true) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('[data-card]');
    const card = cards[targetIndex] as HTMLElement;
    
    if (!card) return;

    // Position card at the left edge with some padding
    const paddingLeft = window.innerWidth >= 1024 ? 48 : 24;
    const scrollLeftPos = card.offsetLeft - paddingLeft;

    isAutoScrolling.current = true;
    
    if (smooth && !prefersReducedMotion) {
      setIsAnimating(true);
      container.scrollTo({
        left: Math.max(0, scrollLeftPos),
        behavior: 'smooth'
      });
      setTimeout(() => {
        setIsAnimating(false);
        isAutoScrolling.current = false;
      }, 800);
    } else {
      container.scrollLeft = Math.max(0, scrollLeftPos);
      isAutoScrolling.current = false;
    }
    
    setCurrentIndex(targetIndex);
  }, [prefersReducedMotion]);

  // Auto-advance animation when in view - every 3 seconds, loops back to start
  useEffect(() => {
    if (!isInView || isPaused || prefersReducedMotion) return;

    const intervalId = setInterval(() => {
      const nextIndex = (currentIndex + 1) % services.length;
      scrollToCard(nextIndex);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isInView, isPaused, prefersReducedMotion, currentIndex, scrollToCard]);

  // Detect user scroll to update current index
  const handleUserScroll = useCallback(() => {
    if (!scrollContainerRef.current || isAutoScrolling.current) return;
    
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll('[data-card]');
    const containerLeft = container.scrollLeft;
    const paddingLeft = window.innerWidth >= 1024 ? 48 : 24;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      const cardStart = cardElement.offsetLeft - paddingLeft;
      const distance = Math.abs(containerLeft - cardStart);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    
    setCurrentIndex(closestIndex);
  }, []);

  const goToPrevious = () => {
    setIsPaused(true);
    // Wrap to last item if at beginning
    const newIndex = currentIndex === 0 ? services.length - 1 : currentIndex - 1;
    scrollToCard(newIndex);
  };

  const goToNext = () => {
    setIsPaused(true);
    // Wrap to first item if at end
    const newIndex = currentIndex === services.length - 1 ? 0 : currentIndex + 1;
    scrollToCard(newIndex);
  };

  // Drag to scroll handlers (mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    // Resume auto-scroll when mouse leaves
    setIsPaused(false);
  };

  const handleMouseEnter = () => {
    // Pause auto-scroll when mouse enters
    setIsPaused(true);
  };

  // Touch/swipe handlers (mobile) - for desktop carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mobile infinite swipe handlers
  const handleMobileSwipeStart = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
    setIsPaused(true);
  };

  const handleMobileSwipeEnd = (e: React.TouchEvent) => {
    const swipeEndX = e.changedTouches[0].clientX;
    const swipeDiff = swipeStartX - swipeEndX;
    const swipeThreshold = 50; // Minimum swipe distance

    if (Math.abs(swipeDiff) > swipeThreshold) {
      if (swipeDiff > 0) {
        // Swiped left - go to next
        const newIndex = currentIndex === services.length - 1 ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
        scrollToMobileCard(newIndex);
      } else {
        // Swiped right - go to previous
        const newIndex = currentIndex === 0 ? services.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        scrollToMobileCard(newIndex);
      }
    }
  };

  const scrollToMobileCard = useCallback((index: number) => {
    if (!mobileScrollRef.current) return;
    const container = mobileScrollRef.current;
    const cards = container.querySelectorAll('[data-mobile-card]');
    const card = cards[index] as HTMLElement;
    
    if (!card) return;
    
    const containerWidth = container.offsetWidth;
    const cardWidth = card.offsetWidth;
    const scrollLeftPos = card.offsetLeft - (containerWidth / 2) + (cardWidth / 2);
    
    container.scrollTo({
      left: Math.max(0, scrollLeftPos),
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }, [prefersReducedMotion]);

  // Card animation variants
  const cardVariants: Variants = {
    hidden: { 
      opacity: 0, 
      x: 100,
    },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        delay: i * 0.15,
        ease: [0.25, 0.1, 0.25, 1] as const,
      }
    })
  };

  return (
    <Section className="pb-8 lg:pb-12 overflow-visible" sectionRef={sectionRef} theme="light">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: editorialEasing }}
        >
          <Eyebrow className="text-muted-foreground">
            Explore Our Services ↘
          </Eyebrow>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: editorialEasing }}
          className="flex items-center gap-6"
        >
          <Link
            to="/services"
            className="text-sm font-sans text-foreground link-underline"
          >
            View all
          </Link>
          
          {/* Navigation Arrows */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={goToPrevious}
              disabled={isAnimating}
              className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground transition-all duration-300 hover:bg-foreground hover:text-background disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
              aria-label="Previous service"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={goToNext}
              disabled={isAnimating}
              className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground transition-all duration-300 hover:bg-foreground hover:text-background disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
              aria-label="Next service"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Desktop: Horizontal Scroll Carousel - Full Width */}
      <div 
        className="hidden md:block relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ 
          marginLeft: 'calc(-50vw + 50%)', 
          marginRight: 'calc(-50vw + 50%)', 
          width: '100vw' 
        }}
      >
        {/* Pause indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isPaused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-4 right-12 z-10 flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-full pointer-events-none"
        >
          <Pause size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">Paused</span>
        </motion.div>
        <div
          ref={scrollContainerRef}
          onScroll={handleUserScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex overflow-x-auto scrollbar-minimal pb-4 scroll-smooth ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none', 
            scrollBehavior: 'smooth',
            paddingLeft: 'max(6rem, calc((100vw - 1280px) / 2 + 12rem))',
            paddingRight: '3rem'
          }}
        >
          {services.map((service, index) => (
            <motion.div
              key={`${service.title}-${index}`}
              data-card
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="group flex-shrink-0 w-[85vw] max-w-[600px] flex"
            >
              {/* Image Area - Before/After Slider for Extensions, placeholder for others */}
              <div className="relative w-1/2 aspect-[3/4] bg-secondary/50 border border-border rounded-xl overflow-hidden mr-2">
                {service.category === "Extensions" ? (
                  <BeforeAfterSlider
                    beforeImage="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=750&fit=crop"
                    afterImage="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=750&fit=crop"
                    beforeLabel="Before"
                    afterLabel="After"
                    className="!absolute inset-0 !aspect-auto w-full h-full"
                    hideDefaultVideoButton={true}
                    hoverMode={true}
                    compactBadges={true}
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl text-muted-foreground/30">✦</span>
                    </div>
                    {/* Subtle hover overlay */}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500" />
                  </>
                )}
              </div>

              {/* Content */}
              <div className="w-1/2 flex flex-col justify-center py-4 pl-2 mr-16">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-display mb-3">
                  {service.category}
                </span>
                
                <h3 className="font-sans text-2xl lg:text-3xl font-medium text-foreground mb-2 leading-tight normal-case tracking-normal">
                  {service.title}
                </h3>
                
                <p className="text-sm text-muted-foreground font-sans mb-4">
                  {service.price.split(/(\$[\d,]+(?:\s*-\s*\$[\d,]+)?)/g).map((part, i) => 
                    part.startsWith('$') ? <span key={i} className="font-medium">{part}</span> : part
                  )}
                </p>

                <p className="text-sm text-muted-foreground font-sans font-light leading-relaxed mb-8">
                  {service.description}
                </p>

                <div className="flex gap-3">
                  <Link
                    to="/booking"
                    className="inline-flex items-center px-7 py-3.5 text-sm font-sans bg-foreground text-background rounded-full hover:bg-foreground/90 hover:scale-105 active:scale-[0.98] transition-all duration-300 whitespace-nowrap"
                  >
                    Book consult
                  </Link>
                  <Link
                    to="/services"
                    className="group/learn inline-flex items-center px-7 py-3.5 text-sm font-sans border border-border text-foreground rounded-full hover:border-foreground hover:scale-105 active:scale-[0.98] transition-all duration-300 whitespace-nowrap overflow-hidden"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="w-0 h-5 opacity-0 group-hover/learn:w-5 group-hover/learn:ml-2 group-hover/learn:opacity-100 transition-all duration-300" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: Horizontal Swipeable Carousel with Infinite Loop */}
      <div className="md:hidden -mx-6">
        <div
          ref={mobileScrollRef}
          onTouchStart={handleMobileSwipeStart}
          onTouchEnd={handleMobileSwipeEnd}
          className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ 
                duration: 0.6, 
                delay: prefersReducedMotion ? 0 : index * 0.1,
                ease: editorialEasing 
              }}
              className="group flex-shrink-0 w-[85vw] snap-center"
              data-mobile-card
            >
              {/* Image - Before/After Slider for Extensions, placeholder for others */}
              <div className="relative aspect-[4/5] bg-secondary/50 border border-border rounded-xl mb-6 overflow-hidden">
                {service.category === "Extensions" ? (
                  <BeforeAfterSlider
                    beforeImage="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=750&fit=crop"
                    afterImage="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=750&fit=crop"
                    beforeLabel="Before"
                    afterLabel="After"
                    className="!absolute inset-0 !aspect-auto w-full h-full"
                    hideDefaultVideoButton={true}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl text-muted-foreground/30">✦</span>
                  </div>
                )}
              </div>

              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-sans block mb-2">
                {service.category}
              </span>
              
              <h3 className="font-sans text-2xl font-medium text-foreground mb-2 normal-case tracking-normal">
                {service.title}
              </h3>
              
              <p className="text-sm text-muted-foreground font-sans mb-4">
                {service.price.split(/(\$[\d,]+(?:\s*-\s*\$[\d,]+)?)/g).map((part, i) => 
                  part.startsWith('$') ? <span key={i} className="font-medium">{part}</span> : part
                )}
              </p>

              <p className="text-sm text-muted-foreground font-sans font-light leading-relaxed mb-6">
                {service.description}
              </p>

              <div className="flex gap-3">
                <Link
                  to="/booking"
                  className="inline-flex items-center px-6 py-3.5 text-sm font-sans bg-foreground text-background rounded-full hover:bg-foreground/90 hover:scale-105 active:scale-[0.98] transition-all duration-300 whitespace-nowrap"
                >
                  Book consult
                </Link>
                <Link
                  to="/services"
                  className="group/learn inline-flex items-center px-6 py-3.5 text-sm font-sans border border-border text-foreground rounded-full hover:border-foreground hover:scale-105 active:scale-[0.98] transition-all duration-300 whitespace-nowrap overflow-hidden"
                >
                  <span>Learn more</span>
                  <ArrowRight className="w-0 h-5 opacity-0 group-hover/learn:w-5 group-hover/learn:ml-2 group-hover/learn:opacity-100 transition-all duration-300" />
                </Link>
              </div>
            </motion.div>
          ))}
          {/* Spacer for last card */}
          <div className="flex-shrink-0 w-4" />
        </div>
      </div>

      {/* Progress Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex justify-center items-center gap-4 mt-8"
      >
        <div className="flex items-center gap-2">
          {services.map((_, index) => (
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
              aria-label={`Go to service ${index + 1}`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {services.length}
        </span>
      </motion.div>
    </Section>
  );
}
