import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionGroupHeaderProps {
  title: string;
  /** Optional small caption rendered under the title — clarifies the zone's intent. */
  caption?: string;
  /** Enable collapse toggle */
  collapsible?: boolean;
  /** Whether the group is currently open (only used when collapsible) */
  isOpen?: boolean;
  /** Called when user toggles the group */
  onToggle?: () => void;
  /** Optional item count, shown as a small numeric badge on the right. */
  count?: number;
}

export function SectionGroupHeader({
  title,
  caption,
  collapsible,
  isOpen = true,
  onToggle,
  count,
}: SectionGroupHeaderProps) {
  if (collapsible) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 mt-1 mb-0.5 rounded-md group hover:bg-muted/40 transition-colors duration-150"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 text-muted-foreground/70 transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
        <div className="flex-1 min-w-0 text-left">
          <span className="text-[10px] font-display tracking-wider text-muted-foreground/70 block truncate">
            {title}
          </span>
          {caption && (
            <span className="text-[9px] text-muted-foreground/50 block truncate">
              {caption}
            </span>
          )}
        </div>
        {typeof count === 'number' && count > 0 && (
          <span className="text-[9px] font-medium text-muted-foreground/70 tabular-nums px-1.5 py-0.5 rounded-full bg-muted/60 min-w-[18px] text-center">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="px-3 py-1.5 mt-3 mb-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-display tracking-wider text-muted-foreground block truncate">
            {title}
          </span>
          {caption && (
            <span className="text-[9px] text-muted-foreground/50 block truncate">
              {caption}
            </span>
          )}
        </div>
        {typeof count === 'number' && count > 0 && (
          <span className="text-[9px] font-medium text-muted-foreground/70 tabular-nums px-1.5 py-0.5 rounded-full bg-muted/60 min-w-[18px] text-center">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}
