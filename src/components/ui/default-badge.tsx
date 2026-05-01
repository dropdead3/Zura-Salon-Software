/**
 * DefaultBadge — muted "Default" affordance for any control that has a known
 * baseline (focal point 50/50, theme accent, spacing 16px, etc.).
 *
 * Two roles in one primitive:
 *   - Passive label (when `onReset` is omitted): just signals "you are at the
 *     default value". Cheap glanceable state.
 *   - Reset trigger (when `onReset` is provided): clicking it returns the
 *     control to its default. Lets the parent collapse a redundant
 *     "Reset to default" link sitting elsewhere in the row.
 *
 * Intentionally hook-free and presentation-only — composes inside any label,
 * caption, or row without coupling to a specific editor's dirty-state model.
 */
import { cn } from '@/lib/utils';

interface DefaultBadgeProps {
  /** Label text. Defaults to "Default". */
  label?: string;
  /** Optional reset handler. When set the badge renders as a button. */
  onReset?: () => void;
  /** Optional accessible title / native tooltip override. */
  title?: string;
  className?: string;
}

export function DefaultBadge({
  label = 'Default',
  onReset,
  title,
  className,
}: DefaultBadgeProps) {
  const baseClasses = cn(
    'inline-flex items-center font-sans normal-case tracking-normal text-[10px] text-muted-foreground/80 px-1.5 py-0.5 rounded-full border border-border/60',
    className,
  );

  if (onReset) {
    return (
      <button
        type="button"
        onClick={onReset}
        title={title ?? 'Reset to default'}
        className={cn(
          baseClasses,
          'cursor-pointer hover:text-foreground hover:border-border transition-colors',
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <span title={title} className={baseClasses}>
      {label}
    </span>
  );
}
