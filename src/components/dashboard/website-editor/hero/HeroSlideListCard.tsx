import { ChevronRight, GripVertical, Trash2, Image as ImageIcon, Video, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeroSlide, HeroConfig } from '@/hooks/useSectionConfig';

interface HeroSlideListCardProps {
  slide: HeroSlide;
  index: number;
  isFirst: boolean;
  /** Section background URL — used as the thumbnail when the slide inherits. */
  sectionBgUrl: string;
  sectionBgPoster: string;
  sectionBgType: HeroConfig['background_type'];
  onClick: () => void;
  onDelete: () => void;
  /** Drag handle props from @dnd-kit useSortable. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

/**
 * Slide row in the Hero hub. Click → opens that slide's focused editor.
 * Designed to mirror Slider Revolution's slide list: thumbnail + headline +
 * one-line summary + drag handle + delete.
 */
export function HeroSlideListCard({
  slide,
  index,
  isFirst,
  sectionBgUrl,
  sectionBgPoster,
  sectionBgType,
  onClick,
  onDelete,
  dragHandleProps,
}: HeroSlideListCardProps) {
  const inherits = slide.background_type === 'inherit';
  const resolvedType = inherits ? sectionBgType : slide.background_type;
  const thumbUrl = inherits
    ? (sectionBgType === 'video' ? sectionBgPoster : sectionBgUrl)
    : (slide.background_type === 'video' ? slide.background_poster_url : slide.background_url);

  const summaryParts: string[] = [];
  summaryParts.push(resolvedType === 'video' ? 'Video' : resolvedType === 'image' ? 'Image' : 'No background');
  if (inherits) summaryParts.push('inherits');
  if (slide.background_focal_x != null) summaryParts.push('Custom focus');
  const ctaCount = (slide.cta_new_client ? 1 : 0) + (slide.show_secondary_button && slide.cta_returning_client ? 1 : 0);
  if (ctaCount) summaryParts.push(`${ctaCount} CTA${ctaCount === 1 ? '' : 's'}`);

  return (
    <div className="group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-sm overflow-hidden flex items-stretch hover:border-foreground/30 hover:shadow-md transition-all">
      {/* Drag handle */}
      <button
        type="button"
        className="px-2 flex items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...dragHandleProps}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Main clickable area */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {/* Thumbnail */}
        <div
          className={cn(
            'w-14 h-10 rounded-md overflow-hidden border border-border/60 flex-shrink-0 relative',
            'bg-gradient-to-br from-muted/60 to-muted/30',
          )}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {resolvedType === 'video' ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </div>
          )}
        </div>

        {/* Title + summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[11px] tracking-wider text-muted-foreground">
              SLIDE {index + 1}
            </span>
            {isFirst && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-sans uppercase tracking-wider text-muted-foreground/80 px-1.5 py-0.5 rounded-full border border-border/60">
                <Star className="h-2.5 w-2.5" /> Default
              </span>
            )}
          </div>
          <div className="text-sm text-foreground truncate font-sans mt-0.5">
            {slide.headline_text || '(untitled slide)'}
          </div>
          <div className="text-[11px] text-muted-foreground truncate font-sans">
            {summaryParts.join(' · ')}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="px-3 flex items-center text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Delete slide"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
