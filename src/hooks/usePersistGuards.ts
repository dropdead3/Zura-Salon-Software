import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

/**
 * usePersistGuards — generic Save-time confirmation composer.
 *
 * Background: every editor (Promotional Popup today; Announcement Bar, Hero
 * Badge, SEO meta, Footer CTA tomorrow) needs the same shape of "warn before
 * shipping a risky save" UX:
 *   1. Compute findings synchronously from form state.
 *   2. If any guard blocks, surface a Sonner toast with a "Save anyway" action.
 *   3. Otherwise persist immediately.
 *
 * Without this composer, every editor reinvents the toast scaffolding and
 * forgets edge cases (multiple guards firing, scroll-into-view of the first
 * offender, focus management). Now it's one wrapper.
 *
 * Guards run in declaration order; the FIRST blocking guard wins (data-loss
 * concerns like text truncation should sit above legibility concerns like
 * low contrast). The operator dismisses with "Save anyway" → persist runs.
 *
 * Each guard returns either `null` (clean) or a descriptor. The descriptor
 * doubles as the surface for the warning toast and as a hook for downstream
 * consumers that want to highlight offending fields in the form.
 */

export type GuardSeverity = 'block' | 'warn';

export interface GuardResult {
  /** Stable id used by consumers to flag offending inputs. */
  field?: string;
  /** Sonner toast title. */
  title: string;
  /** Sonner toast description. Lines joined with newlines render fine. */
  description?: string;
  /** Element to scroll-into-view + focus when this guard blocks Save. */
  scrollTo?: HTMLElement | null;
  /**
   * `block` shows the confirm toast and gates persist behind "Save anyway".
   * `warn` is reserved for future-style passive surfaces; today it's an alias
   * for `block` (kept as a separate token so we don't have to invent a new
   * field later).
   */
  severity?: GuardSeverity;
}

export type Guard = () => GuardResult | null;

export interface UsePersistGuardsOptions {
  guards: Guard[];
  persist: () => Promise<void> | void;
  /** Toast duration in ms. */
  duration?: number;
}

export interface UsePersistGuardsReturn {
  /** The Save handler — wire to your editor's primary Save action. */
  guardedSave: () => Promise<void>;
  /** Findings for inline destructive-state styling on offending inputs. */
  findings: GuardResult[];
  /** Convenience: any guard tripped? */
  hasFindings: boolean;
  /** O(1) lookup for inline highlighting. */
  isFieldGuarded: (field: string) => boolean;
}

export function usePersistGuards({
  guards,
  persist,
  duration = 10000,
}: UsePersistGuardsOptions): UsePersistGuardsReturn {
  const findings = useMemo(
    () => guards.map((g) => g()).filter((f): f is GuardResult => f !== null),
    [guards],
  );

  const offendingFields = useMemo(
    () => new Set(findings.map((f) => f.field).filter(Boolean) as string[]),
    [findings],
  );

  const isFieldGuarded = useCallback(
    (field: string) => offendingFields.has(field),
    [offendingFields],
  );

  const guardedSave = useCallback(async () => {
    if (findings.length === 0) {
      await persist();
      return;
    }

    // Bring the first guard's offending node into view so operators don't
    // hunt blindly after dismissing the toast.
    const first = findings[0];
    const node = first.scrollTo ?? null;
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        const focusable = node as HTMLElement & { focus?: () => void };
        if (typeof focusable.focus === 'function') {
          focusable.focus({ preventScroll: true });
        }
      }, 250);
    }

    // Compose the toast from the FIRST finding (operators read top-down;
    // stacking 3 toasts hides each behind the next).
    toast.warning(first.title, {
      description: first.description,
      duration,
      action: {
        label: 'Save anyway',
        onClick: () => {
          void persist();
        },
      },
    });
  }, [findings, persist, duration]);

  return {
    guardedSave,
    findings,
    hasFindings: findings.length > 0,
    isFieldGuarded,
  };
}

// ─── Reusable guard factories ───
// These compose into the `guards` array so editor authors describe what they
// care about rather than how the toast scaffolding works.

/**
 * Overflow guard — preserves the existing useOverflowGuard contract on top
 * of the new composer. `findings` is whatever the editor's character-ceiling
 * counters produced; the first overflow becomes the toast subject.
 */
export function makeOverflowGuard<F extends { field: string; message: string }>(
  findings: F[],
  fieldRefs?: Partial<Record<string, HTMLElement | null>>,
  title = 'Some copy will truncate',
): Guard {
  return () => {
    if (findings.length === 0) return null;
    const first = findings[0];
    return {
      field: first.field,
      title,
      description: findings.map((f) => `• ${f.message}`).join('\n'),
      scrollTo: fieldRefs?.[first.field] ?? null,
    };
  };
}

/**
 * Contrast guard — blocks Save when an accent color clears neither black nor
 * white text at WCAG 3:1. Operator can still ship via "Save anyway" (some
 * white-label clients have brand-mandated pastels and accept the trade-off).
 *
 * `getRatio` is injected so this hook stays free of color-parsing deps;
 * pass `bestTextContrast` from `@/lib/color-contrast` at the call site.
 */
export function makeContrastGuard(opts: {
  accent: string | undefined | null;
  getRatio: (accent: string) => number | null;
  field?: string;
  scrollTo?: HTMLElement | null;
  threshold?: number;
}): Guard {
  return () => {
    const { accent, getRatio, field, scrollTo, threshold = 3 } = opts;
    if (!accent || !accent.trim()) return null;
    const ratio = getRatio(accent);
    if (ratio === null || ratio >= threshold) return null;
    return {
      field,
      title: 'Low contrast accent',
      description: `Even the best text color clears only ${ratio.toFixed(2)}:1 against this accent. Visitors may struggle to read the CTA.`,
      scrollTo: scrollTo ?? null,
    };
  };
}
