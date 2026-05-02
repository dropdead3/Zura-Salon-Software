/**
 * Dead-export guard for the public-site home component tree.
 *
 * Why this exists:
 *   When the rotator started covering 100% of tenants, the legacy
 *   `HeroSection.tsx` quietly became an unimported, drift-prone component
 *   carrying its own (now divergent) split-headline implementation. Nothing
 *   in CI noticed — the file still type-checked and still passed lint, it
 *   just had zero callers. By the time the divergence was discovered, the
 *   rotator's animations had been silently stripped from the active path.
 *
 *   This test fails when ANY top-level named/default export from
 *   `src/components/home/**` is not imported by at least one other file
 *   in the project. New unused components fail CI immediately, forcing a
 *   conscious "delete it or wire it up" decision instead of letting dead
 *   code accumulate.
 *
 * Scope:
 *   - Limited to `src/components/home/**` (the surface where the original
 *     bug shipped). Easy to widen later — keep the scope tight so the
 *     signal stays high.
 *   - Test files (`.test.ts(x)`), type-only files (`.d.ts`), and barrel-
 *     style index re-exports are skipped.
 *   - Components consumed indirectly (e.g. via `lazy(() => import(...))`)
 *     are matched by their import path, not by their named-export reference,
 *     so dynamic-import callers count as live consumers.
 *
 * Override:
 *   If a component is intentionally exported for a future caller (e.g. a
 *   new section-template variant landing in the next PR), add it to
 *   `INTENTIONALLY_UNREFERENCED` below WITH a one-line rationale + a
 *   revisit trigger. Reviewers will reject overrides without both.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'src');
const TARGET_DIR = resolve(SRC, 'components', 'home');

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
  // `export function Foo`, `export const Foo`, `export class Foo`, `export type Foo`
  for (const m of source.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g,
  )) {
    names.add(m[1]);
  }
  // `export { Foo, Bar as Baz }`
  for (const m of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const ident = part.trim().split(/\s+as\s+/i).pop();
      if (ident) names.add(ident.replace(/[^A-Za-z0-9_$]/g, ''));
    }
  }
  // `export default function Foo` / `export default class Foo`
  for (const m of source.matchAll(/export\s+default\s+(?:function|class)\s+([A-Za-z0-9_$]+)/g)) {
    names.add(m[1]);
  }
  // `export default Foo` (anonymous default still counts as "default")
  if (/export\s+default\s+/.test(source)) names.add('default');
  return [...names];
}

describe('dead-export guard (src/components/home/**)', () => {
  // Build the corpus of all source files outside the target dir + the
  // target dir's siblings (so a hero file imported only by another hero
  // file still counts as "live").
  const allFiles = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.d\.ts$/.test(p));
  const sources = new Map<string, string>();
  for (const f of allFiles) sources.set(f, readFileSync(f, 'utf8'));

  const candidates = walk(TARGET_DIR).filter(isCandidate);

  it('every exported component in src/components/home is imported somewhere', () => {
    const dead: string[] = [];

    for (const file of candidates) {
      const rel = relative(SRC, file).replace(/\\/g, '/');
      if (INTENTIONALLY_UNREFERENCED.has(rel)) continue;

      const exports = extractExportNames(sources.get(file) ?? '');
      if (exports.length === 0) continue; // no exports → nothing to police

      // Match imports either by file basename (covers `from './HeroX'`) OR
      // by `@/components/home/HeroX`. We don't try to fully resolve relative
      // paths — the basename match is sufficient because the home dir uses
      // distinct, non-colliding filenames.
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

    if (dead.length > 0) {
      throw new Error(
        `Dead exports detected in src/components/home/** (no importer found):\n` +
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
});
