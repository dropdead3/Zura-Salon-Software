import { cn } from '@/lib/utils';

interface DividerProps {
  /**
   * - `hairline`: tight 1px border at 40% opacity. Use inside cards
   *   to split header/body, list rows, sub-sections.
   * - `inset`: centered 60%-width gradient with side-fade. Use between
   *   top-level page sections for editorial breathing.
   */
  variant?: 'hairline' | 'inset';
  className?: string;
}

/**
 * Step 1D — Divider system.
 *
 * Two intentional break styles:
 *   <Divider variant="hairline" />  ← inside-card split
 *   <Divider variant="inset" />     ← between-section breathing
 *
 * Always renders <hr> for semantics + screen readers.
 */
export function Divider({ variant = 'hairline', className }: DividerProps) {
  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        variant === 'inset' ? 'divider-inset' : 'divider-hairline',
        className
      )}
    />
  );
}
