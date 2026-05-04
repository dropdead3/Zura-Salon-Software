import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression guard: every key in TAB_LABELS must resolve to either a builtin
 * editor (BUILTIN_EDITORS), a synthetic page-level surface ('page-settings'),
 * or a custom-section dynamic key prefix ('custom-…'). Without this, adding
 * a new tab label without wiring its component silently lands operators on
 * the "Pick a section to edit" placeholder — exactly the bug that hid the
 * Navigation Menus editor for weeks.
 */
describe('WebsiteEditorShell tab → editor wiring', () => {
  const file = readFileSync(
    join(process.cwd(), 'src/components/dashboard/website-editor/WebsiteEditorShell.tsx'),
    'utf8',
  );

  function extractKeys(blockName: 'BUILTIN_EDITORS' | 'TAB_LABELS'): string[] {
    const re = new RegExp(`const\\s+${blockName}\\s*:\\s*Record<[^>]+>\\s*=\\s*{([\\s\\S]*?)};`, 'm');
    const m = file.match(re);
    if (!m) throw new Error(`Could not locate ${blockName} block`);
    const body = m[1];
    const keyRe = /(?:^|\n)\s*['"]?([a-zA-Z0-9_-]+)['"]?\s*:/g;
    const keys: string[] = [];
    let km: RegExpExecArray | null;
    while ((km = keyRe.exec(body)) !== null) keys.push(km[1]);
    return keys;
  }

  // Tabs that intentionally have no entry in BUILTIN_EDITORS:
  //  - 'page-settings'  → rendered inline by PageSettingsEditor based on selectedPage
  //  - dynamic 'custom-<id>' keys are synthesized at runtime, not declared in TAB_LABELS
  const SYNTHETIC_TABS = new Set(['page-settings']);

  it('every TAB_LABELS entry maps to a BUILTIN_EDITORS component (or is a known synthetic tab)', () => {
    const labelKeys = extractKeys('TAB_LABELS');
    const editorKeys = new Set(extractKeys('BUILTIN_EDITORS'));

    const orphaned = labelKeys.filter(
      k => !editorKeys.has(k) && !SYNTHETIC_TABS.has(k),
    );

    expect(orphaned).toEqual([]);
  });

  it('navigation tab is wired (regression: was missing for weeks)', () => {
    const editorKeys = new Set(extractKeys('BUILTIN_EDITORS'));
    expect(editorKeys.has('navigation')).toBe(true);
  });
});
