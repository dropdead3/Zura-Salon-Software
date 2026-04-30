import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

// Generic shape every overflow finding must satisfy. `field` is the stable id
// the editor uses to (a) toggle destructive borders on the offending input and
// (b) scroll the first offender into view when Save is blocked.
export type OverflowFindingBase = { field: string; message: string };

export type UseOverflowGuardOptions<F extends OverflowFindingBase> = {
  findings: F[];
  persist: () => Promise<void> | void;
  /** Sonner toast title when overflows exist. */
  title?: string;
  /** Lookup for the DOM node to scroll into view, keyed by `finding.field`. */
  fieldRefs?: Partial<Record<F['field'], HTMLElement | null>>;
  /** Toast duration in ms. */
  duration?: number;
};

/**
 * Reusable Save guard for editors that surface character-ceiling counters.
 *
 * Pattern: counters render destructive when over ceiling -> the same findings
 * feed this hook -> Save either persists immediately (clean) or fires a
 * Sonner warning with a "Save anyway" action and scrolls the first offender
 * into view.
 *
 * Lifted out of `PromotionalPopupEditor` so the next editor (Announcement
 * Bar, SEO meta, etc.) can wrap its Save in one line.
 */
export function useOverflowGuard<F extends OverflowFindingBase>({
  findings,
  persist,
  title = 'Some copy will truncate',
  fieldRefs,
  duration = 10000,
}: UseOverflowGuardOptions<F>) {
  const hasOverflow = findings.length > 0;
  const offendingFields = useMemo(
    () => new Set(findings.map((f) => f.field)),
    [findings],
  );

  const isFieldOverflowing = useCallback(
    (field: F['field']) => offendingFields.has(field),
    [offendingFields],
  );

  const guardedSave = useCallback(async () => {
    if (!hasOverflow) {
      await persist();
      return;
    }

    // Bring the first offending field into view so operators don't have to
    // hunt through long forms after dismissing the toast.
    const firstFieldId = findings[0]?.field as F['field'] | undefined;
    const node = firstFieldId ? fieldRefs?.[firstFieldId] : null;
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Defer focus so the scroll animation isn't fighting the focus jump.
      window.setTimeout(() => {
        if (typeof (node as HTMLElement & { focus?: () => void }).focus === 'function') {
          (node as HTMLElement).focus({ preventScroll: true });
        }
      }, 250);
    }

    const summary = findings.map((f) => `• ${f.message}`).join('\n');
    toast.warning(title, {
      description: summary,
      duration,
      action: {
        label: 'Save anyway',
        onClick: () => {
          void persist();
        },
      },
    });
  }, [hasOverflow, findings, persist, fieldRefs, title, duration]);

  return { guardedSave, hasOverflow, isFieldOverflowing };
}
