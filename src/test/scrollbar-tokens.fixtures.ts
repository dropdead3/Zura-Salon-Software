import fs from "node:fs";
import path from "node:path";

/**
 * Extracts a CSS rule body (the `{...}` portion) for a given selector from
 * a raw CSS source string. We parse the source file directly instead of
 * loading it into jsdom, because jsdom's CSS parser trips on modern syntax
 * (e.g. `@layer`, Tailwind directives, `color-mix()`).
 */
export function extractRuleBody(cssSource: string, selector: string): string | null {
  // Escape regex metacharacters in the selector
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Allow whitespace around selector, match until the matching close brace
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m");
  const match = cssSource.match(re);
  return match ? match[1] : null;
}

let cachedIndexCss: string | null = null;
export function readIndexCss(): string {
  if (cachedIndexCss) return cachedIndexCss;
  cachedIndexCss = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf8");
  return cachedIndexCss;
}
