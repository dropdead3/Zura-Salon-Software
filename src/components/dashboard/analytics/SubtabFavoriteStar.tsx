import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalyticsSubtabFavorites } from '@/hooks/useAnalyticsSubtabFavorites';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SubtabFavoriteStarProps {
  tab: string;
  subtab: string;
  label: string;
}

export function SubtabFavoriteStar({ tab, subtab, label }: SubtabFavoriteStarProps) {
  const { isFavorited, toggleFavorite, isAtLimit } = useAnalyticsSubtabFavorites();
  const favorited = isFavorited(tab, subtab);
  const disabled = !favorited && isAtLimit;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;
    toggleFavorite(tab, subtab, label);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded-sm transition-all duration-200",
            "opacity-0 group-hover/subtab:opacity-100 focus:opacity-100",
            favorited && "!opacity-100",
            disabled && "cursor-not-allowed opacity-30"
          )}
          aria-label={favorited ? `Remove ${label} from sidebar` : `Pin ${label} to sidebar`}
        >
          <Star
            className={cn(
              "w-3 h-3 transition-colors",
              favorited
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground hover:text-amber-500"
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {disabled
          ? 'Maximum favorites reached (6)'
          : favorited
            ? 'Remove from sidebar'
            : 'Pin to sidebar')}
      </TooltipContent>
    </Tooltip>
  );
}
