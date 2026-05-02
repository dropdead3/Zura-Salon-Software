// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the Global Overlay Stability import ban.
 *
 * Asserts that linting the banned fixture surfaces the
 * `no-restricted-imports` violation for `@/lib/heroAlignmentSignal`.
 * The fixture itself carries an `eslint-disable-next-line` on the actual
 * import line so `npm run lint` doesn't trip — but this test bypasses
 * disable comments via `allowInlineConfig: false`.
 *
 * Pairs with:
 *   - eslint.config.js (defineScopedImportDoctrine block)
 *   - eslint.helpers.js (HERO_ALIGNMENT_OVERLAY_PATHS)
 *   - src/test/lint-fixtures/hero-alignment-signal-overlay-banned.tsx
 *   - src/test/lint-config-resolution.test.ts
 *   - mem://style/global-overlay-stability
 */

describe('lint rule: Global Overlay Stability — heroAlignmentSignal banned in overlays', () => {
  it('reports a no-restricted-imports violation when an *Overlay* file imports from @/lib/heroAlignmentSignal', async () => {
    const eslint = new ESLint({
      cwd: path.resolve(__dirname, '../..'),
      overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
      ignore: false,
      // Strip the inline `eslint-disable-next-line` in the fixture so we
      // can observe the rule firing. The fixture needs the disable so
      // `npm run lint` (which doesn't pass this flag) stays green.
      allowInlineConfig: false,
    });

    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/hero-alignment-signal-overlay-banned.tsx',
    ]);

    const messages = results[0]?.messages ?? [];
    const heroAlignmentBans = messages.filter(
      (m) =>
        m.ruleId === 'no-restricted-imports' &&
        typeof m.message === 'string' &&
        m.message.includes('heroAlignmentSignal'),
    );

    expect(
      heroAlignmentBans.length,
      `Expected at least one no-restricted-imports violation for @/lib/heroAlignmentSignal in the overlay fixture, got ${heroAlignmentBans.length}.\nAll messages:\n${messages.map((m) => `  - [${m.ruleId}] ${m.message}`).join('\n')}`,
    ).toBeGreaterThan(0);
  });
});
