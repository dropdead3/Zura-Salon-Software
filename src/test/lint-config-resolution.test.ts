// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Meta-test for `eslint.config.js` flat-config resolution.
 *
 * Why this test exists:
 *   In flat config, when multiple config blocks both match a file and
 *   both define the same rule (here, `no-restricted-syntax`), ESLint
 *   REPLACES the rule's options entirely — it does NOT merge the
 *   options arrays. The later matching block wins.
 *
 *   This is the silent-failure mode that allowed the Site Settings
 *   Event Ownership rule to look enforced (lint passed, smoke test
 *   appeared green at the file level) while actually being dropped
 *   from the fixture file's resolved config because the rule's own
 *   `ignores` block excluded the fixture.
 *
 *   This meta-test inspects the *resolved* config (`calculateConfigForFile`)
 *   for representative source files and asserts that each doctrine
 *   selector survives. If any selector goes missing, the canon is
 *   silently broken and this test fails immediately — even before any
 *   lint output is produced.
 *
 * If this test fails:
 *   1. Identify which config block in eslint.config.js shadows the
 *      missing selector.
 *   2. Either narrow that block's `files`/`ignores` so it stops
 *      matching the asserted file, OR re-include the missing selector
 *      in that block's options array.
 *   3. NEVER add a `// eslint-disable` to silence this test — the
 *      whole point is that flat-config replacement is invisible
 *      without an explicit assertion.
 */

interface RestrictedSyntaxOption {
  selector?: string;
  message?: string;
}

const eslint = new ESLint({
  cwd: path.resolve(__dirname, '../..'),
  overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
  ignore: false,
});

async function getRestrictedSyntaxSelectors(filePath: string): Promise<string[]> {
  const config = (await eslint.calculateConfigForFile(filePath)) as {
    rules?: Record<string, unknown>;
  };
  const rule = config.rules?.['no-restricted-syntax'];
  if (!Array.isArray(rule)) return [];
  // First element is severity; remainder are option objects.
  return rule
    .slice(1)
    .filter((opt): opt is RestrictedSyntaxOption => typeof opt === 'object' && opt !== null)
    .map((opt) => opt.selector ?? '')
    .filter(Boolean);
}

const LOADER2_SELECTOR_FRAGMENT = "openingElement.name.name='Loader2'";
const UNSAVED_CHANGES_SELECTOR_FRAGMENT = "openingElement.name.name='AlertDialogTitle'";
const SITE_SETTINGS_SELECTOR_FRAGMENT = 'site-settings-draft-write';
const DIRTY_STATE_SELECTOR_FRAGMENT = "callee.property.name='stringify'";

describe('eslint.config.js: flat-config resolution meta-test', () => {
  it('keeps the Loader2 doctrine selector on a representative source file', async () => {
    const selectors = await getRestrictedSyntaxSelectors('src/App.tsx');
    expect(
      selectors.some((s) => s.includes(LOADER2_SELECTOR_FRAGMENT)),
      `Loader2 governance selector missing from resolved config for src/App.tsx.\nResolved selectors:\n${selectors.join('\n')}`,
    ).toBe(true);
  });

  it('keeps the UnsavedChangesDialog doctrine selector on a representative source file', async () => {
    const selectors = await getRestrictedSyntaxSelectors('src/App.tsx');
    expect(
      selectors.some((s) => s.includes(UNSAVED_CHANGES_SELECTOR_FRAGMENT)),
      `UnsavedChangesDialog selector missing from resolved config for src/App.tsx.\nResolved selectors:\n${selectors.join('\n')}`,
    ).toBe(true);
  });

  it('keeps the Site Settings Event Ownership selector on the banned fixture', async () => {
    // The fixture is the file the smoke test lints; if the doctrine
    // selector is missing here, the smoke test will silently report
    // 0 violations and the canon is unenforced.
    const selectors = await getRestrictedSyntaxSelectors(
      'src/test/lint-fixtures/site-settings-event-banned.tsx',
    );
    expect(
      selectors.some((s) => s.includes(SITE_SETTINGS_SELECTOR_FRAGMENT)),
      `Site Settings Event Ownership selector missing from resolved config for the banned fixture.\nThis usually means the rule's own \`ignores\` block excluded the fixture path, OR a later config block replaced \`no-restricted-syntax\` without re-including this selector.\nResolved selectors:\n${selectors.join('\n')}`,
    ).toBe(true);
  });

  it('applies the Site Settings rule to the owning module (suppression is per-line)', async () => {
    // The owning module is no longer excluded via `ignores`; instead each
    // dispatch site uses `// eslint-disable-next-line no-restricted-syntax`.
    // This keeps the unrelated Loader2 + UnsavedChanges selectors active
    // on the file (flat-config replacement would otherwise drop them).
    const selectors = await getRestrictedSyntaxSelectors('src/lib/siteSettingsDraft.ts');
    expect(
      selectors.some((s) => s.includes(SITE_SETTINGS_SELECTOR_FRAGMENT)),
      'Site Settings rule should be active on src/lib/siteSettingsDraft.ts; the dispatch sites suppress it with inline eslint-disable comments.',
    ).toBe(true);
  });

  it('keeps the Dirty-State Compare doctrine selector on a representative source file', async () => {
    const selectors = await getRestrictedSyntaxSelectors('src/App.tsx');
    expect(
      selectors.some((s) => s.includes(DIRTY_STATE_SELECTOR_FRAGMENT)),
      `Dirty-State Compare selector missing from resolved config for src/App.tsx.\nResolved selectors:\n${selectors.join('\n')}`,
    ).toBe(true);
  });
});
