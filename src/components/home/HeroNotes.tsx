/**
 * HeroNotes — pure, hook-free subcomponent rendering the two consultation
 * note lines that sit beneath the hero CTA buttons.
 *
 * Why this exists as its own component:
 *   The live `HeroSection` is hook + router + DB-context coupled, which made
 *   it untestable in isolation. The original "notes ignore content_alignment"
 *   regression slipped past the editor-preview Vitest because the preview
 *   surface used the centralized `alignment.notes` class while the live hero
 *   re-typed `items-center` inline. Extracting the rendering into a pure
 *   subcomponent gives both surfaces (live + preview) ONE shared rendering
 *   path, so a single Vitest assertion covers preview-vs-live parity.
 *
 * Usage contract:
 *   - Caller resolves `alignment` via `resolveHeroAlignment(content_alignment)`
 *     and passes the whole object (NOT just the .notes string) so future
 *     alignment-related concerns (eyebrow placement, max-width, etc.) can
 *     extend this component without changing every call site.
 *   - `line1` / `line2` are pre-resolved strings — empty strings are rendered
 *     as empty `<p>` to preserve the two-line vertical rhythm; callers that
 *     want to hide notes entirely should not render this component at all.
 */
import { cn } from '@/lib/utils';
import type { HeroAlignmentClasses } from '@/lib/heroAlignment';

interface HeroNotesProps {
  alignment: HeroAlignmentClasses;
  line1: string;
  line2: string;
  /** Optional className appended to the container (e.g. for motion wrappers). */
  className?: string;
}

export function HeroNotes({ alignment, line1, line2, className }: HeroNotesProps) {
  return (
    <div
      data-hero-notes=""
      className={cn(
        'flex flex-col gap-1 text-xs md:text-sm text-muted-foreground font-sans',
        alignment.notes,
        className,
      )}
    >
      <p>{line1}</p>
      <p>{line2}</p>
    </div>
  );
}
