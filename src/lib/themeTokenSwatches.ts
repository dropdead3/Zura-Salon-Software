/**
 * themeTokenSwatches
 *
 * Reads the active website theme's CSS variables off `<html>` and returns a
 * stable list of `{ key, label, hex }` swatches. Used by the editor's
 * theme-aware color picker so operators can match "Primary" / "Accent" /
 * "Foreground" without knowing the raw hex.
 *
 * The values are HSL CSS variables (e.g. `260 25% 95%`), so we resolve them
 * to a 6-digit hex via a hidden DOM element + getComputedStyle. This lets
 * the swatches match-by-hex against operator-saved hex values.
 *
 * A MutationObserver on `<html>`'s class / data-theme attribute lets the
 * picker repaint when the operator swaps website themes elsewhere in the
 * editor without a full reload.
 */

export interface ThemeTokenSwatch {
  /** Stable identifier — used by the picker for the active-state ring. */
  key: string;
  /** Operator-facing label. */
  label: string;
  /** Hint used as the `title` tooltip on the chip. */
  hint: string;
  /** Resolved 6-digit hex (e.g. `#a49584`) or '' if resolution failed. */
  hex: string;
  /** The raw CSS expression — useful for inline `backgroundColor` styles. */
  cssVar: string;
}

interface TokenDefinition {
  key: string;
  label: string;
  cssVarName: string;
  hint: string;
}

const TOKENS: TokenDefinition[] = [
  { key: 'primary',    label: 'Primary',    cssVarName: '--primary',    hint: 'Primary brand color — used for the See Offer chip & primary CTAs' },
  { key: 'accent',     label: 'Accent',     cssVarName: '--accent',     hint: 'Accent surface — soft tint of the brand' },
  { key: 'secondary',  label: 'Secondary',  cssVarName: '--secondary',  hint: 'Secondary surface — neutral pairing' },
  { key: 'muted',      label: 'Muted',      cssVarName: '--muted',      hint: 'Muted surface — subtle separation' },
  { key: 'foreground', label: 'Foreground', cssVarName: '--foreground', hint: 'Near-black text color' },
  { key: 'background', label: 'Background', cssVarName: '--background', hint: 'Page background — calmest surface' },
  { key: 'card',       label: 'Card',       cssVarName: '--card',       hint: 'Card surface — slight contrast above background' },
  { key: 'oat',        label: 'Oat',        cssVarName: '--oat',        hint: 'Warm taupe — editorial calm' },
];

/** Convert "hsl(260 25% 95%)" or "rgb(...)" computed strings to "#rrggbb". */
function computedColorToHex(input: string): string {
  if (!input) return '';
  if (typeof document === 'undefined') return '';
  // Use a sandbox div to let the browser normalize whatever color string into rgb().
  const el = document.createElement('div');
  el.style.color = input;
  el.style.display = 'none';
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color; // e.g. "rgb(164, 149, 132)"
  document.body.removeChild(el);
  const m = rgb.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/);
  if (!m) return '';
  const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

export function readThemeTokenSwatches(): ThemeTokenSwatch[] {
  if (typeof document === 'undefined') {
    return TOKENS.map((t) => ({
      key: t.key,
      label: t.label,
      hint: t.hint,
      hex: '',
      cssVar: `hsl(var(${t.cssVarName}))`,
    }));
  }
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return TOKENS.map((t) => {
    const raw = styles.getPropertyValue(t.cssVarName).trim();
    // CSS vars in this codebase store HSL triplets without the `hsl(...)` wrapper.
    const colorString = raw.startsWith('#') || raw.startsWith('rgb')
      ? raw
      : raw
        ? `hsl(${raw})`
        : '';
    return {
      key: t.key,
      label: t.label,
      hint: t.hint,
      hex: colorString ? computedColorToHex(colorString) : '',
      cssVar: `hsl(var(${t.cssVarName}))`,
    };
  });
}

/**
 * Subscribe to theme swaps on `<html>`. Calls `cb` whenever the class or
 * `data-theme` attribute changes — i.e. when the operator picks a new
 * website theme in Site Design.
 */
export function subscribeToThemeChanges(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const obs = new MutationObserver(() => cb());
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style'],
  });
  return () => obs.disconnect();
}

/** Best-effort hex normalization (lowercase, 6-digit form) for match comparisons. */
export function normalizeHex(input: string | undefined | null): string {
  if (!input) return '';
  const v = input.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    // Expand #abc → #aabbcc
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  // Resolve named/hsl/rgb via the browser.
  return computedColorToHex(v);
}
