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
  useTestimonialsConfig,
  useExtensionsConfig,
  useGalleryDisplayConfig,
  useLocationsSectionConfig,
  useStylistsDisplayConfig,
  useDrinkMenuConfig,
  useBrandsConfig,
  useExtensionReviewsConfig,
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

/** Read a dot-path value from a config object (returns '' if missing). */
function readPath(obj: any, path: string): string {
  const segments = path.split('.');
  let cursor: any = obj;
  for (const key of segments) {
    if (cursor == null) return '';
    cursor = cursor[key];
  }
  return typeof cursor === 'string' ? cursor : cursor == null ? '' : String(cursor);
}

export function InlineEditCommitHandler() {
  const { toast } = useToast();
  const hero = useHeroConfig();
  const brand = useBrandStatementConfig();
  const faq = useFAQConfig();
  const footerCta = useFooterCTAConfig();
  const newClient = useNewClientConfig();
  const testimonials = useTestimonialsConfig();
  const extensions = useExtensionsConfig();
  const gallery = useGalleryDisplayConfig();
  const locations = useLocationsSectionConfig();
  const stylists = useStylistsDisplayConfig();

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
          allowedPaths: [
            'cta_primary_text',
            'cta_secondary_text',
            'search_placeholder',
            'intro_paragraphs.*',
            'rotating_words.*',
          ],
        },
        section_footer_cta: {
          data: footerCta.data,
          update: footerCta.update,
          allowedPaths: [
            'eyebrow',
            'headline_line1',
            'headline_line2',
            'description',
            'cta_text',
          ],
        },
        section_new_client: {
          data: newClient.data,
          update: newClient.update,
          allowedPaths: [
            'headline_prefix',
            'description',
            'cta_text',
            'benefits.*',
            'rotating_words.*',
          ],
        },
        section_testimonials: {
          data: testimonials.data,
          update: testimonials.update,
          allowedPaths: ['eyebrow', 'headline', 'link_text', 'verified_badge_text'],
        },
        section_extensions: {
          data: extensions.data,
          update: extensions.update,
          allowedPaths: [
            'eyebrow',
            'badge_text',
            'headline_line1',
            'headline_line2',
            'description',
            'floating_badge_text',
            'floating_badge_description',
            'cta_primary',
            'cta_secondary',
            'education_link_text',
          ],
        },
        section_gallery_display: {
          data: gallery.data,
          update: gallery.update,
          allowedPaths: [
            'section_eyebrow',
            'section_title',
            'section_title_highlight',
            'section_description',
            'cta_text',
          ],
        },
        section_locations: {
          data: locations.data,
          update: locations.update,
          allowedPaths: [
            'section_eyebrow',
            'section_title',
            'card_cta_primary_text',
            'card_cta_secondary_text',
          ],
        },
        section_stylists_display: {
          data: stylists.data,
          update: stylists.update,
          allowedPaths: [
            'section_eyebrow',
            'section_title',
            'section_description',
          ],
        },
      };

      const entry = registry[msg.sectionKey];
      if (!entry) return; // unknown section — silently drop

      // Allowlist check (with wildcard support for array indices).
      // Supports two wildcard forms:
      //   `items.*`              → matches `items.0`, `items.1`, …
      //   `items.*.name`         → matches `items.0.name`, `items.1.name`, …
      const pathAllowed = entry.allowedPaths.some((p) => {
        if (p === msg.fieldPath) return true;
        if (p.includes('.*')) {
          // Convert dot-path with `.*` placeholders into a regex that allows
          // a single numeric segment in place of each `.*`.
          const escaped = p
            .split('.*')
            .map((seg) => seg.replace(/\./g, '\\.'))
            .join('\\.\\d+');
          const re = new RegExp(`^${escaped}$`);
          return re.test(msg.fieldPath);
        }
        return false;
      });
      if (!pathAllowed) return; // unknown field — silently drop

      try {
        const before = readPath(entry.data ?? {}, msg.fieldPath);
        const after = msg.value;
        const patched = applyPatch(entry.data ?? {}, msg.fieldPath, after);
        await entry.update(patched);
        // Mark draft as freshly saved; mirrors the editor-side dirty pulse.
        window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: false } }));
        // Register undo entry — re-applies the previous text via the same
        // update fn. We capture `entry.data` & `entry.update` in the closure;
        // the registry is rebuilt on every commit so these stay current.
        if (before !== after) {
          const inverseEntry = entry;
          pushEditorHistoryEntry({
            label: 'Edit text',
            undo: async () => {
              const reverted = applyPatch(inverseEntry.data ?? {}, msg.fieldPath, before);
              await inverseEntry.update(reverted);
            },
            redo: async () => {
              const reapplied = applyPatch(inverseEntry.data ?? {}, msg.fieldPath, after);
              await inverseEntry.update(reapplied);
            },
          });
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Inline edit failed',
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [hero, brand, faq, footerCta, newClient, testimonials, extensions, gallery, locations, stylists, toast],
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
