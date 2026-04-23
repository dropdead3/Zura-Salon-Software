import fs from "node:fs";
import path from "node:path";

/**
 * General-purpose primitives for CSS-canon tests. Parses raw CSS source as
 * strings — bypasses jsdom's CSS parser, which trips on modern syntax
 * (`@layer`, Tailwind directives, `color-mix()`, etc.).
 *
 * When writing a new CSS-canon test (e.g., "all `--destructive` usages route
 * through HSL"), import these directly from `@/test/css-rule` rather than
 * through the back-compat shim in `scrollbar-tokens.fixtures.ts`.
 */

/**
 * Extracts the body (the `{...}` contents) of the first rule matching
 * `selector` in `cssSource`. Returns null if no rule matches.
 */
export function extractRuleBody(cssSource: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m");
  const match = cssSource.match(re);
  return match ? match[1] : null;
}

/**
 * Plural variant: returns every rule body matching `selector`. Useful when
 * the same selector appears in multiple `@media` / `@layer` contexts and the
 * test needs to assert against all of them.
 */
export function extractAllRuleBodies(cssSource: string, selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "gm");
  const bodies: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(cssSource)) !== null) {
    bodies.push(match[1]);
  }
  return bodies;
}

/**
 * Reads a CSS file relative to `src/`. Results are cached per-path so
 * multiple assertions in a single test run don't re-read from disk.
 */
const cssCache = new Map<string, string>();
export function readCssFile(relativePath: string): string {
  const cached = cssCache.get(relativePath);
  if (cached !== undefined) return cached;
  const contents = fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
  cssCache.set(relativePath, contents);
  return contents;
}

/** Convenience wrapper for the most common case. */
export function readIndexCss(): string {
  return readCssFile("index.css");
}
