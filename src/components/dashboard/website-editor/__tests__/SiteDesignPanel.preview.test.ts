/**
 * Regression coverage for the May 2026 "Site Design sliders don't live-preview"
 * report.
 *
 * The contract: SiteDesignPanel dispatches `editor-design-preview` CustomEvents
 * with payload `{ detail: { overrides } }` (NOT `detail: overrides`).
 * LivePreviewPanel reads `detail?.overrides` and forwards it as the
 * PREVIEW_DESIGN_OVERRIDES postMessage. If the wrapper is dropped, the iframe
 * receives `overrides: undefined` and DesignOverridesApplier silently no-ops.
 *
 * We assert against the **source file** rather than rendering the panel —
 * SiteDesignPanel pulls in ~20 hooks (auth, org, site_settings, themes…) that
 * make a render-test brittle. The dispatch contract is a one-line surface,
 * so a textual assertion is the cheapest way to lock it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PANEL_PATH = resolve(__dirname, '../SiteDesignPanel.tsx');
const BRIDGE_PATH = resolve(
  __dirname,
  '../../../../components/dashboard/website-editor/LivePreviewPanel.tsx',
);

describe('Site Design live-preview event contract', () => {
  it('SiteDesignPanel wraps overrides under detail.overrides', () => {
    const src = readFileSync(PANEL_PATH, 'utf8');
    // Must dispatch with the wrapped shape `detail: { overrides }`.
    expect(src).toMatch(
      /new CustomEvent\(\s*['"]editor-design-preview['"]\s*,\s*\{\s*detail:\s*\{\s*overrides\s*\}\s*\}/,
    );
    // Must NOT dispatch the bare-overrides shape that broke live-preview.
    expect(src).not.toMatch(
      /new CustomEvent\(\s*['"]editor-design-preview['"]\s*,\s*\{\s*detail:\s*overrides\s*\}/,
    );
  });

  it('LivePreviewPanel reads detail.overrides (matching contract)', () => {
    const src = readFileSync(BRIDGE_PATH, 'utf8');
    expect(src).toMatch(/\.detail\?\.overrides/);
  });
});
