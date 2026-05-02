import { useState } from 'react';
import { ChevronRight, GripVertical, Trash2, Image as ImageIcon, Video, Star, Eye, EyeOff, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeroSlide, HeroConfig } from '@/hooks/useSectionConfig';
import { HeroBackgroundTile } from './HeroBackgroundTile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HeroSlideListCardProps {
  slide: HeroSlide;
  index: number;
  isFirst: boolean;
  /** Section background URL — used as the thumbnail when the slide inherits. */
  sectionBgUrl: string;
  sectionBgPoster: string;
  sectionBgType: HeroConfig['background_type'];
  /** Whether the rotator runs in multi-slide or background-only mode. */
  rotatorMode?: 'multi_slide' | 'background_only';
  /**
   * Visual variant.
   * - `row` (default): full-width horizontal row — used in Multi-Slide mode for
   *   every slide, and in Background-Only mode for **slide 1 only** (the master
   *   slide that owns headline/CTAs).
   * - `tile`: square gallery thumbnail with overlay actions — used in
   *   Background-Only mode for slides 2…N. Communicates "this is just a
   *   background, not a full slide."
   */
  variant?: 'row' | 'tile';
  onClick: () => void;
  onDelete: () => void;
  /** Toggle whether this slide is included in the public rotator. */
  onToggleActive: (next: boolean) => void;
  /** Drag handle props from @dnd-kit useSortable. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

/**
 * Slide row in the Hero hub. Click → opens that slide's focused editor.
 * Mirrors Slider Revolution's slide list: thumbnail + headline + summary +
 * drag handle + active toggle + delete (with confirmation).
 *
 * In Background-Only mode, slide 1 reads as the **Master Slide** (Crown badge,
 * "headline & buttons shared" helper) and slides 2…N render as gallery tiles
 * via `variant="tile"` so the UI mirrors the data model: one slide, many
 * rotating backgrounds.
 *
 * Active vs delete:
 * - Active toggle (Eye/EyeOff) hides the slide from the live rotator without
 *   destroying the config — useful for seasonal/draft slides.
 * - Delete is destructive and confirmed via AlertDialog. Last-slide deletion
 *   is allowed; the rotator handles an empty list gracefully.
 */
export function HeroSlideListCard({
  slide,
  index,
  isFirst,
  sectionBgUrl,
  sectionBgPoster,
  sectionBgType,
  rotatorMode = 'multi_slide',
  variant = 'row',
  onClick,
  onDelete,
  onToggleActive,
  dragHandleProps,
}: HeroSlideListCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isActive = slide.active !== false;
  const backgroundOnly = rotatorMode === 'background_only';
  const isMaster = backgroundOnly && isFirst;
  const inherits = slide.background_type === 'inherit';
  const resolvedType = inherits ? sectionBgType : slide.background_type;
  const thumbUrl = inherits
    ? (sectionBgType === 'video' ? sectionBgPoster : sectionBgUrl)
    : (slide.background_type === 'video' ? slide.background_poster_url : slide.background_url);

  /* ─── Tile variant: delegates to dedicated HeroBackgroundTile ───
   * The tile capability lives in its own component so each surface can
   * evolve independently (next up: inline-upload affordance on the tile).
   * Kept here as a thin pass-through so existing call-sites that pass
   * `variant="tile"` keep working without churn. */
  if (variant === 'tile') {
    return (
      <HeroBackgroundTile
        slide={slide}
        index={index}
        sectionBgUrl={sectionBgUrl}
        sectionBgPoster={sectionBgPoster}
        sectionBgType={sectionBgType}
        onClick={onClick}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
        dragHandleProps={dragHandleProps}
      />
    );
  }

  /* ─── Row variant (default) ─── */
  const summaryParts: string[] = [];
  summaryParts.push(resolvedType === 'video' ? 'Video' : resolvedType === 'image' ? 'Image' : 'No background');
  if (inherits) summaryParts.push('inherits');
  if (slide.background_focal_x != null) summaryParts.push('Custom focus');
  const ctaCount = (slide.cta_new_client ? 1 : 0) + (slide.show_secondary_button && slide.cta_returning_client ? 1 : 0);
  if (ctaCount && !isMaster) summaryParts.push(`${ctaCount} CTA${ctaCount === 1 ? '' : 's'}`);
  if (isMaster) summaryParts.push(`${ctaCount} shared CTA${ctaCount === 1 ? '' : 's'}`);

  return (
    <div
      className={cn(
        'group relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-sm overflow-hidden flex items-stretch hover:border-foreground/30 hover:shadow-md transition-all',
        !isActive && 'opacity-60',
        isMaster && 'border-foreground/20 shadow-md',
      )}
    >
      {/* Drag handle — subtle until hover. Suppressed for the master slide
          since its position is fixed in background-only mode. */}
      {!isMaster && (
        <button
          type="button"
          className="px-1.5 flex items-center text-muted-foreground/40 group-hover:text-muted-foreground hover:!text-foreground cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
          aria-label="Drag to reorder"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {isMaster && <div className="w-3 flex-shrink-0" aria-hidden />}

      {/* Main clickable area (thumbnail + title) */}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-3 py-2.5 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {/* Thumbnail */}
        <div
          className={cn(
            'w-12 h-12 rounded-lg overflow-hidden border border-border/60 flex-shrink-0 relative',
            'bg-gradient-to-br from-muted/60 to-muted/30',
          )}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className={cn(
                'absolute inset-0 w-full h-full object-cover',
                !isActive && 'grayscale',
              )}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {resolvedType === 'video' ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </div>
          )}
        </div>

        {/* Title + summary — single tidy column */}
        <div className="min-w-0 flex-1">
          {/* Metadata row: SLIDE N · badges */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-display text-[10px] tracking-wider text-muted-foreground flex-shrink-0">
              {isMaster ? 'MASTER SLIDE' : `SLIDE ${index + 1}`}
            </span>
            {isMaster ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-sans uppercase tracking-wider text-foreground/80 px-1.5 py-0.5 rounded-full border border-foreground/30 bg-foreground/5 flex-shrink-0">
                <Crown className="h-2.5 w-2.5" /> Shared
              </span>
            ) : isFirst ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-sans uppercase tracking-wider text-muted-foreground/80 px-1.5 py-0.5 rounded-full border border-border/60 flex-shrink-0">
                <Star className="h-2.5 w-2.5" /> Default
              </span>
            ) : null}
            {!isActive && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-sans uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/5 flex-shrink-0">
                <EyeOff className="h-2.5 w-2.5" /> Inactive
              </span>
            )}
          </div>
          {/* Headline */}
          {backgroundOnly && !isMaster ? (
            <div className="text-sm truncate font-sans mt-0.5 text-muted-foreground italic">
              Background only
            </div>
          ) : (
            <div className={cn(
              'text-sm truncate font-sans mt-0.5 leading-tight',
              slide.headline_text ? 'text-foreground' : 'text-muted-foreground italic',
            )}>
              {slide.headline_text || 'No headline yet'}
            </div>
          )}
          {/* Summary */}
          <div className="text-[10px] text-muted-foreground/80 truncate font-sans mt-0.5">
            {isMaster
              ? 'Headline & buttons shared across all backgrounds'
              : summaryParts.join(' · ')}
          </div>
        </div>
      </button>

      {/* Action cluster — compact, icon-only, hover-revealed (chevron stays visible).
          Master slide can't be deleted or deactivated (it owns shared content). */}
      <div className="flex items-center pr-2 gap-0.5 flex-shrink-0">
        {!isMaster && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleActive(!isActive); }}
              className={cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-md transition-all',
                'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                isActive
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  : '!opacity-100 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10',
              )}
              aria-label={isActive ? 'Deactivate slide' : 'Activate slide'}
              title={isActive ? 'Deactivate — hide from live site' : 'Activate — show on live site'}
            >
              {isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
              aria-label="Delete slide"
              title="Delete slide permanently"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClick}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open slide editor"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slide {index + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{slide.headline_text || 'this slide'}" and all of its
              copy, media references, and overrides. To temporarily hide it instead, use the eye icon to deactivate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); onDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Slide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
