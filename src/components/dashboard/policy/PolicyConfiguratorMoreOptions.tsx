/**
 * PolicyConfiguratorMoreOptions (Wave 28.18)
 *
 * Collapsed disclosure that holds the structural / lifecycle escape-hatches
 * the configurator no longer renders above the fold:
 *   • Where it shows (surfaces editor)
 *   • Edit all rules (sheet trigger)
 *   • Version history (drawer trigger)
 *   • Client acknowledgments (drawer trigger)
 *   • Archive / Reactivate policy
 *
 * Each row is a single icon + label + chevron; selecting one fires the
 * provided handler. The owning panel still mounts the actual drawers/sheets
 * and AlertDialogs — this component just relocates the entry points.
 */
import { useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Settings2,
  History,
  FileSignature,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RowAction {
  id: string;
  icon: ReactNode;
  label: string;
  description?: string;
  onSelect: () => void;
  trailing?: ReactNode;
  /** When true, renders the label in destructive tone. */
  destructive?: boolean;
}

interface Props {
  /** Rendered inline above the row list when expanded. Used for the surface editor. */
  surfacesContent?: ReactNode;
  onEditAllRules?: () => void;
  onOpenHistory?: () => void;
  onOpenAcknowledgments?: () => void;
  acknowledgmentCount?: number;
  showAcknowledgments?: boolean;
  showSurfaces?: boolean;
  /** Lifecycle: archived state swaps Archive → Reactivate. */
  isArchived?: boolean;
  onArchive?: () => void;
  onReactivate?: () => void;
  hasPolicy: boolean;
}

export function PolicyConfiguratorMoreOptions({
  surfacesContent,
  onEditAllRules,
  onOpenHistory,
  onOpenAcknowledgments,
  acknowledgmentCount = 0,
  showAcknowledgments = false,
  showSurfaces = false,
  isArchived = false,
  onArchive,
  onReactivate,
  hasPolicy,
}: Props) {
  const [open, setOpen] = useState(false);

  const rows: RowAction[] = [];

  if (onEditAllRules) {
    rows.push({
      id: 'edit-all-rules',
      icon: <Settings2 className="w-4 h-4" />,
      label: 'Edit all rules',
      description: 'Open the full rule sheet — every chip in one form.',
      onSelect: onEditAllRules,
    });
  }

  if (hasPolicy && onOpenHistory) {
    rows.push({
      id: 'history',
      icon: <History className="w-4 h-4" />,
      label: 'Version history',
      description: 'Every saved version, newest first.',
      onSelect: onOpenHistory,
    });
  }

  if (showAcknowledgments && onOpenAcknowledgments) {
    rows.push({
      id: 'acks',
      icon: <FileSignature className="w-4 h-4" />,
      label: 'Client acknowledgments',
      description: 'Read-only audit log of every client signature.',
      onSelect: onOpenAcknowledgments,
      trailing:
        acknowledgmentCount > 0 ? (
          <span className="font-sans text-xs text-muted-foreground tabular-nums">
            {acknowledgmentCount}
          </span>
        ) : undefined,
    });
  }

  if (hasPolicy && !isArchived && onArchive) {
    rows.push({
      id: 'archive',
      icon: <Archive className="w-4 h-4" />,
      label: 'Archive policy',
      description: 'Stop rendering on every surface. History is preserved.',
      onSelect: onArchive,
      destructive: true,
    });
  }

  if (hasPolicy && isArchived && onReactivate) {
    rows.push({
      id: 'reactivate',
      icon: <RotateCcw className="w-4 h-4" />,
      label: 'Reactivate policy',
      description: 'Return to drafting. Re-enable surfaces when ready.',
      onSelect: onReactivate,
    });
  }

  // If there's nothing to show at all, don't render the disclosure.
  if (rows.length === 0 && !showSurfaces) return null;

  return (
    <div className="border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 py-2 group"
      >
        <span className="font-sans text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          More options
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 pt-3 pb-1">
          {showSurfaces && surfacesContent && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-display text-[11px] tracking-wider uppercase text-foreground">
                  Where it shows
                </span>
              </div>
              {surfacesContent}
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40 overflow-hidden">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={row.onSelect}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center',
                      row.destructive ? 'text-destructive/80' : 'text-foreground/70',
                    )}
                  >
                    {row.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'block font-sans text-sm',
                        row.destructive ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {row.label}
                    </span>
                    {row.description && (
                      <span className="block font-sans text-xs text-muted-foreground mt-0.5">
                        {row.description}
                      </span>
                    )}
                  </span>
                  {row.trailing}
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
