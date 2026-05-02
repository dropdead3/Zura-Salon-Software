// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning inline <Eyebrow>
 * JSX in hero files. Pairs with the HeroNotes and HeroScrollIndicator
 * parity canons — same shape, third surface.
 *
 * Why this rule exists: pre-extraction the hero eyebrow shipped in three
 * subtly different shapes across HeroSection, HeroSlideRotator, and
 * HeroSectionPreview — the same divergence pattern that drove the May 2026
 * hero-notes alignment regression. Slides now own `eyebrow` + `show_eyebrow`
 * per slide, multiplying the drift surface. This rule blocks hand-rolled
 * eyebrow JSX in any future hero variant.
 *
 * Pair with:
 *   - src/test/lint-config-resolution.test.ts (asserts the selector
 *     survives flat-config replacement)
 *   - src/components/home/HeroEyebrow.tsx (the canonical owner — the
 *     ONE Eyebrow render permitted, suppressed via eslint-disable)
 */
describe('no-restricted-syntax: hero eyebrow parity canon', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    ignore: false,
  });

  it('flags inline <Eyebrow> JSX in hero files', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-eyebrow-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroEyebrow|hero eyebrow rendering/i.test(m.message ?? ''),
      );
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].message).toMatch(/HeroEyebrow/);
  });

  it('does not flag hero files that import and render <HeroEyebrow />', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-eyebrow-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroEyebrow|hero eyebrow rendering/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });

  it('does not flag the production hero files (refactor sanity check)', async () => {
    // HeroEyebrow.tsx itself IS the canonical owner — it suppresses the
    // selector inline. The other hero files now route through it.
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
          /HeroEyebrow|hero eyebrow rendering/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });
});
