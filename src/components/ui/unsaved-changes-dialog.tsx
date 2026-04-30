import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── UnsavedChangesDialog ──
// Canonical "you have unsaved edits" navigation guard.
//
// Promoted from WebsiteEditorShell + ServiceEditorDialog so future tweaks to
// copy, button order, or accessibility behavior happen in one place. Other
// editors (Typography, Theme, StylistLevels, etc.) carry inline "Unsaved
// changes" pills or unrelated reset/delete confirmations — those are out of
// scope for this dialog and intentionally not migrated.
//
// Behavior baked in (the three suggested enhancements):
//   1. One canonical layout/copy with Stay / Discard / Save ordering.
//   2. Pre-flight loading guard — when `isSaving` is true, both action
//      buttons disable and the primary CTA shows an inline spinner so a
//      slow save can't race the parent's nav handler.
//   3. Esc / backdrop close maps to "Stay here" (cancel), not "Discard".
//      Dirty state is preserved; the description hints at this so operators
//      don't assume Esc continued the navigation.

export interface UnsavedChangesDialogProps {
  open: boolean;
  /**
   * Called when the operator chooses to keep editing (button click, Esc,
   * or backdrop click). Should clear pending navigation but NOT discard
   * dirty state.
   */
  onCancel: () => void;
  /** Called when the operator chooses to throw away their edits. */
  onDiscard: () => void;
  /**
   * Called when the operator chooses to save first. Caller is responsible
   * for triggering the save and (when the save resolves) running whatever
   * navigation was deferred.
   */
  onSave: () => void;
  /**
   * When true, both action buttons disable and the Save CTA shows a
   * spinner. Prevents a slow save from racing the deferred navigation.
   */
  isSaving?: boolean;
  /** Override the dialog title. Defaults to "Unsaved changes". */
  title?: string;
  /** Override the body copy. Defaults to the website-editor wording. */
  description?: React.ReactNode;
  /** Optional secondary line under the description (e.g. "Drafts stay private…"). */
  hint?: React.ReactNode;
  /** Override CTA labels. */
  cancelLabel?: string;
  discardLabel?: string;
  saveLabel?: string;
  /** Disable Save when the form is invalid (e.g. missing required fields). */
  saveDisabled?: boolean;
  className?: string;
}

export function UnsavedChangesDialog({
  open,
  onCancel,
  onDiscard,
  onSave,
  isSaving = false,
  title = 'Unsaved changes',
  description = 'You have unsaved edits in this section. Save them as a draft first, or discard and continue.',
  hint,
  cancelLabel = 'Stay here',
  discardLabel = 'Discard changes',
  saveLabel = 'Save & continue',
  saveDisabled = false,
  className,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Esc + backdrop close map to Cancel, never Discard. Dirty state
        // is preserved so the operator's next click doesn't silently
        // continue the navigation they thought they cancelled.
        if (!next && !isSaving) onCancel();
      }}
    >
      <AlertDialogContent className={cn('max-w-md gap-4', className)}>
        <AlertDialogHeader className="space-y-2">
          <AlertDialogTitle className="font-display text-base tracking-wide uppercase">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-sans text-sm leading-relaxed">
            {description}
            {hint ? (
              <span className="block mt-1.5 text-xs text-muted-foreground/80">
                {hint}
              </span>
            ) : null}
            <span className="block mt-1.5 text-[11px] text-muted-foreground/60">
              Press Esc to stay on this section.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
          {/* Passive escape — ghost, leftmost. */}
          <Button
            type="button"
            variant="ghost"
            size="default"
            className="rounded-full"
            onClick={onCancel}
            disabled={isSaving}
          >
            {cancelLabel}
          </Button>
          {/* Cautious destructive — outline so it doesn't outshout primary. */}
          <Button
            type="button"
            variant="outline"
            size="default"
            className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60"
            onClick={onDiscard}
            disabled={isSaving}
          >
            {discardLabel}
          </Button>
          {/* Recommended path — filled primary, rightmost. */}
          <Button
            type="button"
            variant="default"
            size="default"
            className="rounded-full"
            onClick={onSave}
            disabled={isSaving || saveDisabled}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
            {saveLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
