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
  function collectCallsites() {
    const files = walk(SRC_ROOT).filter((f) => !f.endsWith('MediaUploadInput.tsx'));
    const callsites: Array<{
      file: string;
      line: number;
      pathPrefix: string;
      hasHeroProfile: boolean;
      snippet: string;
    }> = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('MediaUploadInput')) continue;

      for (const match of src.matchAll(TAG_RE)) {
        const tagBody = match[1] ?? '';

        const literal = tagBody.match(/pathPrefix\s*=\s*"([^"]*)"/);
        const expr = tagBody.match(/pathPrefix\s*=\s*\{([^}]*)\}/);
        const pathPrefixValue = literal?.[1] ?? expr?.[1] ?? '';

        const hasHeroProfile = /qualityProfile\s*=\s*"hero"/.test(tagBody);
        const lineNo = src.slice(0, match.index ?? 0).split('\n').length;

        callsites.push({
          file: relative(PROJECT_ROOT, file),
          line: lineNo,
          pathPrefix: pathPrefixValue,
          hasHeroProfile,
          snippet: match[0].replace(/\s+/g, ' ').slice(0, 200),
        });
      }
    }

    return callsites;
  }

  // Match "hero" as a path segment: start-of-string OR a non-letter boundary,
  // then "hero", then end / non-letter / "/". Avoids false positives on
  // "heroes", "antiheroic", etc.
  const HERO_SEGMENT = /(^|[^a-zA-Z])hero([^a-zA-Z]|$|\/)/i;

  it('every hero pathPrefix passes qualityProfile="hero"', () => {
    const offenders = collectCallsites().filter(
      (c) => c.pathPrefix && HERO_SEGMENT.test(c.pathPrefix) && !c.hasHeroProfile,
    );

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

  // Inverse guard: catches copy-paste bugs where a non-hero editor inherited
  // `qualityProfile="hero"` from a hero template. Wastes Storage on 3200px
  // masters for thumbnail-sized surfaces and skips the lossy re-encode that
  // those surfaces actually want.
  it('every qualityProfile="hero" sits on a hero pathPrefix', () => {
    const offenders = collectCallsites().filter(
      (c) => c.hasHeroProfile && c.pathPrefix && !HERO_SEGMENT.test(c.pathPrefix),
    );

    if (offenders.length > 0) {
      const msg = offenders
        .map(
          (o) =>
            `  • ${o.file}:${o.line} — qualityProfile="hero" on non-hero pathPrefix="${o.pathPrefix}" (likely copy-paste from a hero editor)\n    ${o.snippet}`,
        )
        .join('\n');
      throw new Error(
        `MediaUploadInput inverse regression — qualityProfile="hero" must only appear on hero pathPrefix callsites:\n${msg}`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
