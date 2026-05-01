// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning hardcoded
 * `items-(center|start|end)` literals inside `cn()` calls in hero files
 * (unless the same `cn()` also references `alignment.*`).
 *
 * Why this rule exists: the May 2026 hero-notes alignment regression
 * shipped because the live `HeroSection` re-typed `items-center` inline
 * on the consultation-notes container, which silently overrode the
 * operator's `content_alignment` choice. The editor preview correctly
 * routed through `alignment.notes` — so the preview-vs-live drift was
 * invisible until an operator complained.
 *
 * If this test fails, the lint rule is silently broken (worst-case
 * scenario, since the doctrine looks enforced but isn't). Pair with the
 * meta-test `src/test/lint-config-resolution.test.ts` which asserts the
 * selector survives flat-config replacement on the hero-files block.
 */
describe('no-restricted-syntax: hero alignment canon', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    // Bypass top-level `ignores` so we can lint the intentionally-violating
    // fixture file. Without this, the rule appears to pass because ESLint
    // skipped the file entirely.
    ignore: false,
  });

  it('flags `cn(..., "items-center")` without alignment.* reference', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-alignment-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(messages.length).toBeGreaterThanOrEqual(1);
    // Confirm the message references the doctrine, not just any restricted-syntax fire.
    expect(messages[0].message).toMatch(/alignment|resolveHeroAlignment|content_alignment/i);
  });

  it('does not flag `cn(...)` calls that route through alignment.*', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-alignment-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /alignment|resolveHeroAlignment/i.test(m.message ?? ''),
      );
    expect(messages).toHaveLength(0);
  });

  it('does not flag the production hero files (refactor sanity check)', async () => {
    const results = await eslint.lintFiles([
      'src/components/home/HeroSection.tsx',
      'src/components/home/HeroNotes.tsx',
      'src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /alignment|resolveHeroAlignment/i.test(m.message ?? ''),
      );
    // If this fails, the refactor either missed a call site or the
    // `alignment.*` member-access escape hatch isn't matching as expected.
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });
});
