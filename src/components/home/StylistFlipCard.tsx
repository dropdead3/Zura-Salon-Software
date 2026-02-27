import { useState } from "react";
import { cn, formatDisplayName } from "@/lib/utils";
import { ArrowRight, Sparkles, Info, X, Instagram, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Stylist, Location } from "@/data/stylists";
import { getLocationName } from "@/data/stylists";

// Helper to convert text to title case
const toTitleCase = (str: string) => {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

interface StylistFlipCardProps {
  stylist: Stylist;
  index: number;
  selectedLocation: Location | "all";
  /** When true, disables navigation links and click-through behaviors */
  isPreview?: boolean;
  /** Override focal point X for the card image (0-100) */
  photoFocalX?: number;
  /** Override focal point Y for the card image (0-100) */
  photoFocalY?: number;
  /** Stylist levels from database for tooltip display */
  levels?: Array<{ id: string; client_label: string; description: string | null; label: string }>;
}

export function StylistFlipCard({ stylist, index, selectedLocation, isPreview, photoFocalX, photoFocalY, levels }: StylistFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className="group relative aspect-[3/4] perspective-1000"
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-700 transform-style-3d cursor-pointer",
          isFlipped && "rotate-y-180"
        )}
        onClick={handleFlip}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="relative w-full h-full bg-muted overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-500">
            <ImageWithSkeleton
              src={stylist.imageUrl}
              alt={`${stylist.name} - ${stylist.level}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              wrapperClassName="absolute inset-0"
              style={{
                objectPosition: `${photoFocalX ?? stylist.card_focal_x ?? 50}% ${photoFocalY ?? stylist.card_focal_y ?? 50}%`,
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
            
            <div className="absolute top-5 left-5 right-5 flex flex-wrap gap-2 max-w-[calc(100%-2.5rem)]">
              {/* Only display highlighted_services — no fallback to specialties */}
              {(() => {
                const highlightedServices = stylist.highlighted_services || [];
                if (highlightedServices.length === 0) return null;
                
                return highlightedServices.slice(0, 3).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm text-xs font-medium tracking-wide rounded-full bg-background/70 text-foreground border border-border/40"
                  >
                    {toTitleCase(item)}
                  </span>
                ));
              })()}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-9 pt-6 text-white transform translate-y-3 transition-transform duration-500 ease-out group-hover:translate-y-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs tracking-[0.2em] text-white/70 uppercase">{stylist.level}</p>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="text-white/50 hover:text-white/90 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-4 bg-background text-foreground border border-border">
                      <p className="font-medium mb-2">Stylist Level System</p>
                      <ul className="text-xs space-y-1.5 text-foreground/80">
                        {levels?.map((level) => (
                          <li key={level.id}><span className="font-medium text-foreground">{level.client_label}:</span> {level.description || level.label}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">Higher levels reflect experience, training, and demand.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <h3 className="text-xl font-display mb-1">{formatDisplayName(stylist.name, stylist.displayName)}</h3>
              
              {/* Social Link - Show preferred handle only, maintain consistent height */}
              <div className="min-h-[24px] mb-3">
                {(() => {
                  const preferred = stylist.preferred_social_handle || 'instagram';
                  const showInstagram = preferred === 'instagram' && stylist.instagram;
                  const showTiktok = preferred === 'tiktok' && stylist.tiktok;
                  
                  // Fallback: if preferred doesn't exist, show the other
                  const handle = showInstagram ? stylist.instagram : 
                                 showTiktok ? stylist.tiktok :
                                 stylist.instagram || stylist.tiktok;
                  const isInstagram = showInstagram || (!showTiktok && stylist.instagram);
                  
                  if (!handle) return null;
                  
                  const SocialTag = isPreview ? 'span' : 'a';
                  const socialProps = isPreview ? {} : {
                    href: isInstagram 
                      ? `https://instagram.com/${handle.replace('@', '')}` 
                      : `https://tiktok.com/@${handle.replace('@', '')}`,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  };
                  
                  return (
                    <SocialTag 
                      {...socialProps}
                      className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors duration-200"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      {isInstagram ? (
                        <Instagram className="w-4 h-4" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                      )}
                      <span>{handle}</span>
                    </SocialTag>
                  );
                })()}
              </div>
              
              <div className="flex items-center justify-start">
                {stylist.isBooking === false ? (
                  <div className="shrink-0 inline-flex items-center gap-2 bg-white/20 text-white/70 px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap cursor-not-allowed border border-white/40">
                    <X className="w-4 h-4 shrink-0" />
                    <span>Not Booking</span>
                  </div>
                ) : isPreview ? (
                  <div className="shrink-0 inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap group/btn">
                    <span>Book Consult</span>
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </div>
                ) : (
                  <Link
                    to="/booking"
                    className="shrink-0 inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap hover:bg-white/90 hover:shadow-lg transition-all duration-300 group/btn active:scale-[0.98]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Book Consult</span>
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                )}
              </div>

              {/* Tap hint - visible on hover */}
              <div className="mt-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 delay-150 translate-y-1 group-hover:translate-y-0">
                <p className="text-xs text-white/80 tracking-wide font-aeonik animate-pulse">
                  Click to Flip
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180"
          style={{ 
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <div className="relative w-full h-full bg-foreground overflow-hidden rounded-2xl shadow-md flex flex-col items-center justify-center p-6 text-center">
            {/* Name */}
            <h3 className="text-2xl font-display text-background mb-1">{formatDisplayName(stylist.name, stylist.displayName)}</h3>
            <p className="text-xs tracking-[0.2em] text-background/60 mb-5 uppercase">{stylist.level}</p>

            {/* Bio */}
            <p className="text-sm text-background/80 leading-relaxed max-w-[90%] mb-6">
              {stylist.bio || "No bio available"}
            </p>

            {/* Social Media Link - Show preferred handle only */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {(() => {
                const preferred = stylist.preferred_social_handle || 'instagram';
                const showInstagram = preferred === 'instagram' && stylist.instagram;
                const showTiktok = preferred === 'tiktok' && stylist.tiktok;
                
                const handle = showInstagram ? stylist.instagram : 
                               showTiktok ? stylist.tiktok :
                               stylist.instagram || stylist.tiktok;
                const isInstagram = showInstagram || (!showTiktok && stylist.instagram);
                
                if (!handle) return null;
                
                return isInstagram ? (
                  <a 
                    href={`https://instagram.com/${handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="w-4 h-4" />
                    <span>{handle}</span>
                  </a>
                ) : (
                  <a 
                    href={`https://tiktok.com/@${handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                    <span>{handle}</span>
                  </a>
                );
              })()}
            </div>

            {/* Location */}
            <div className="inline-flex items-center gap-1.5 text-xs text-background/50 mb-6">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {stylist.locations.length > 1 
                  ? stylist.locations.map(loc => getLocationName(loc)).join(" & ")
                  : getLocationName(stylist.locations[0])
                }
              </span>
            </div>

            {/* Book button */}
            <div>
              {stylist.isBooking !== false && (
                isPreview ? (
                  <div className="inline-flex items-center gap-2 bg-background text-foreground px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap group/btn">
                    <span>Book Consult</span>
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </div>
                ) : (
                  <Link
                    to="/booking"
                    className="inline-flex items-center gap-2 bg-background text-foreground px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap hover:bg-background/90 hover:shadow-lg transition-all duration-300 group/btn active:scale-[0.98]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Book Consult</span>
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                )
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
