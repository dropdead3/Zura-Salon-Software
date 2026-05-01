/**
 * Meta-test: every editor under `src/components/dashboard/website-editor/`
 * whose name ends in `*Editor.tsx` MUST wire dirty-state through one of the
 * canonical paths.
 *
 * Why this exists:
 *   The Save bar in the Website Editor shell only activates when an editor
 *   dispatches `editor-dirty-state` (via `useDirtyState` or, for hand-rolled
 *   editors, `useEditorDirtyState`). Forgetting that wiring ships a *dead*
 *   Save button: toggling controls visibly does nothing because the shell
 *   never learns the form went dirty. We hit exactly that bug in the
 *   StickyFooterBarEditor, so this guard prevents it from happening again
 *   silently in any newly-authored editor.
 *
 * Allowed wiring (any one is sufficient):
 *   - `useDirtyState(local, server)`   — the canonical hook (preferred)
 *   - `useEditorDirtyState(isDirty)`   — lower-level primitive (legacy ok)
 *   - `useSectionEditor(...)`          — the bundled scaffold (recommended)
 *
 * Allowlist (`EDITOR_DIRTY_WIRING_ALLOWLIST`):
 *   Editors that legitimately have no editable state (read-only viewers,
 *   composition wrappers that delegate fully to children) can be added
 *   here with a one-line justification. Keep it tiny — every entry is a
 *   future trap waiting to happen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const EDITOR_DIR = join(
  process.cwd(),
  'src/components/dashboard/website-editor',
);

/**
 * Editors permitted to skip the dirty-wiring check. Each entry MUST include
 * a justification so future maintainers don't blanket-add files to silence
 * the test.
 */
const EDITOR_DIRTY_WIRING_ALLOWLIST: Record<string, string> = {
  // Pure composition wrapper — delegates all stateful editing to children
  // (Hero{Background,Scrim,TextColors,Slides}Editor) which each carry
  // their own useDirtyState wiring. The shell editor itself owns no form
  // state to track dirty-ness on.
  'HeroEditor.tsx': 'composition-only; children own dirty state',
  // Pure layout shell around child sub-editors that each wire their own
  // useDirtyState. Holds no editable form state of its own.
  'SectionDisplayEditor.tsx': 'layout shell; sub-editors own dirty state',
};

const ALLOWED_HOOK_PATTERNS = [
  /\buseDirtyState\s*\(/,
  /\buseEditorDirtyState\s*\(/,
  /\buseSectionEditor\s*\(/,
];

function listEditorFiles(): string[] {
  return readdirSync(EDITOR_DIR)
    .filter((f) => /Editor\.tsx$/.test(f))
    .sort();
}

describe('website-editor dirty-wiring meta-guard', () => {
  it('every *Editor.tsx wires dirty state through a canonical hook', () => {
    const offenders: string[] = [];

    for (const file of listEditorFiles()) {
      if (file in EDITOR_DIRTY_WIRING_ALLOWLIST) continue;

      const source = readFileSync(join(EDITOR_DIR, file), 'utf8');
      const wired = ALLOWED_HOOK_PATTERNS.some((re) => re.test(source));

      if (!wired) {
        offenders.push(file);
      }
    }

    if (offenders.length > 0) {
      // Surface a copy-pasteable fix hint in the failure message.
      const hint = offenders
        .map(
          (f) =>
            `  - ${f}: add \`useDirtyState(localConfig, data)\` after your useState/useEffect ` +
            `wiring (see HeroEditor.tsx for the canonical pattern), or migrate to ` +
            `\`useSectionEditor(configHook, scope)\`.`,
        )
        .join('\n');

      throw new Error(
        `Editors missing dirty-state wiring (Save bar will be dead):\n${hint}\n\n` +
          `If an editor genuinely owns no editable state (composition-only), add it ` +
          `to EDITOR_DIRTY_WIRING_ALLOWLIST in this test with a one-line justification.`,
      );
    }

    expect(offenders).toEqual([]);
  });

  it('allowlist entries still exist on disk (prevents stale exemptions)', () => {
    const onDisk = new Set(listEditorFiles());
    const stale = Object.keys(EDITOR_DIRTY_WIRING_ALLOWLIST).filter(
      (f) => !onDisk.has(f),
    );
    expect(stale).toEqual([]);
  });
});
