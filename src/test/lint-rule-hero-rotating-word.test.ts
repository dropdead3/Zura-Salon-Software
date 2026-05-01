// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning inline <motion.span>
 * JSX in hero files. 4th entry in the hero parity canon (after HeroNotes,
 * HeroScrollIndicator, HeroEyebrow).
 *
 * Why this rule exists: pre-extraction the rotating word shipped in three
 * places (HeroSection, HeroSlideRotator, HeroSectionPreview) — and went
 * missing TWICE during hero refactors because nothing forced new variants
 * through the shared component. This rule blocks hand-rolled motion.span
 * inside hero files at authoring time.
 */
describe('no-restricted-syntax: hero rotating-word parity canon', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    ignore: false,
  });

  it('flags inline <motion.span> JSX in hero files', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-rotating-word-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroRotatingWord|rotating-word/i.test(m.message ?? ''),
      );
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].message).toMatch(/HeroRotatingWord/);
  });

  it('does not flag hero files that import and render <HeroRotatingWord />', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-rotating-word-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter(
        (m) =>
          m.ruleId === 'no-restricted-syntax' &&
          /HeroRotatingWord|rotating-word/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });

  it('does not flag the production hero files (refactor sanity check)', async () => {
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
          /HeroRotatingWord|rotating-word/i.test(m.message ?? ''),
      );
    expect(messages, JSON.stringify(messages, null, 2)).toHaveLength(0);
  });
});
