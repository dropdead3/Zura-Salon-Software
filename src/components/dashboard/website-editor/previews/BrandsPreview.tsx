import type { BrandsConfig, Brand } from '@/hooks/useSectionConfig';

interface BrandsPreviewProps {
  config: BrandsConfig;
}

function BrandItem({ brand }: { brand: Brand }) {
  return (
    <div className="flex items-center gap-4 px-6">
      {brand.logo_url ? (
        <img 
          src={brand.logo_url} 
          alt={brand.name}
          className="h-8 w-auto object-contain opacity-70"
        />
      ) : (
        <span className="text-sm font-medium tracking-wider text-muted-foreground font-display uppercase whitespace-nowrap">
          {brand.display_text || brand.name}
        </span>
      )}
    </div>
  );
}

export function BrandsPreview({ config }: BrandsPreviewProps) {
  // Use actual brands or show placeholder
  const displayBrands = config.brands.length > 0 
    ? config.brands 
    : [
        { id: '1', name: 'Brand One', display_text: 'BRAND ONE' },
        { id: '2', name: 'Brand Two', display_text: 'BRAND TWO' },
        { id: '3', name: 'Brand Three', display_text: 'BRAND THREE' },
      ];

  return (
    <section data-theme="light" className="bg-background py-16 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Intro Text */}
        {config.show_intro_text && config.intro_text && (
          <p className="text-center text-sm text-muted-foreground mb-8">
            {config.intro_text}
          </p>
        )}

        {/* Marquee Container */}
        <div className="relative">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />

          {/* Scrolling Brands */}
          <div 
            className="flex items-center animate-marquee"
            style={{ 
              animationDuration: `${config.marquee_speed}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite'
            }}
          >
            {/* First set */}
            {displayBrands.map((brand) => (
              <BrandItem key={brand.id} brand={brand} />
            ))}
            {/* Duplicate for seamless loop */}
            {displayBrands.map((brand) => (
              <BrandItem key={`dup-${brand.id}`} brand={brand} />
            ))}
          </div>
        </div>

        {/* Speed indicator */}
        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Marquee speed: {config.marquee_speed}s per cycle
        </p>
      </div>

      {/* Add marquee animation styles */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </section>
  );
}
