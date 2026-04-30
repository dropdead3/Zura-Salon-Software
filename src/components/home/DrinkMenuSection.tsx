import { motion, useInView, useScroll, useVelocity, useSpring, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";
import { useDrinkMenuConfig, type Drink } from "@/hooks/useSectionConfig";
import { useLiveOverride } from "@/hooks/usePreviewBridge";
import { useIsEditorPreview } from "@/hooks/useIsEditorPreview";
import { InlineEditableText } from "./InlineEditableText";

interface DrinkCardProps {
  drink: Drink;
  index?: number;
  isInView?: boolean;
  animated?: boolean;
}

const DrinkCard = ({ drink, index = 0, isInView = true, animated = true }: DrinkCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const ingredientsList = drink.ingredients.split(", ");
  const maxVisible = 3;
  const needsTruncation = ingredientsList.length > maxVisible;
  const displayedIngredients = isExpanded || !needsTruncation 
    ? ingredientsList 
    : ingredientsList.slice(0, maxVisible);

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated ? {
    initial: { opacity: 0, y: 30 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.6, delay: index * 0.1 },
  } : {};

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Wrapper
      {...wrapperProps}
      className="relative flex flex-col items-center gap-4 px-10 md:px-14 lg:px-18 cursor-pointer"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Drink image container with tooltip */}
      <div className="relative">
        <div className={`w-32 h-40 md:w-28 md:h-36 lg:w-32 lg:h-40 transition-transform duration-300 ${isCardHovered ? 'scale-110' : ''}`}>
          <img 
            src={drink.image_url} 
            alt={drink.name}
            className="w-full h-full object-contain mix-blend-darken"
          />
        </div>
        
        {/* Hover tooltip - positioned to the right of the icon */}
        <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-6 md:ml-8 transition-all duration-300 ease-out z-10 ${isCardHovered ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
          <motion.div 
            layout
            className="bg-foreground text-background px-5 py-4 text-center shadow-lg w-[180px] min-h-[120px] flex flex-col justify-center rounded-2xl"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-xs uppercase tracking-[0.2em] mb-3 text-background/60 font-display">Ingredients</p>
            <motion.ul 
              layout
              className="text-sm leading-relaxed text-left space-y-1"
              style={{ fontFamily: "'Aeonik Pro', sans-serif", fontWeight: 500 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {displayedIngredients.map((ingredient, i) => (
                <li key={i} className="flex items-center gap-2 text-background">
                  <span className="text-background/50">•</span>
                  <span className="capitalize">{ingredient.trim()}</span>
                </li>
              ))}
            </motion.ul>
            {needsTruncation && (
              <motion.button 
                layout
                onClick={handleToggle}
                className="mt-2 text-[10px] uppercase tracking-wide text-background/70 hover:text-background transition-colors font-display underline underline-offset-2"
              >
                {isExpanded ? "See less" : "See more"}
              </motion.button>
            )}
          </motion.div>
          {/* Arrow pointing left */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-foreground" />
        </div>
      </div>
      
      <h3 className="font-display text-xl md:text-2xl lg:text-3xl text-foreground whitespace-nowrap">
        {drink.name}
      </h3>
    </Wrapper>
  );
};

export function DrinkMenuSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { data: dbConfig } = useDrinkMenuConfig();
  const config = useLiveOverride('section_drink_menu', dbConfig) ?? dbConfig;
  
  // Use configured drinks or fallback to defaults
  const drinks = config.drinks.length > 0 ? config.drinks : defaultDrinks;
  
  // Track scroll velocity
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    stiffness: 400,
    damping: 50
  });
  
  // Base position for infinite scroll
  const baseX = useRef(0);
  const [xPos, setXPos] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Animate continuously with velocity-based speed
  useAnimationFrame((_, delta) => {
    // Slow down significantly when hovered
    const hoverMultiplier = isHovered ? config.hover_slowdown_factor : 1;
    
    // Base speed (pixels per second) - use config value
    const baseSpeed = config.carousel_speed * hoverMultiplier;
    
    // Get current velocity and add to base speed
    const velocity = smoothVelocity.get();
    const velocityFactor = isHovered ? 0 : velocity * 0.05; // No velocity boost on hover
    
    // Calculate movement for this frame
    const moveBy = (baseSpeed + Math.abs(velocityFactor)) * (delta / 1000);
    
    // Update position (negative = moving left)
    baseX.current -= moveBy;
    
    // Reset position for infinite loop (based on single set width ~1200px)
    const singleSetWidth = 1400;
    if (baseX.current <= -singleSetWidth) {
      baseX.current += singleSetWidth;
    }
    
    setXPos(baseX.current);
  });

  return (
    <section 
      ref={sectionRef} 
      data-theme="light" 
      className="pt-16 lg:pt-24 pb-32 lg:pb-40 overflow-hidden relative"
      style={{
        background: 'linear-gradient(to bottom, hsl(0 0% 100%) 0%, hsl(0 0% 100%) 75%, hsl(40 20% 92%) 100%)'
      }}
    >
      {/* Header - use config values */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-6 text-center mb-12"
      >
        <p className="text-sm md:text-base uppercase tracking-[0.2em] text-muted-foreground font-display">
          {config.eyebrow}{" "}
          <span className="underline underline-offset-4">{config.eyebrow_highlight}</span>{" "}
          {config.eyebrow_suffix}
        </p>
      </motion.div>

      {/* Infinite scroll drinks with velocity-based speed */}
      <motion.div 
        className="flex"
        style={{ 
          x: xPos,
          width: 'fit-content'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* First set */}
        {drinks.map((drink, index) => (
          <DrinkCard 
            key={drink.id} 
            drink={drink} 
            index={index} 
            isInView={isInView} 
            animated={true}
          />
        ))}
        
        {/* Duplicate set for seamless loop */}
        {drinks.map((drink) => (
          <DrinkCard 
            key={`dup-${drink.id}`} 
            drink={drink} 
            animated={false}
          />
        ))}
      </motion.div>

      {/* Bottom fade overlay for seamless exit */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 lg:h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, hsl(40 20% 92%) 100%)'
        }}
      />
    </section>
  );
}
