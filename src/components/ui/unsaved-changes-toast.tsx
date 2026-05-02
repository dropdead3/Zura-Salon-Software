import * as React from 'react';
import { Circle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DirtyActionButton } from '@/components/ui/dirty-action-button';
import { cn } from '@/lib/utils';
import { registerUnsavedToast } from '@/lib/unsavedToastPresence';

/**
 * UnsavedChangesToast — canonical persistent dirty-state indicator for inline
 * editors (Website Editor, Themes, Site Design, Bookings policy, etc.).
 *
 * Sits in the bottom-right of its containing surface (desktop) or stretches
 * into a full-width pill on mobile, respecting iOS safe-area insets so it
 * never collides with the home indicator. Persists for the entire duration
 * `isDirty` is true and auto-dismisses the moment Save or Discard succeeds.
 *
 * Pairs with `<UnsavedChangesDialog />` (confirmation) and `<DirtyActionButton />`
 * (header save button). Per the Unsaved Changes Dialog Canon, copy strings and
 * interaction shape are owned here — do not re-implement ad-hoc toasts.
 */
export function UnsavedChangesToast({
  isDirty,
  isSaving,
  onDiscard,
  onSave,
  className,
}: {
  isDirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  className?: string;
}) {
  // Register presence so the global Sonner toaster offsets upward and the
  // success/error toast never lands on top of the pill.
  React.useEffect(() => {
    if (!isDirty) return;
    return registerUnsavedToast();
  }, [isDirty]);

  if (!isDirty) return null;
  return (
    <div
      className={cn(
        // Mobile: full-width pill anchored to safe-area-aware bottom.
        // Desktop: compact pill bottom-right with normal inset.
        'pointer-events-auto fixed z-50 flex items-center justify-between gap-3',
        'left-4 right-4 md:left-auto md:right-6 md:w-auto',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] md:bottom-6',
        'rounded-full border border-warning/30 bg-card/95 pl-4 pr-[8px] py-1.5',
        'shadow-2xl backdrop-blur-xl',
        'animate-in fade-in slide-in-from-bottom-4 duration-200',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2 text-[12px] font-medium text-warning">
        <Circle className="h-2 w-2 fill-warning text-warning" />
        Unsaved changes
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onDiscard}
          disabled={isSaving}
          title="Discard unsaved changes in this section"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Discard
        </Button>
        <DirtyActionButton isDirty={isDirty} isSaving={isSaving} onClick={onSave} />
      </div>
    </div>
  );
}
