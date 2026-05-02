/**
 * themeTokenSwatches
 *
 * Reads a website theme's CSS variables and returns a stable list of
 * `{ key, label, hex }` swatches. Used by the editor's theme-aware color
 * picker so operators can match "Primary" / "Accent" / "Foreground" without
 * knowing the raw hex.
 *
 * Why we accept a `themeClass` instead of reading `<html>` directly:
 *
 * The website editor lives inside the dashboard, whose `<html>` carries the
 * operator's *dashboard* theme (e.g. `theme-zura`). The public site —
 * including the editor's preview iframe — uses a separate, operator-pickable
 * site theme (default `theme-cream-lux`). Resolving from `<html>` therefore
 * surfaces the wrong swatches in the picker (April 2026 "Zura colors are
 * showing in the Cream Lux site editor" report).
 *
 * Fix: resolve via a hidden sandbox element that gets the website theme
 * class applied. The CSS rules in `index.css` use `.theme-<name>` selectors
 * so a class on any ancestor is sufficient.
 *
 * The values are HSL CSS variables (e.g. `260 25% 95%`), so we resolve them
 * to a 6-digit hex via the sandbox + getComputedStyle. This lets the
 * swatches match-by-hex against operator-saved hex values.
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

/**
 * Resolve theme swatches.
 *
 * @param themeClass Optional theme class (e.g. `theme-cream-lux`) to scope
 *   resolution to. When omitted, falls back to whatever is on `<html>` —
 *   keeps back-compat for callers outside the website editor.
 */
export function readThemeTokenSwatches(themeClass?: string | null): ThemeTokenSwatch[] {
  if (typeof document === 'undefined') {
    return TOKENS.map((t) => ({
      key: t.key,
      label: t.label,
      hint: t.hint,
      hex: '',
      cssVar: `hsl(var(${t.cssVarName}))`,
    }));
  }

  // Build a sandbox element so we can resolve CSS vars under an arbitrary
  // theme class without mutating the dashboard's <html>. Light mode is
  // forced because the public site renders light-only (Layout.tsx removes
  // `dark` before applying the website theme).
  const sandbox = document.createElement('div');
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.style.position = 'absolute';
  sandbox.style.visibility = 'hidden';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.width = '0';
  sandbox.style.height = '0';
  if (themeClass) {
    sandbox.className = themeClass;
  } else {
    // No override → mirror <html>'s current theme classes so behavior
    // matches the legacy zero-arg path.
    sandbox.className = document.documentElement.className;
  }
  document.body.appendChild(sandbox);

  try {
    const styles = getComputedStyle(sandbox);
    return TOKENS.map((t) => {
      const raw = styles.getPropertyValue(t.cssVarName).trim();
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
  } finally {
    document.body.removeChild(sandbox);
  }
}

/**
 * Subscribe to theme swaps on `<html>`. Calls `cb` whenever the class or
 * `data-theme` attribute changes — i.e. when the operator picks a new
 * dashboard theme. The website editor passes its own themeClass and so
 * doesn't strictly need this, but it remains useful for back-compat callers.
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
