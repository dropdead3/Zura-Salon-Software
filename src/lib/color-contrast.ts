/**
 * Color Contrast Utilities
 *
 * Picks a readable foreground (black or white) for an arbitrary accent color
 * so popup/banner CTAs stay legible regardless of the operator's theme or
 * custom hex picks. Without this, a soft taupe accent paired with the
 * cream-lux `--primary-foreground` (off-white) becomes unreadable.
 *
 * Supports `#rrggbb`, `#rgb`, and `hsl(...)` strings. CSS variable references
 * (`hsl(var(--primary))`) cannot be parsed at runtime — for those we return
 * `null` and let the caller fall back to the theme's `--primary-foreground`.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const trimmed = hex.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(trimmed);
  if (short) {
    return [
      parseInt(short[1] + short[1], 16),
      parseInt(short[2] + short[2], 16),
      parseInt(short[3] + short[3], 16),
    ];
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(trimmed);
  if (long) {
    return [parseInt(long[1], 16), parseInt(long[2], 16), parseInt(long[3], 16)];
  }
  return null;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = lN - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

function parseHsl(value: string): [number, number, number] | null {
  // Matches "hsl(210 40% 50%)", "hsl(210, 40%, 50%)", "hsla(...)" — but NOT
  // "hsl(var(--primary))" which has no numeric components.
  const m = /hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%?\s*[, ]\s*([\d.]+)%?/i.exec(value);
  if (!m) return null;
  return hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
}

/**
 * Returns 'light' (use white text) or 'dark' (use black text) for a given
 * background color. Returns `null` when the color can't be parsed (e.g.
 * `hsl(var(--primary))`) — caller should fall back to theme tokens.
 */
export function pickReadableForeground(color: string | undefined | null): 'light' | 'dark' | null {
  if (!color) return null;
  const rgb = color.startsWith('#') ? hexToRgb(color) : parseHsl(color);
  if (!rgb) return null;
  const luminance = relativeLuminanceFromRgb(rgb);
  return luminance > 0.5 ? 'dark' : 'light';
}

/** Compute relative luminance per WCAG 2.x given an sRGB triplet (0-255). */
function relativeLuminanceFromRgb([r, g, b]: [number, number, number]): number {
  const [rL, gL, bL] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

/** Parse any supported color string to an sRGB triplet, or null if unparseable. */
function parseColor(color: string | undefined | null): [number, number, number] | null {
  if (!color) return null;
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) return hexToRgb(trimmed);
  return parseHsl(trimmed);
}

/**
 * WCAG 2.x contrast ratio between two colors. Returns `null` when either
 * color can't be parsed (e.g. CSS-var refs). Range: 1 (no contrast) → 21
 * (black on white). 3:1 is the floor for "non-text large UI" per WCAG AA.
 */
export function contrastRatio(
  a: string | undefined | null,
  b: string | undefined | null,
): number | null {
  const aRgb = parseColor(a);
  const bRgb = parseColor(b);
  if (!aRgb || !bRgb) return null;
  const aL = relativeLuminanceFromRgb(aRgb);
  const bL = relativeLuminanceFromRgb(bRgb);
  const lighter = Math.max(aL, bL);
  const darker = Math.min(aL, bL);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Best contrast ratio achievable when placing white OR black text on the
 * given background. Returns `null` when the color can't be parsed. Useful
 * for "is this background usable for *any* legible text?" checks.
 */
export function bestTextContrast(background: string | undefined | null): number | null {
  const white = contrastRatio(background, '#ffffff');
  const black = contrastRatio(background, '#111111');
  if (white === null || black === null) return null;
  return Math.max(white, black);
}

/**
 * Returns a CSS color string suitable for foreground text on the given accent.
 * Falls back to `cssFallback` (typically `'hsl(var(--primary-foreground))'`)
 * when the accent can't be parsed at runtime.
 */
export function readableForegroundFor(
  accent: string | undefined | null,
  cssFallback = 'hsl(var(--primary-foreground))',
): string {
  const tone = pickReadableForeground(accent);
  if (tone === 'dark') return '#111111';
  if (tone === 'light') return '#ffffff';
  return cssFallback;
}
