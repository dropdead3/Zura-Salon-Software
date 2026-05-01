// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning inline
 * `<motion.button>` JSX in hero files. Pairs with the HeroNotes parity
 * canon — same shape, different surface.
 *
 * Why this rule exists: the May 2026 missing-indicator regression shipped
 * because HeroSlideRotator never rendered a scroll affordance at all. The
 * fix extracted HeroScrollIndicator as a shared component for parity. This
 * rule prevents a future hero variant from re-introducing the same drift
 * by hand-rolling its own scroll cue with motion.button.
 *
 * Pair with:
 *   - src/test/lint-config-resolution.test.ts (asserts the selector
 *     survives flat-config replacement)
 *   - src/components/home/HeroScrollIndicator.tsx (the canonical owner —
 *     the ONE motion.button permitted, suppressed via eslint-disable)
 */
describe('no-restricted-syntax: hero scroll-indicator parity canon', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    ignore: false,
  });

  it('flags inline <motion.button> JSX in hero files', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-scroll-indicator-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroScrollIndicator|scroll affordance/i.test(m.message ?? ''),
      );
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].message).toMatch(/HeroScrollIndicator/);
  });

  it('does not flag hero files that import and render <HeroScrollIndicator />', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-scroll-indicator-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroScrollIndicator|scroll affordance/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });

  it('does not flag the production hero files (refactor sanity check)', async () => {
    // HeroScrollIndicator.tsx itself IS the canonical owner — it
    // suppresses the selector inline. The other hero files now route
    // through it.
    const results = await eslint.lintFiles([
      'src/components/home/HeroSection.tsx',
      'src/components/home/HeroSlideRotator.tsx',
      'src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroScrollIndicator|scroll affordance/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });
});
