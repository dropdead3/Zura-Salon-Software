import { type LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroEditorHubCardProps {
  title: string;
  icon: LucideIcon;
  /** One-line summary of the current state of this category. */
  summary: string;
  onClick: () => void;
  className?: string;
}

/**
 * Hub-level entry card for the Hero editor.
 *
 * Visually mirrors `EditorCard` (glass + border + rounded-xl) but acts as a
 * button: clicking it routes the parent `HeroEditor` into the matching
 * sub-view. Status summary is computed by the parent off `localConfig` so
 * unsaved edits are reflected immediately.
 */
export function HeroEditorHubCard({
  title,
  icon: Icon,
  summary,
  onClick,
  className,
}: HeroEditorHubCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left bg-card/80 backdrop-blur-xl border border-border/50',
        'rounded-xl shadow-sm overflow-hidden p-4',
        'flex items-center gap-3 transition-all',
        'hover:border-foreground/30 hover:shadow-md hover:-translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm tracking-wide text-foreground truncate">
          {title}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate font-sans">
          {summary}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </button>
  );
}
