/**
 * SectionSubhead — small all-caps label used to group fields inside an
 * editor panel (e.g. "Text" / "Primary Button" / "Secondary Button" inside
 * HeroTextColorsEditor; same pattern in SiteDesignPanel, HeroSlideRow).
 *
 * Centralizing the typography here means the next time the design system
 * rotates the subhead token (size, weight, tracking, family), every editor
 * panel updates with one edit instead of N grep-and-replace passes.
 */
import { cn } from '@/lib/utils';

interface SectionSubheadProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionSubhead({ children, className }: SectionSubheadProps) {
  return (
    <p
      className={cn(
        'text-[11px] uppercase tracking-wider text-muted-foreground font-display',
        className,
      )}
    >
      {children}
    </p>
  );
}
