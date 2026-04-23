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

/**
 * Returns every theme-defining selector in `cssSource`, deduplicated and in
 * source order. Matches the canon's allowlist: `:root`, `.dark`,
 * `.theme-*`, `[data-theme="..."]`. Used by per-theme completeness canons
 * to iterate the actual themes present in the file rather than hardcoding.
 */
export function extractThemeSelectors(cssSource: string): string[] {
  const allowedSelectorRe = /(:root|\.dark|\[data-theme[^\]]*\]|\.theme-[\w-]+)/;
  const selectorRe = /^(\s*)([^\n{}]+)\{\s*$/gm;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = selectorRe.exec(cssSource)) !== null) {
    const sel = m[2].trim();
    const hit = sel.match(allowedSelectorRe);
    if (hit && !seen.has(sel)) {
      seen.add(sel);
      out.push(sel);
    }
  }
  return out;
}

/**
 * Shape-aware Tailwind config resolver. Returns the matched config substring
 * for `token` (block or single line) or `null` if the token isn't routed
 * through the config. Pure — caller passes the config source.
 *
 * Handles four shapes shadcn projects actually use:
 * 1. Flat with foreground:  `destructive: { DEFAULT: ..., foreground: ... }`
 * 2. Flat string:           `border: "hsl(var(--border))"`
 * 3. Nested numbered:       `chart: { "1": "hsl(var(--chart-1))", ... }`
 * 4. Nested named (sidebar): `sidebar: { DEFAULT: "hsl(var(--sidebar-background))", primary: ..., border: ... }`
 *
 * The strategy: for hyphenated tokens (chart-1, sidebar-primary), inspect the
 * family block (chart, sidebar) and confirm the specific `--token` reference
 * appears inside it. For flat tokens, try the block form first, then fall
 * back to the single-line string form.
 */
export function findConfigReference(configSource: string, token: string): string | null {
  // Family-prefixed tokens (chart-1, sidebar-primary, sidebar-background)
  const familyMatch = token.match(/^(chart|sidebar)-/);
  if (familyMatch) {
    const family = familyMatch[1];
    const blockRe = new RegExp(`${family}\\s*:\\s*\\{[^}]*\\}`);
    const block = configSource.match(blockRe)?.[0];
    if (block && block.includes(`hsl(var(--${token}))`)) return block;
    return null;
  }

  // Flat block (destructive, primary, muted, card, popover, ...)
  const blockRe = new RegExp(`(?:^|\\s)${token}\\s*:\\s*\\{[^}]*\\}`);
  const block = configSource.match(blockRe)?.[0];
  if (block) return block;

  // Flat string (border, input, ring, background, foreground)
  const lineRe = new RegExp(`(?:^|\\s)${token}\\s*:\\s*"hsl\\(var\\(--${token}\\)\\)"`);
  const line = configSource.match(lineRe)?.[0];
  if (line) return line;

  return null;
}
