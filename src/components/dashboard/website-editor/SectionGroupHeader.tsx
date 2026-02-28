import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionGroupHeaderProps {
  title: string;
  /** Enable collapse toggle */
  collapsible?: boolean;
  /** Whether the group is currently open (only used when collapsible) */
  isOpen?: boolean;
  /** Called when user toggles the group */
  onToggle?: () => void;
}

export function SectionGroupHeader({ title, collapsible, isOpen = true, onToggle }: SectionGroupHeaderProps) {
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
        <span className="text-[10px] font-display tracking-wider text-muted-foreground/70">
          {title}
        </span>
      </button>
    );
  }

  return (
    <div className="px-3 py-1.5 mt-1 mb-0.5">
      <span className="text-[10px] font-display tracking-wider text-muted-foreground/70">
        {title}
      </span>
    </div>
  );
}
