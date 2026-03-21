import { Coffee } from 'lucide-react';
import type { DrinkMenuConfig, Drink } from '@/hooks/useSectionConfig';

interface DrinksPreviewProps {
  config: DrinkMenuConfig;
}

function DrinkCard({ drink }: { drink: Drink }) {
  return (
    <div className="flex-shrink-0 w-32 space-y-2">
      {/* Image */}
      <div className="w-32 h-40 rounded-xl bg-muted overflow-hidden">
        {drink.image_url ? (
          <img 
            src={drink.image_url} 
            alt={drink.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Coffee className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      
      {/* Name */}
      <h4 className="text-xl font-display text-foreground text-center leading-tight">
        {drink.name || 'Drink Name'}
      </h4>
      
      {/* Ingredients */}
      <p className="text-sm text-muted-foreground text-center leading-relaxed">
        {drink.ingredients || 'Ingredients...'}
      </p>
    </div>
  );
}

export function DrinksPreview({ config }: DrinksPreviewProps) {
  // Use actual drinks or show placeholders
  const displayDrinks = config.drinks.length > 0 
    ? config.drinks 
    : [
        { id: '1', name: 'Dirty Peach', ingredients: 'Coke, peach, vanilla cream', image_url: '' },
        { id: '2', name: 'Lavender Latte', ingredients: 'Espresso, lavender, oat milk', image_url: '' },
        { id: '3', name: 'Rose Spritz', ingredients: 'Sparkling water, rose, lemon', image_url: '' },
      ];

  return (
    <section data-theme="light" className="bg-background py-20 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Eyebrow Header */}
        <p className="text-center text-sm uppercase tracking-wider text-muted-foreground mb-12">
          {config.eyebrow}{' '}
          <span className="underline underline-offset-4 decoration-foreground/30">
            {config.eyebrow_highlight}
          </span>{' '}
          {config.eyebrow_suffix}
        </p>

        {/* Drinks Carousel Preview */}
        <div className="relative">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />

          {/* Scrolling Drinks */}
          <div className="flex gap-10 justify-center px-10">
            {displayDrinks.slice(0, 3).map((drink) => (
              <DrinkCard key={drink.id} drink={drink} />
            ))}
          </div>
        </div>

        {/* Settings Indicator */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground/50">
          <span>Speed: {config.carousel_speed} px/s</span>
          <span>•</span>
          <span>Hover slowdown: {config.hover_slowdown_factor}x</span>
        </div>
      </div>
    </section>
  );
}
