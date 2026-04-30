/**
 * InlineEditableText — canvas-side inline-edit primitive.
 *
 * Doctrine:
 *   - Renders inert children outside editor preview mode (zero footprint on the
 *     live public site).
 *   - Inside `?preview=true`, becomes a `contentEditable` surface with a subtle
 *     hover ring and pencil affordance. Operator clicks → focuses → types.
 *   - On commit (blur OR Enter), posts `INLINE_EDIT_COMMIT` upward to the
 *     editor shell, which persists via the existing `useSectionConfig.update`
 *     mutation. We never write directly from the iframe — the shell owns the
 *     write so dirty-state, undo, and audit logging stay in one place.
 *   - Single-line by default (Enter commits + blurs). Multiline opt-in via
 *     `multiline` prop (Enter inserts newline; Cmd/Ctrl+Enter commits).
 *   - Cursor preservation: the field is uncontrolled while focused so React
 *     re-renders can't reset caret position mid-typing. We only resync the
 *     DOM textContent when the incoming `value` changes AND the field is not
 *     focused.
 *
 * Security:
 *   - Plain text only (no HTML paste). `onPaste` is intercepted to strip
 *     formatting; `contentEditable="plaintext-only"` is the primary guard.
 *   - The shell-side handler validates `sectionKey + fieldPath` against an
 *     allowlist before persisting (see InlineEditCommitHandler).
 */

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InlineEditableTextProps {
  /** The current value (string). */
  value: string;
  /** Section settings key, e.g. 'section_hero'. */
  sectionKey: string;
  /** Dot-path inside the section config, e.g. 'headline_text' or 'paragraphs.0'. */
  fieldPath: string;
  /** Optional placeholder shown when value is empty (preview mode only). */
  placeholder?: string;
  /** Allow line breaks (Enter inserts newline; Cmd/Ctrl+Enter commits). */
  multiline?: boolean;
  /** className passed through so the editable surface inherits typography. */
  className?: string;
  /** Element tag for layout/semantics (default: span). */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';
}

function getIsEditorPreview() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  // Inline editing is suppressed in `mode=view` so the public-style preview
  // doesn't show edit affordances.
  if (params.get('mode') === 'view') return false;
  return params.has('preview');
}

export function InlineEditableText({
  value,
  sectionKey,
  fieldPath,
  placeholder,
  multiline = false,
  className,
  as: Tag = 'span',
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const isPreview = getIsEditorPreview();

  // Sync incoming value → DOM only when not actively focused. Prevents caret jumps.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  const commit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = (el.textContent ?? '').trim();
    if (next === value) return; // no-op
    try {
      window.parent.postMessage(
        {
          type: 'INLINE_EDIT_COMMIT',
          sectionKey,
          fieldPath,
          value: next,
        },
        '*',
      );
    } catch {
      /* iframe boundary; ignore */
    }
  }, [value, sectionKey, fieldPath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!multiline && e.key === 'Enter') {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur(); // triggers commit
        return;
      }
      if (multiline && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        // Revert DOM to last value, then blur without committing.
        const el = ref.current;
        if (el) el.textContent = value;
        (e.currentTarget as HTMLElement).blur();
      }
    },
    [multiline, value],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      const cleaned = multiline ? text : text.replace(/[\r\n]+/g, ' ');
      // Insert as plain text at the caret position.
      document.execCommand('insertText', false, cleaned);
    },
    [multiline],
  );

  // Live (public site) — render plain text, no edit affordance.
  if (!isPreview) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement & HTMLDivElement>}
      contentEditable="plaintext-only" // browsers fall back to true if unsupported
      suppressContentEditableWarning
      spellCheck
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-inline-editable="true"
      data-placeholder={placeholder ?? ''}
      className={cn(
        // Subtle affordance: barely-there ring on hover, fuller ring on focus.
        'outline-none rounded-sm transition-colors',
        'hover:bg-primary/5 hover:ring-1 hover:ring-primary/20',
        'focus:bg-primary/10 focus:ring-2 focus:ring-primary/40',
        // Empty-state: show placeholder via CSS pseudo-element.
        'empty:before:content-[attr(data-placeholder)] empty:before:opacity-40',
        className,
      )}
    >
      {value}
    </Tag>
  );
}
