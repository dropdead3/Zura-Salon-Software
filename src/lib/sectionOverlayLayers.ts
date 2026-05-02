/**
 * Section overlay layer utilities.
 *
 * Pure helpers for rendering scrim, grain, and vignette overlays on top of
 * media backgrounds (image/video). Reused by SectionStyleWrapper and the
 * editor preview surfaces — zero React dependencies so they can also be
 * inlined into static HTML / SSR.
 */

/** Build an inline SVG noise data URI. Intensity (0..1) scales opacity. */
export function grainDataUri(intensity: number): string {
  const safe = Math.max(0, Math.min(1, intensity));
  if (safe <= 0) return '';
  // feTurbulence with high baseFrequency = fine-grain monochrome noise.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${safe} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  // Inline data URI — encode the # as %23.
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

/** Radial vignette gradient. Strength (0..1) controls edge darkness. */
export function vignetteGradient(strength: number): string {
  const safe = Math.max(0, Math.min(1, strength));
  if (safe <= 0) return '';
  return `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${safe.toFixed(3)}) 100%)`;
}

/** Resolve overlay background color from mode + custom color. */
export function resolveOverlayBackground(
  mode: 'none' | 'darken' | 'lighten' | 'color' | undefined,
  customColor: string | undefined,
  opacity: number,
): string | undefined {
  if (!mode || mode === 'none' || opacity <= 0) return undefined;
  if (mode === 'darken') return `rgba(0,0,0,${opacity})`;
  if (mode === 'lighten') return `rgba(255,255,255,${opacity})`;
  if (mode === 'color' && customColor) {
    // Convert hex to rgba so the opacity slider modulates it.
    const hex = customColor.replace('#', '');
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    }
    return customColor;
  }
  return undefined;
}
