import { forwardRef } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * DirtyActionButton — canonical "click to apply pending changes" button.
 *
 * Shared visual contract for any inline editor where typed/clicked edits
 * don't reach the live preview until the operator explicitly Saves
 * (Website Editor, Site Design, Themes, etc.). Centralizing prevents
 * tone drift (e.g. someone reaching for `bg-amber-500` instead of the
 * `--warning` token) and keeps the breathing-ring cue identical.
 *
 * Visual states:
 *  - clean    → low-emphasis ghost, disabled
 *  - dirty    → amber fill, soft 2s breathing ring (`animate-dirty-pulse`)
 *  - saving   → amber fill held, spinner replaces icon, ring paused
 *
 * Accessibility: tooltip via `title` flips between "click to apply" and
 * "preview updates after Save" so the explanation is always one hover away.
 */
export interface DirtyActionButtonProps extends Omit<ButtonProps, 'variant' | 'children'> {
  isDirty: boolean;
  isSaving?: boolean;
  /** Label shown when clean. Defaults to "Save". */
  cleanLabel?: string;
  /** Label shown when dirty. Defaults to "Save to preview". */
  dirtyLabel?: string;
  /** Label shown while saving. Defaults to dirty label. */
  savingLabel?: string;
  /** Optional icon override (defaults to lucide Save). */
  icon?: React.ComponentType<{ className?: string }>;
}

export const DirtyActionButton = forwardRef<HTMLButtonElement, DirtyActionButtonProps>(
  function DirtyActionButton(
    {
      isDirty,
      isSaving = false,
      cleanLabel = 'Save',
      dirtyLabel = 'Save to preview',
      savingLabel,
      icon: Icon = Save,
      className,
      title,
      disabled,
      ...rest
    },
    ref,
  ) {
    const showDirty = isDirty && !isSaving;
    const label = isSaving ? (savingLabel ?? dirtyLabel) : showDirty ? dirtyLabel : cleanLabel;
    const computedTitle =
      title ??
      (isDirty
        ? 'Click Save to update the preview (⌘S)'
        : 'Preview updates after each Save');

    return (
      <Button
        ref={ref}
        size="sm"
        variant={showDirty || isSaving ? 'default' : 'ghost'}
        disabled={disabled ?? (!isDirty || isSaving)}
        title={computedTitle}
        className={cn(
          'h-7 rounded-full px-3 text-xs transition-colors',
          (showDirty || isSaving) &&
            'bg-warning text-warning-foreground hover:bg-warning/90',
          showDirty && 'animate-dirty-pulse',
          className,
        )}
        {...rest}
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Icon className="h-3 w-3 mr-1" />
        )}
        {label}
      </Button>
    );
  },
);
