/**
 * Regression guard: any <MediaUploadInput> whose `pathPrefix` references the
 * hero surface (e.g. "hero", "hero/slides") MUST also pass
 * `qualityProfile="hero"`. Otherwise the upload silently falls back to the
 * lossy "standard" profile and we ship pixelated hero imagery.
 *
 * The bug this prevents: a new hero editor is added with
 *   <MediaUploadInput pathPrefix="hero/foo" ... />
 * and forgets the profile flag, downgrading uploads from the 3200px
 * near-lossless WebP master to the standard ~1600px lossy variant.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', 'test', '__snapshots__', 'lint-fixtures']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

// Match the opening tag of <MediaUploadInput …> across newlines, up to the
// first '>' that is not inside an attribute. JSX self-close (`/>`) is fine.
const TAG_RE = /<MediaUploadInput\b([^>]*?)\/?>/gs;

interface Offender {
  file: string;
  line: number;
  pathPrefix: string;
  snippet: string;
}

describe('hero MediaUploadInput callsites', () => {
  it('every hero pathPrefix passes qualityProfile="hero"', () => {
    const files = walk(SRC_ROOT).filter(
      (f) => !f.endsWith('MediaUploadInput.tsx'),
    );

    const offenders: Offender[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('MediaUploadInput')) continue;

      for (const match of src.matchAll(TAG_RE)) {
        const tagBody = match[1] ?? '';

        // Extract pathPrefix value. Supports "literal" and {`template`} forms
        // (and {expression} — we only flag when the expression text contains
        // the substring 'hero', conservative but catches realistic regressions).
        const literal = tagBody.match(/pathPrefix\s*=\s*"([^"]*)"/);
        const expr = tagBody.match(/pathPrefix\s*=\s*\{([^}]*)\}/);
        const pathPrefixValue = literal?.[1] ?? expr?.[1] ?? '';

        if (!pathPrefixValue) continue;

        const isHero = /(^|[^a-zA-Z])hero([^a-zA-Z]|$|\/)/i.test(
          pathPrefixValue,
        );
        if (!isHero) continue;

        const hasHeroProfile = /qualityProfile\s*=\s*"hero"/.test(tagBody);
        if (hasHeroProfile) continue;

        const lineNo = src.slice(0, match.index ?? 0).split('\n').length;
        offenders.push({
          file: relative(PROJECT_ROOT, file),
          line: lineNo,
          pathPrefix: pathPrefixValue,
          snippet: match[0].replace(/\s+/g, ' ').slice(0, 200),
        });
      }
    }

    if (offenders.length > 0) {
      const msg = offenders
        .map(
          (o) =>
            `  • ${o.file}:${o.line} — pathPrefix="${o.pathPrefix}" missing qualityProfile="hero"\n    ${o.snippet}`,
        )
        .join('\n');
      throw new Error(
        `MediaUploadInput hero regression — every hero pathPrefix must pass qualityProfile="hero":\n${msg}`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
