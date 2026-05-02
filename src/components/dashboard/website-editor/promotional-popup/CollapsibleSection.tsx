/**
 * CollapsibleSection — rail-friendly collapsible wrapper for the
 * Promotional Popup editor (and any narrow editor panel that needs to
 * compress a long scroll into navigable groups).
 *
 * Why this exists:
 *   The popup editor rail accumulated ~10 stacked cards (Library,
 *   Analytics, Schedule, Experiment, Goal, Redemptions, Content, Offer,
 *   Behavior, Targeting, Schedule-window). At sidebar widths that's a
 *   1500+px scroll just to reach Targeting. Operators couldn't find what
 *   they needed without hunting.
 *
 * Contract:
 *   - Header is a real <button> with aria-expanded for screen readers.
 *   - Open state is in-memory only (per the Editor Dirty-State Doctrine
 *     and Website Editor Entry Contract — re-entering the editor must
 *     land on the canonical default tree, not the operator's last
 *     scroll/expand state).
 *   - `defaultOpen` controls initial render only; parent owns no state.
 *   - `summary` renders inline next to the title when collapsed AND
 *     expanded (acts as a quick-glance status chip — e.g. "3 rotations").
 *   - `tone="muted"` collapses chrome (no border) for nested groups; the
 *     default tone uses a subtle bordered strip.
 */
import { useState, type ReactNode, type ComponentType } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  /** Inline status chip rendered next to the title (e.g. "3 rotations", "Active"). */
  summary?: ReactNode;
  /** Multi-line description shown beneath the title when expanded. */
  description?: string;
  defaultOpen?: boolean;
  tone?: 'default' | 'muted';
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  summary,
  description,
  defaultOpen = false,
  tone = 'default',
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        tone === 'default' && 'border border-border/60 bg-card/40',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 text-left',
          'hover:bg-muted/40 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        )}
      >
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="font-display uppercase tracking-wider text-xs text-foreground block truncate">
            {title}
          </span>
          {summary && (
            <span className="font-sans text-[11px] text-muted-foreground block truncate mt-0.5">
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3">
          {description && (
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
