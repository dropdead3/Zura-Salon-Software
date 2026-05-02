// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning inline
 * `<p>{config.consultation_note_lineN}</p>` JSX in hero files.
 *
 * Why this rule exists: the existing hero alignment selector catches
 * "you used the wrong items-* class" but NOT "you forgot to import the
 * shared HeroNotes component and re-typed the JSX inline." A future
 * hero variant (seasonal hero, announcement bar, third slide rotator,
 * etc.) could re-introduce the May 2026 alignment regression by
 * duplicating the consultation-notes JSX with hardcoded styling. This
 * rule blocks that at authoring time.
 *
 * Pair with:
 *   - src/test/lint-config-resolution.test.ts (asserts the selector
 *     survives flat-config replacement)
 *   - src/components/home/HeroNotes.tsx (the canonical owner — the
 *     ONE inline render permitted, suppressed via eslint-disable)
 */
describe('no-restricted-syntax: hero notes shared-component canon', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    ignore: false,
  });

  it('flags inline `<p>{config.consultation_note_lineN}</p>` JSX', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-notes-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroNotes|consultation-note rendering/i.test(m.message ?? ''),
      );
    // Two violations expected (line1 + line2).
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].message).toMatch(/HeroNotes/);
  });

  it('does not flag hero files that import and render <HeroNotes />', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-notes-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroNotes|consultation-note rendering/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });

  it('does not flag the production hero files (refactor sanity check)', async () => {
    // HeroNotes.tsx itself IS the canonical owner — it suppresses the
    // selector inline. The other hero files should now route through it.
    const results = await eslint.lintFiles([
      'src/components/home/HeroSlideRotator.tsx',
      'src/components/home/HeroSlideRotator.tsx',
      'src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroNotes|consultation-note rendering/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });
});
