// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { labelFor } from './lintLabel';
import { CONSOLIDATED_RESTRICTED_SYNTAX, PLATFORM_PRIMITIVE_PATHS } from '../../eslint.helpers.js';

/**
 * Quality guard for `labelFor()`.
 *
 * Asserts that EVERY entry in the consolidated doctrine arrays produces
 * a test-runner label between 8 and 80 chars. Catches regressions where
 * a future doctrine message starts with a URL, a punctuation-heavy
 * fragment, or an extremely short head ("Use:") — which would otherwise
 * render as unreadable test names in `lint-config-resolution.test.ts`.
 *
 * Why this matters: when the meta-test fires, the label IS the operator's
 * only signal about WHICH doctrine got dropped from the resolved config.
 * Unreadable labels = unreadable failures = harder remediation.
 */
describe('labelFor: quality guard for auto-generated test names', () => {
  describe('consolidated doctrine arrays', () => {
    for (const opt of CONSOLIDATED_RESTRICTED_SYNTAX) {
      it(`produces an 8–80 char label for selector: ${opt.selector?.slice(0, 50)}…`, () => {
        const label = labelFor(opt);
        expect(label.length, `Label too short or too long: "${label}" (${label.length} chars)`).toBeGreaterThanOrEqual(8);
        expect(label.length, `Label too long: "${label}" (${label.length} chars)`).toBeLessThanOrEqual(80);
      });
    }

    for (const opt of PLATFORM_PRIMITIVE_PATHS) {
      it(`produces an 8–80 char label for banned import: ${opt.name}`, () => {
        const label = labelFor({ selector: opt.name, message: opt.message });
        expect(label.length).toBeGreaterThanOrEqual(8);
        expect(label.length).toBeLessThanOrEqual(80);
      });
    }
  });

  describe('edge cases', () => {
    it('handles URL-prefixed messages by falling back to the selector', () => {
      const label = labelFor({
        selector: "JSXElement[openingElement.name.name='Foo']",
        message: 'https://example.com/docs/why-this-rule-exists must be read first.',
      });
      expect(label).not.toMatch(/^https?:\/\//);
      expect(label.length).toBeGreaterThanOrEqual(8);
    });

    it('handles overly-long message heads by truncating with ellipsis', () => {
      const longHead = 'A'.repeat(200);
      const label = labelFor({ selector: 'X', message: `${longHead}. rest` });
      expect(label.length).toBeLessThanOrEqual(80);
      expect(label).toMatch(/…$/);
    });

    it('strips leading punctuation/whitespace', () => {
      const label = labelFor({ selector: 'X', message: '   --→  Doctrine prose here' });
      expect(label.startsWith('Doctrine')).toBe(true);
    });

    it('returns a non-empty fallback when both inputs are empty', () => {
      const label = labelFor({ selector: '', message: '' });
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
