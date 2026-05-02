/**
 * Dead-export guard for the public-site component trees.
 *
 * Why this exists:
 *   When the rotator started covering 100% of tenants, the legacy
 *   `HeroSection.tsx` quietly became an unimported, drift-prone component
 *   carrying its own (now divergent) split-headline implementation. Nothing
 *   in CI noticed — the file still type-checked and still passed lint, it
 *   just had zero callers. By the time the divergence was discovered, the
 *   rotator's animations had been silently stripped from the active path.
 *
 *   This test fails when ANY top-level named/default export from the
 *   covered directories is not imported by at least one other file in the
 *   project. New unused components fail CI immediately, forcing a
 *   conscious "delete it or wire it up" decision instead of letting dead
 *   code accumulate.
 *
 * Scope:
 *   - `src/components/home/**` (where the original bug shipped).
 *   - `src/components/layout/**` (marketing nav + sticky widget surfaces;
 *     historically accumulates unused sticky/header variants alongside
 *     the live ones — same divergence pattern as `HeroSection`).
 *   - Test files (`.test.ts(x)`), type-only files (`.d.ts`), and barrel-
 *     style index re-exports are skipped.
 *   - Components consumed indirectly (e.g. via `lazy(() => import(...))`)
 *     are matched by their import path, not by their named-export reference,
 *     so dynamic-import callers count as live consumers.
 *
 * Override:
 *   If a component is intentionally exported for a future caller (e.g. a
 *   new section-template variant landing in the next PR), add its repo-
 *   relative path (under `src/`) to `INTENTIONALLY_UNREFERENCED` below
 *   WITH a one-line rationale + a revisit trigger. Reviewers will reject
 *   overrides without both.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'src');

const TARGET_DIRS = [
  resolve(SRC, 'components', 'home'),
  resolve(SRC, 'components', 'layout'),
];

/**
 * Files whose exports are allowed to be unimported. Keep this list small
 * and well-justified — every entry is potential drift bait.
 */
const INTENTIONALLY_UNREFERENCED = new Set<string>([
  // Pre-existing dead components found when the guard first ran (May 2026).
  // Kept in the override list to land the guard non-disruptively; either
  // wire them up to the marketing site or delete them in a follow-up PR.
  // Revisit trigger: next time a hero/marketing copy refresh ships — if
  // these are still unreferenced, delete the files and remove these entries.
  'components/home/ApplicationFormDialog.tsx',
  'components/home/FounderWelcome.tsx',

  // Pre-existing dead components surfaced when the guard widened to
  // src/components/layout (May 2026). Same non-disruptive landing pattern.
  // Revisit trigger: next marketing layout / sticky-widget refresh — if
  // still unreferenced, delete the files and remove these entries.
  'components/layout/PageHeader.tsx',
  'components/layout/StickyPhoneSidebar.tsx',
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function isCandidate(path: string): boolean {
  if (!/\.tsx?$/.test(path)) return false;
  if (/\.d\.ts$/.test(path)) return false;
  if (/\.test\.tsx?$/.test(path)) return false;
  // Barrel files re-export only — analyzing them would create false negatives.
  if (/\/index\.tsx?$/.test(path)) return false;
  return true;
}

function extractExportNames(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g,
  )) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const ident = part.trim().split(/\s+as\s+/i).pop();
      if (ident) names.add(ident.replace(/[^A-Za-z0-9_$]/g, ''));
    }
  }
  for (const m of source.matchAll(/export\s+default\s+(?:function|class)\s+([A-Za-z0-9_$]+)/g)) {
    names.add(m[1]);
  }
  if (/export\s+default\s+/.test(source)) names.add('default');
  return [...names];
}

const allFiles = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.d\.ts$/.test(p));
const sources = new Map<string, string>();
for (const f of allFiles) sources.set(f, readFileSync(f, 'utf8'));

function findDead(targetDir: string): string[] {
  const dead: string[] = [];
  const candidates = walk(targetDir).filter(isCandidate);

  for (const file of candidates) {
    const rel = relative(SRC, file).replace(/\\/g, '/');
    if (INTENTIONALLY_UNREFERENCED.has(rel)) continue;

    const exports = extractExportNames(sources.get(file) ?? '');
    if (exports.length === 0) continue;

    const basename = file.split('/').pop()!.replace(/\.tsx?$/, '');
    const importPattern = new RegExp(
      `(?:from\\s+['"][^'"]*\\b${basename}['"])|(?:import\\(\\s*['"][^'"]*\\b${basename}['"])`,
    );

    let referenced = false;
    for (const [otherFile, src] of sources) {
      if (otherFile === file) continue;
      if (importPattern.test(src)) {
        referenced = true;
        break;
      }
    }

    if (!referenced) dead.push(rel);
  }

  return dead;
}

describe('dead-export guard (public-site component trees)', () => {
  for (const targetDir of TARGET_DIRS) {
    const label = relative(SRC, targetDir).replace(/\\/g, '/');

    it(`every exported component in src/${label} is imported somewhere`, () => {
      const dead = findDead(targetDir);

      if (dead.length > 0) {
        throw new Error(
          `Dead exports detected in src/${label}/** (no importer found):\n` +
            dead.map((d) => `  - ${d}`).join('\n') +
            `\n\nFix options:\n` +
            `  1. Delete the file if it's no longer used.\n` +
            `  2. Wire up the new caller in the same PR.\n` +
            `  3. Add the path to INTENTIONALLY_UNREFERENCED in this test\n` +
            `     WITH a one-line rationale and revisit trigger.\n`,
        );
      }

      expect(dead).toEqual([]);
    });
  }
});
