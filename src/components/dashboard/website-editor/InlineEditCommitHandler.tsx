/**
 * InlineEditCommitHandler — shell-side persistence of canvas inline edits.
 *
 * Doctrine:
 *   - The iframe never writes to the DB directly. It posts an
 *     `INLINE_EDIT_COMMIT` upward; THIS component owns the mutation.
 *   - A registry maps allowed `(sectionKey, fieldPath)` pairs to a typed
 *     update function. Anything not in the registry is silently dropped — no
 *     accidental write paths from a compromised iframe.
 *   - Writes use the existing `useSectionConfig.update` mutation so dirty
 *     state, cache invalidation, and audit logging continue to work.
 *   - On success we ALSO broadcast an `editor-dirty-state` flip so the shell's
 *     "Saved 2s ago" footer ticks correctly.
 *
 * Renders nothing — pure listener.
 */

import { useCallback, useEffect } from 'react';
import {
  useHeroConfig,
  useBrandStatementConfig,
  useFAQConfig,
  useFooterCTAConfig,
  useNewClientConfig,
} from '@/hooks/useSectionConfig';
import { useToast } from '@/hooks/use-toast';
import { pushEditorHistoryEntry } from './EditorHistoryProvider';

type CommitMessage = {
  type: 'INLINE_EDIT_COMMIT';
  sectionKey: string;
  fieldPath: string;
  value: string;
};

function isCommitMessage(msg: unknown): msg is CommitMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    m.type === 'INLINE_EDIT_COMMIT' &&
    typeof m.sectionKey === 'string' &&
    typeof m.fieldPath === 'string' &&
    typeof m.value === 'string'
  );
}

/**
 * Apply a dot-path patch to a config object. Supports numeric indices for
 * arrays (e.g. `paragraphs.0`). Returns a new object — never mutates input.
 */
function applyPatch<T extends Record<string, any>>(obj: T, path: string, value: string): T {
  const segments = path.split('.');
  const next: any = Array.isArray(obj) ? [...obj] : { ...obj };
  let cursor: any = next;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const child = cursor[key];
    cursor[key] = Array.isArray(child) ? [...child] : { ...(child ?? {}) };
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
  return next;
}

export function InlineEditCommitHandler() {
  const { toast } = useToast();
  const hero = useHeroConfig();
  const brand = useBrandStatementConfig();
  const faq = useFAQConfig();
  const footerCta = useFooterCTAConfig();
  const newClient = useNewClientConfig();

  // Registry: sectionKey → { current config, update fn, allowed paths }.
  // Adding a new editable field is a one-line addition to `allowedPaths`.
  // Wildcards (`paragraphs.*`) accept any numeric index for array fields.
  const handle = useCallback(
    async (msg: CommitMessage) => {
      const registry: Record<
        string,
        {
          data: any;
          update: (next: any) => Promise<unknown>;
          allowedPaths: string[];
        }
      > = {
        section_hero: {
          data: hero.data,
          update: hero.update,
          allowedPaths: [
            'headline_text',
            'eyebrow',
            'subheadline_line1',
            'subheadline_line2',
            'cta_new_client',
          ],
        },
        section_brand_statement: {
          data: brand.data,
          update: brand.update,
          allowedPaths: ['eyebrow', 'headline_prefix', 'headline_suffix', 'paragraphs.*'],
        },
        section_faq: {
          data: faq.data,
          update: faq.update,
          allowedPaths: ['eyebrow', 'headline'],
        },
        section_footer_cta: {
          data: footerCta.data,
          update: footerCta.update,
          allowedPaths: ['eyebrow', 'headline', 'subheadline'],
        },
        section_new_client: {
          data: newClient.data,
          update: newClient.update,
          allowedPaths: ['eyebrow', 'headline', 'subheadline'],
        },
      };

      const entry = registry[msg.sectionKey];
      if (!entry) return; // unknown section — silently drop

      // Allowlist check (with wildcard support for array indices).
      const pathAllowed = entry.allowedPaths.some((p) => {
        if (p === msg.fieldPath) return true;
        if (p.endsWith('.*')) {
          const prefix = p.slice(0, -2);
          // matches `prefix.<number>` only (no nested traversal allowed)
          const re = new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.\\d+$`);
          return re.test(msg.fieldPath);
        }
        return false;
      });
      if (!pathAllowed) return; // unknown field — silently drop

      try {
        const patched = applyPatch(entry.data ?? {}, msg.fieldPath, msg.value);
        await entry.update(patched);
        // Mark draft as freshly saved; mirrors the editor-side dirty pulse.
        window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: false } }));
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Inline edit failed',
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [hero, brand, faq, footerCta, newClient, toast],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Same-origin guard — preview iframes are same-origin in our setup.
      if (event.origin !== window.location.origin) return;
      if (!isCommitMessage(event.data)) return;
      void handle(event.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handle]);

  return null;
}
