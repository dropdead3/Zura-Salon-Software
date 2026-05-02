import { useState } from 'react';
import { GripVertical, Trash2, Image as ImageIcon, Video, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeroSlide, HeroConfig } from '@/hooks/useSectionConfig';
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

export interface HeroBackgroundTileProps {
  slide: HeroSlide;
  /** 1-indexed position within the rotating-backgrounds gallery (BG 2, BG 3…). */
  index: number;
  /** Section background — used to render the thumbnail when the slide inherits. */
  sectionBgUrl: string;
  sectionBgPoster: string;
  sectionBgType: HeroConfig['background_type'];
  onClick: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
  /** Drag handle props from @dnd-kit useSortable. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

/**
 * Square gallery thumbnail used in Background-Only rotator mode for the
 * non-master slides (BG 2…N). Communicates "this is just a background, not
 * a full slide" through compact tile geometry, hover-revealed actions, and
 * a "BG · N" label.
 *
 * Extracted from {@link HeroSlideListCard} so the row + tile capabilities
 * can evolve independently — tile picks up inline-upload affordances next.
 *
 * Hover actions stay revealed only on hover so the focal-point picker on
 * the upload tile (in the slide editor) still has the full thumb area for
 * crosshair targeting.
 */
export function HeroBackgroundTile({
  slide,
  index,
  sectionBgUrl,
  sectionBgPoster,
  sectionBgType,
  onClick,
  onDelete,
  onToggleActive,
  dragHandleProps,
}: HeroBackgroundTileProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isActive = slide.active !== false;
  const inherits = slide.background_type === 'inherit';
  const resolvedType = inherits ? sectionBgType : slide.background_type;
  const thumbUrl = inherits
    ? (sectionBgType === 'video' ? sectionBgPoster : sectionBgUrl)
    : (slide.background_type === 'video' ? slide.background_poster_url : slide.background_url);

  return (
    <div
      className={cn(
        'group relative aspect-square rounded-xl overflow-hidden border border-border/60 bg-gradient-to-br from-muted/60 to-muted/30 hover:border-foreground/40 hover:shadow-md transition-all',
        !isActive && 'opacity-60',
      )}
    >
      {/* Background — clickable area opens the slide editor */}
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        aria-label={`Edit background ${index + 1}`}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            {resolvedType === 'video' ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            <span className="text-[9px] font-display tracking-wider uppercase">No media</span>
          </div>
        )}
        {/* Subtle gradient at top so action chips stay legible on bright photos */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        {/* Bottom label: BG · N */}
        <div className="absolute bottom-1.5 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/45 backdrop-blur text-white text-[9px] font-display tracking-wider uppercase pointer-events-none">
          BG {index + 1}
        </div>
      </button>

      {/* Drag handle — top-left, hover-revealed */}
      <button
        type="button"
        className="absolute top-1.5 left-1.5 h-6 w-6 inline-flex items-center justify-center rounded-md bg-black/45 text-white/90 hover:bg-black/65 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur"
        aria-label="Drag to reorder"
        {...dragHandleProps}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Eye + Trash cluster — top-right, hover-revealed (eye stays visible when inactive) */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleActive(!isActive); }}
          className={cn(
            'h-6 w-6 inline-flex items-center justify-center rounded-md backdrop-blur transition-all',
            'opacity-0 group-hover:opacity-100',
            isActive
              ? 'bg-black/45 text-white/90 hover:bg-black/65'
              : '!opacity-100 bg-amber-500/90 text-amber-950 hover:bg-amber-500',
          )}
          aria-label={isActive ? 'Deactivate background' : 'Activate background'}
          title={isActive ? 'Deactivate — hide from live site' : 'Activate — show on live site'}
        >
          {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-black/45 text-white/90 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all backdrop-blur"
          aria-label="Delete background"
          title="Delete background permanently"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Background {index + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this rotating background. To temporarily hide it instead, use the eye icon to deactivate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); onDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Background
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
