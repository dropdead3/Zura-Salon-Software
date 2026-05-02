/**
 * HeroEyebrow — preview-vs-live parity guard for the hero eyebrow line.
 *
 * Both the static hero (`HeroSection`), the slide rotator (`HeroSlideRotator`),
 * and the editor preview thumbnail (`HeroSectionPreview`) render the same
 * eyebrow contract: `text-xs uppercase tracking-[0.2em] font-display
 * section-eyebrow` + a tone class. Pre-extraction we had three subtly
 * different inline shapes — exactly the divergence pattern that allowed the
 * May 2026 hero-notes alignment regression to ship past the existing
 * preview test. This component absorbs all three so a future hero variant
 * (parallax, seasonal, third rotator) cannot drift.
 *
 * Branching inside the component, not at the callsite:
 *   - `editable` (default false): wraps the value in <InlineEditableText/>
 *     so the editor's click-to-edit overlay attaches. The live site never
 *     sets this — `EditableText` no-ops in non-preview mode but keeping
 *     the branch out of the live tree avoids Suspense / context coupling.
 *   - `toneClass`: callers pass a slot for the muted color (light vs media
 *     bg differs); kept as a slot so we don't reinvent the heroColors
 *     resolution chain inside this leaf.
 *
 * Pure component: no hooks, no router, no DB. Same constraints as
 * <HeroNotes/> and <HeroScrollIndicator/>.
 */
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InlineEditableText } from '@/components/home/InlineEditableText';
import { cn } from '@/lib/utils';

interface HeroEyebrowProps {
  /** Eyebrow copy. Component renders nothing if falsy. */
  text: string | null | undefined;
  /** Operator's `show_eyebrow` toggle. False short-circuits to null. */
  show: boolean;
  /** Tone class for the muted text color (e.g. `text-muted-foreground`). */
  toneClass?: string;
  /** Inline style override (operator-set color). Takes precedence over toneClass. */
  style?: React.CSSProperties;
  /**
   * When true, wrap the value in <InlineEditableText/> so the editor's
   * click-to-edit overlay attaches. Live surfaces leave this false.
   */
  editable?: boolean;
  /**
   * Section-config field path for the editor's inline-edit dispatcher.
   * Required when editable=true. Examples: `eyebrow`, `slides.0.eyebrow`.
   */
  fieldPath?: string;
  /** Optional extra classes (e.g. `mb-6` margin from the parent stack). */
  className?: string;
}

export function HeroEyebrow({
  text,
  show,
  toneClass = 'text-muted-foreground',
  style,
  editable = false,
  fieldPath,
  className,
}: HeroEyebrowProps) {
  if (!show || !text) return null;

  if (editable) {
    return (
      <p
        data-hero-eyebrow
        className={cn(
          'text-xs uppercase tracking-[0.2em] font-display section-eyebrow',
          toneClass,
          className,
        )}
        style={style}
      >
        {/* eslint-disable-next-line no-restricted-syntax -- canonical owner of editable hero eyebrow rendering. */}
        <InlineEditableText
          as="span"
          value={text}
          sectionKey="section_hero"
          fieldPath={fieldPath ?? 'eyebrow'}
          placeholder="Eyebrow"
        />
      </p>
    );
  }

  return (
    <span data-hero-eyebrow>
      <Eyebrow className={cn('section-eyebrow', toneClass, className)} style={style}>
        {text}
      </Eyebrow>
    </span>
  );
}
