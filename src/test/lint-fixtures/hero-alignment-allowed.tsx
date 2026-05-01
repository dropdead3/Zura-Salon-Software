/**
 * Lint fixture — ALLOWED Hero Alignment patterns.
 *
 * Two patterns must NOT trigger the rule:
 *   1. `cn()` calls that include `items-*` AND reference `alignment.*` —
 *      the `items-center` is doing legitimate cross-axis centering on a
 *      flex row whose horizontal alignment is correctly routed through
 *      `alignment.ctaRow` (this is the real CTA-row pattern in HeroSection).
 *   2. `cn()` calls that route through `alignment.notes` with no literal
 *      `items-*` — the canonical post-fix shape.
 */
import { cn } from '@/lib/utils';

interface AlignmentLike {
  ctaRow: string;
  notes: string;
}

export function HeroCtaRow({ alignment }: { alignment: AlignmentLike }) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-3', alignment.ctaRow)}>
      <button>cta</button>
    </div>
  );
}

export function HeroNotesAllowed({ alignment }: { alignment: AlignmentLike }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 text-xs text-muted-foreground font-sans',
        alignment.notes,
      )}
    >
      <p>line one</p>
      <p>line two</p>
    </div>
  );
}
