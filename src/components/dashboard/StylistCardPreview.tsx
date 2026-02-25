import { useState } from "react";
import { Sparkles, Instagram, MapPin, X, ArrowRight, Info } from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper to convert text to title case
const toTitleCase = (str: string) => {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

interface StylistCardPreviewProps {
  name: string;
  displayName?: string;
  level: string;
  photoUrl?: string;
  photoFocalX?: number;
  photoFocalY?: number;
  instagram?: string;
  tiktok?: string;
  preferredSocialHandle?: 'instagram' | 'tiktok';
  highlightedServices: string[];
  specialties: string[];
  bio?: string;
  isBooking?: boolean;
  locations?: { id: string; name: string }[];
}

export function StylistCardPreview({
  name,
  displayName,
  level,
  photoUrl,
  photoFocalX = 50,
  photoFocalY = 50,
  instagram,
  tiktok,
  preferredSocialHandle = 'instagram',
  highlightedServices,
  specialties,
  bio,
  isBooking = true,
  locations = [],
}: StylistCardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Get display items - highlighted services or fallback to specialties
  const displayItems = (highlightedServices && highlightedServices.length > 0)
    ? highlightedServices.slice(0, 3)
    : [...specialties].sort((a, b) => {
        if (a.toUpperCase() === "EXTENSIONS") return -1;
        if (b.toUpperCase() === "EXTENSIONS") return 1;
        return 0;
      }).slice(0, 3);

  const showName = formatDisplayName(name || '', displayName) || 'Your Name';
  const hasBio = !!bio;

  const handleFlip = () => {
    if (hasBio) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">Live Preview</span>
        <span className="text-xs">(tap card to flip)</span>
      </div>
      
      {/* Card with flip animation - exactly matching frontend */}
      <div
        className="group relative aspect-[3/4] w-64 perspective-1000"
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
              {/* Photo or placeholder */}
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={showName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  style={{ objectPosition: `${photoFocalX}% ${photoFocalY}%` }}
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
                  <span className="text-6xl font-display text-muted-foreground/30">
                    {showName.charAt(0)}
                  </span>
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
              
              {/* Specialty badges */}
              <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                {displayItems.length > 0 ? displayItems.map((item) => {
                  const isExtensions = item.toUpperCase() === "EXTENSIONS";
                  return (
                    <span
                      key={item}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm text-xs font-medium tracking-wide rounded-full",
                        isExtensions
                          ? "bg-oat/90 text-oat-foreground border border-oat-foreground/30 badge-shine"
                          : "bg-background/70 text-foreground border border-border/30"
                      )}
                    >
                      {isExtensions && <Sparkles className="w-3 h-3" />}
                      {toTitleCase(item)}
                    </span>
                  );
                }) : (
                  <span className="inline-flex items-center px-3 py-1.5 bg-background/70 text-foreground/50 border border-border/30 text-xs rounded-full">
                    No specialties
                  </span>
                )}
              </div>
              
              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs tracking-[0.2em] text-white/70 uppercase">
                    {level || "LEVEL 1 STYLIST"}
                  </p>
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
                          <li><span className="font-medium text-foreground">Level 1:</span> Rising talent building their craft</li>
                          <li><span className="font-medium text-foreground">Level 2:</span> Skilled stylist with proven expertise</li>
                          <li><span className="font-medium text-foreground">Level 3:</span> Master artist & senior specialist</li>
                          <li><span className="font-medium text-foreground">Level 4:</span> Elite specialist & industry leader</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">Higher levels reflect experience, training, and demand.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <h3 className="text-xl font-display mb-1">{showName}</h3>
                
                {/* Social Link - Show preferred handle only, maintain consistent height */}
                <div className="min-h-[24px] mb-4">
                  {(() => {
                    const showInstagram = preferredSocialHandle === 'instagram' && instagram;
                    const showTiktok = preferredSocialHandle === 'tiktok' && tiktok;
                    
                    const handle = showInstagram ? instagram : 
                                   showTiktok ? tiktok :
                                   instagram || tiktok;
                    const isInstagram = showInstagram || (!showTiktok && instagram);
                    
                    if (!handle) return null;
                    
                    return isInstagram ? (
                      <span className="flex items-center gap-1.5 text-sm text-white/70">
                        <Instagram className="w-4 h-4" />
                        <span>{handle}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-white/70">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                        <span>{handle}</span>
                      </span>
                    );
                  })()}
                </div>
                
                {/* Book button */}
                <div className="flex items-center justify-start">
                  {isBooking === false ? (
                    <div className="shrink-0 inline-flex items-center gap-2 bg-white/20 text-white/70 px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap cursor-not-allowed border border-white/40">
                      <X className="w-4 h-4 shrink-0" />
                      <span>Not Booking</span>
                    </div>
                  ) : (
                    <div className="shrink-0 inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap group/btn">
                      <span>Book Consult</span>
                      <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </div>
                  )}
                </div>

                {/* Tap hint - slides up from bottom on hover */}
                {hasBio && (
                  <div className="mt-4 flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out delay-150">
                    <p className="text-xs text-white/80 tracking-wide font-aeonik animate-pulse">
                      Tap to learn more
                    </p>
                  </div>
                )}
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
              <h3 className="text-2xl font-display text-background mb-1">{showName}</h3>
              <p className="text-xs tracking-[0.2em] text-background/60 mb-5 uppercase">
                {level || "LEVEL 1 STYLIST"}
              </p>

              {/* Bio */}
              <p className="text-sm text-background/80 leading-relaxed max-w-[90%] mb-6">
                {bio || "No bio available"}
              </p>

              {/* Social Media Link - Show preferred handle only */}
              <div className="flex items-center justify-center gap-4 mb-3">
                {(() => {
                  const showInstagram = preferredSocialHandle === 'instagram' && instagram;
                  const showTiktok = preferredSocialHandle === 'tiktok' && tiktok;
                  
                  const handle = showInstagram ? instagram : 
                                 showTiktok ? tiktok :
                                 instagram || tiktok;
                  const isInstagram = showInstagram || (!showTiktok && instagram);
                  
                  if (!handle) return null;
                  
                  return isInstagram ? (
                    <span className="inline-flex items-center gap-2 text-sm text-background/70">
                      <Instagram className="w-4 h-4" />
                      <span>{handle}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-background/70">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                      <span>{handle}</span>
                    </span>
                  );
                })()}
              </div>

              {/* Location */}
              {locations.length > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs text-background/50 mb-6">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {locations.length > 1 
                      ? locations.map(l => l.name).join(" & ")
                      : locations[0]?.name
                    }
                  </span>
                </div>
              )}

              {/* Book button */}
              <div>
                {isBooking !== false && (
                  <div className="inline-flex items-center gap-2 bg-background text-foreground px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap group/btn">
                    <span>Book Consult</span>
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {hasBio ? "Tap card to see the flip side" : "Add a bio to enable the flip animation"}
      </p>
    </div>
  );
}
