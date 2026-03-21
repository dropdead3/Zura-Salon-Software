import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, useInView } from "framer-motion";
import { Play, X } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  videoUrl?: string;
  hideDefaultVideoButton?: boolean;
  hoverMode?: boolean; // New prop: slider follows mouse on hover
  compactBadges?: boolean; // Reduced padding for badges
  badgePositionClass?: string; // Custom badge positioning class (e.g., "top-[60px] left-[60px]")
}

export interface BeforeAfterSliderHandle {
  playVideo: () => void;
  closeVideo: () => void;
  isVideoMode: boolean;
}

export const BeforeAfterSlider = forwardRef<BeforeAfterSliderHandle, BeforeAfterSliderProps>(({ 
  beforeImage,
  afterImage,
  beforeLabel = "Before", 
  afterLabel = "After",
  className = "",
  videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4",
  hideDefaultVideoButton = false,
  hoverMode = false,
  compactBadges = false,
  badgePositionClass
}, ref) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Only trigger animation when in view
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });


  // Auto-animate slider once to demonstrate functionality, then settle to middle
  useEffect(() => {
    if (hasInteracted || !isInView || isVideoMode) return;

    const keyframes = [
      { position: 50, duration: 0 },      // Start at middle
      { position: 25, duration: 800 },    // Slide left
      { position: 75, duration: 1200 },   // Slide right
      { position: 50, duration: 1000 },   // Settle back to middle
    ];

    let currentIndex = 0;
    let startTime: number | null = null;
    let startPosition = 50;

    const animate = (timestamp: number) => {
      if (hasInteracted) return;
      
      if (currentIndex >= keyframes.length - 1) {
        setSliderPosition(50);
        setIsAnimating(false);
        return;
      }

      if (!startTime) {
        startTime = timestamp;
        startPosition = keyframes[currentIndex].position;
      }

      const targetFrame = keyframes[currentIndex + 1];
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / targetFrame.duration, 1);
      
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newPosition = startPosition + (targetFrame.position - startPosition) * eased;
      
      setSliderPosition(newPosition);

      if (progress >= 1) {
        currentIndex++;
        startTime = null;
        startPosition = targetFrame.position;
      }

      if (currentIndex < keyframes.length - 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    // Start animation after a short delay
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 800);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hasInteracted, isInView, isVideoMode]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => {
    setIsDragging(true);
    setHasInteracted(true);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const animateToCenter = useCallback(() => {
    const startPosition = sliderPosition;
    const targetPosition = 50;
    const duration = 600; // ms
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newPosition = startPosition + (targetPosition - startPosition) * eased;
      
      setSliderPosition(newPosition);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [sliderPosition]);

  // Handle global mouse events for dragging outside container
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      animateToCenter();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMove, animateToCenter]);

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!hoverMode) {
      animateToCenter();
    }
  };

  // Hover mode handlers
  const handleMouseEnter = () => {
    if (hoverMode && !isVideoMode) {
      setIsHovering(true);
      setHasInteracted(true);
      setIsAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const handleMouseLeave = () => {
    if (hoverMode && !isVideoMode) {
      setIsHovering(false);
      animateToCenter();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoverMode && isHovering && !isVideoMode) {
      handleMove(e.clientX);
    }
  };

  const handlePlayVideo = () => {
    setIsVideoMode(true);
    setHasInteracted(true);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    // Auto-play video when switching to video mode
    setTimeout(() => {
      videoRef.current?.play();
    }, 100);
  };

  const handleCloseVideo = () => {
    setIsVideoMode(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Expose imperative methods to parent
  useImperativeHandle(ref, () => ({
    playVideo: handlePlayVideo,
    closeVideo: handleCloseVideo,
    isVideoMode
  }), [isVideoMode]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[3/4] overflow-hidden select-none ${isVideoMode ? '' : 'cursor-ew-resize'} ${className}`}
      onTouchMove={!isVideoMode ? handleTouchMove : undefined}
      onTouchEnd={!isVideoMode ? handleTouchEnd : undefined}
      onMouseEnter={hoverMode ? handleMouseEnter : undefined}
      onMouseLeave={hoverMode ? handleMouseLeave : undefined}
      onMouseMove={hoverMode ? handleMouseMove : undefined}
    >
      {/* Video Mode */}
      {isVideoMode ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black z-30"
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
          />
          {/* Close button */}
          <button
            onClick={handleCloseVideo}
            className="absolute top-4 right-4 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center z-40 hover:bg-background transition-colors duration-200"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </motion.div>
      ) : (
        <>
          {/* After Image (Background) */}
          <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
            <img 
              src={afterImage} 
              alt="After transformation" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Before Image (Clipped) */}
          <div 
            className="absolute inset-0 rounded-[inherit] overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img 
              src={beforeImage} 
              alt="Before transformation" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Slider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-10 shadow-sm"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            {/* Slider Handle */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white flex items-center justify-center cursor-ew-resize shadow-lg border border-black/10"
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <div className="flex items-center gap-1.5">
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" className="text-foreground">
                  <path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" className="text-foreground">
                  <path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Play Video Button - only show if not hidden */}
          {!hideDefaultVideoButton && (
            <motion.button
              onClick={handlePlayVideo}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-background/90 backdrop-blur-sm rounded-full text-foreground hover:bg-background transition-colors duration-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-xs font-sans font-medium">Watch video</span>
            </motion.button>
          )}

          {/* Labels - positioned at top corners */}
          <div className={`absolute z-20 ${badgePositionClass ? badgePositionClass : (compactBadges ? 'top-4 left-4' : 'top-8 left-8')}`}>
            <span 
              className="text-[10px] uppercase tracking-[0.15em] font-display px-4 py-2 bg-background/90 rounded-full text-foreground"
              style={{ opacity: sliderPosition > 20 ? 1 : 0, transition: 'opacity 0.2s' }}
            >
              {beforeLabel}
            </span>
          </div>
          <div className={`absolute z-20 ${badgePositionClass ? badgePositionClass.replace('left-', 'right-') : (compactBadges ? 'top-4 right-4' : 'top-8 right-8')}`}>
            <span 
              className="text-[10px] uppercase tracking-[0.15em] font-display px-4 py-2 bg-background/90 rounded-full text-foreground"
              style={{ opacity: sliderPosition < 80 ? 1 : 0, transition: 'opacity 0.2s' }}
            >
              {afterLabel}
            </span>
          </div>

          {/* Hint - positioned below the labels */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <motion.span 
              className="text-[10px] uppercase tracking-[0.15em] font-sans px-2 py-1 bg-black/50 rounded-full text-white/90 backdrop-blur-sm"
              initial={{ opacity: 1 }}
              animate={{ opacity: hasInteracted ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {hoverMode ? "Hover to Compare" : "Drag to Compare"}
            </motion.span>
          </div>
        </>
      )}
    </div>
  );
});
