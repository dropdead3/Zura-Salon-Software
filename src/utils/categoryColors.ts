// Special gradient styles collection - shared across the app
export const SPECIAL_GRADIENTS: Record<string, {
  id: string;
  name: string;
  background: string;
  textColor: string;
  glassStroke: string;
}> = {
  'teal-lime': {
    id: 'teal-lime',
    name: 'Teal Lime',
    background: 'linear-gradient(135deg, #43c6ac 0%, #f8ffae 100%)',
    textColor: '#1a3a32',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(67,198,172,0.3) 100%)',
  },
  'rose-gold': {
    id: 'rose-gold',
    name: 'Rose Gold',
    background: 'linear-gradient(135deg, #f5af89 0%, #f093a7 50%, #d4a5a5 100%)',
    textColor: '#4a2c2a',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(240,147,167,0.3) 100%)',
  },
  'ocean-blue': {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    background: 'linear-gradient(135deg, #667eea 0%, #64b5f6 50%, #4dd0e1 100%)',
    textColor: '#1a2a4a',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(100,181,246,0.3) 100%)',
  },
  'lavender': {
    id: 'lavender',
    name: 'Lavender Dream',
    background: 'linear-gradient(135deg, #e0c3fc 0%, #c084fc 50%, #a78bfa 100%)',
    textColor: '#3d2a5c',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(192,132,252,0.3) 100%)',
  },
  'champagne': {
    id: 'champagne',
    name: 'Champagne',
    background: 'linear-gradient(135deg, #e8e4d9 0%, #c9c2b5 100%)',
    textColor: '#4a453d',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(201,194,181,0.35) 100%)',
  },
};

// Theme-aligned gradients — one per system color theme.
// Each pulls from the theme's primary + accent so the category visually echoes
// whichever dashboard theme is active. Stored as `gradient:theme-{id}` markers.
export const THEME_GRADIENTS: Record<string, {
  id: string;
  name: string;
  background: string;
  textColor: string;
  glassStroke: string;
}> = {
  'theme-zura': {
    id: 'theme-zura',
    name: 'Zura',
    background: 'linear-gradient(135deg, hsl(270 70% 55%) 0%, hsl(260 75% 35%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(139,92,246,0.3) 100%)',
  },
  'theme-cream-lux': {
    id: 'theme-cream-lux',
    name: 'Cream Lux',
    background: 'linear-gradient(135deg, hsl(35 18% 82%) 0%, hsl(30 16% 62%) 100%)',
    textColor: '#3a342c',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(168,161,149,0.3) 100%)',
  },
  'theme-neon': {
    id: 'theme-neon',
    name: 'Neon',
    background: 'linear-gradient(135deg, hsl(330 95% 60%) 0%, hsl(320 90% 40%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,45,138,0.3) 100%)',
  },
  'theme-rosewood': {
    id: 'theme-rosewood',
    name: 'Rosewood',
    background: 'linear-gradient(135deg, hsl(345 60% 58%) 0%, hsl(345 65% 32%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(196,88,114,0.3) 100%)',
  },
  'theme-orchid': {
    id: 'theme-orchid',
    name: 'Rose Gold',
    background: 'linear-gradient(135deg, hsl(38 65% 64%) 0%, hsl(345 38% 62%) 100%)',
    textColor: '#3a2a26',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(212,164,107,0.3) 100%)',
  },
  'theme-peach': {
    id: 'theme-peach',
    name: 'Peach',
    background: 'linear-gradient(135deg, hsl(25 90% 72%) 0%, hsl(15 80% 52%) 100%)',
    textColor: '#3d1a08',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,138,92,0.3) 100%)',
  },
  'theme-cognac': {
    id: 'theme-cognac',
    name: 'Cognac',
    background: 'linear-gradient(135deg, hsl(28 70% 52%) 0%, hsl(24 75% 28%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(196,120,32,0.3) 100%)',
  },
  'theme-jade': {
    id: 'theme-jade',
    name: 'Jade',
    background: 'linear-gradient(135deg, hsl(172 70% 45%) 0%, hsl(178 80% 22%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(28,179,156,0.3) 100%)',
  },
  'theme-sage': {
    id: 'theme-sage',
    name: 'Sage',
    background: 'linear-gradient(135deg, hsl(145 50% 62%) 0%, hsl(145 55% 32%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(92,184,122,0.3) 100%)',
  },
  'theme-matrix': {
    id: 'theme-matrix',
    name: 'Matrix',
    background: 'linear-gradient(135deg, hsl(145 90% 50%) 0%, hsl(220 60% 12%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(26,255,122,0.3) 100%)',
  },
  'theme-noir': {
    id: 'theme-noir',
    name: 'Noir',
    background: 'linear-gradient(135deg, hsl(0 0% 18%) 0%, hsl(0 0% 6%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
  },
  'theme-marine': {
    id: 'theme-marine',
    name: 'Marine',
    background: 'linear-gradient(135deg, hsl(218 100% 56%) 0%, hsl(220 75% 22%) 100%)',
    textColor: '#ffffff',
    glassStroke: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(30,107,255,0.3) 100%)',
  },
};

// Check if a color_hex value is a gradient marker
export function isGradientMarker(colorHex: string): boolean {
  return colorHex.startsWith('gradient:');
}

// Get gradient style from marker (e.g., "gradient:rose-gold" -> gradient object)
// Looks up both SPECIAL_GRADIENTS and THEME_GRADIENTS.
export function getGradientFromMarker(colorHex: string) {
  if (!isGradientMarker(colorHex)) return null;
  const gradientId = colorHex.replace('gradient:', '');
  return SPECIAL_GRADIENTS[gradientId] || THEME_GRADIENTS[gradientId] || null;
}

// Default fallback colors for categories not in the database
const FALLBACK_COLORS: Record<string, { bg: string; text: string; abbr: string }> = {
  blonding: { bg: '#facc15', text: '#1f2937', abbr: 'BL' },
  color: { bg: '#f472b6', text: '#ffffff', abbr: 'CO' },
  haircuts: { bg: '#60a5fa', text: '#ffffff', abbr: 'HC' },
  styling: { bg: '#a78bfa', text: '#ffffff', abbr: 'ST' },
  extensions: { bg: '#10b981', text: '#ffffff', abbr: 'EX' },
  'new client consultation': { bg: '#d4a574', text: '#1f2937', abbr: 'NC' },
  consultation: { bg: '#d4a574', text: '#1f2937', abbr: 'NC' },
  treatment: { bg: '#06b6d4', text: '#ffffff', abbr: 'TR' },
  block: { bg: '#374151', text: '#ffffff', abbr: 'BK' },
  break: { bg: '#4b5563', text: '#ffffff', abbr: 'BR' },
};

// Generic fallback for unknown categories
const DEFAULT_COLOR = { bg: '#6b7280', text: '#ffffff', abbr: '??' };

/**
 * Get the 2-letter abbreviation for a category name
 */
export function getCategoryAbbreviation(categoryName: string): string {
  const words = categoryName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return categoryName.slice(0, 2).toUpperCase();
}

/**
 * Get category colors from a color map, with fallback to defaults
 */
export function getCategoryColor(
  categoryName: string | null | undefined,
  colorMap: Record<string, { bg: string; text: string; abbr: string }>
): { bg: string; text: string; abbr: string } {
  if (!categoryName) {
    return DEFAULT_COLOR;
  }
  
  const normalizedName = categoryName.toLowerCase();
  
  // First check database colors
  if (colorMap[normalizedName]) {
    return colorMap[normalizedName];
  }
  
  // Check fallback colors
  if (FALLBACK_COLORS[normalizedName]) {
    return FALLBACK_COLORS[normalizedName];
  }
  
  // Try partial matching for common patterns
  if (normalizedName.includes('consult')) {
    return FALLBACK_COLORS['consultation'];
  }
  // Blonding patterns
  if (normalizedName.includes('blond') || normalizedName.includes('highlight') || normalizedName.includes('balayage') ||
      normalizedName.includes('foil') || normalizedName.includes('face frame') || normalizedName.includes('ombre') ||
      normalizedName.includes('babylight') || normalizedName.includes('lightener') || normalizedName.includes('bleach')) {
    return { ...FALLBACK_COLORS['blonding'], abbr: getCategoryAbbreviation(categoryName) };
  }
  // Color patterns
  if (normalizedName.includes('color') || normalizedName.includes('colour') ||
      normalizedName.includes('root retouch') || normalizedName.includes('single process') ||
      normalizedName.includes('double process') || normalizedName.includes('glaze') ||
      normalizedName.includes('gloss') || normalizedName.includes('toner') ||
      normalizedName.includes('demi') || normalizedName.includes('semi') ||
      normalizedName.includes('retouch') || normalizedName.includes('touch up') ||
      normalizedName.includes('all over')) {
    return { ...FALLBACK_COLORS['color'], abbr: getCategoryAbbreviation(categoryName) };
  }
  // Haircut patterns
  if (normalizedName.includes('cut') || normalizedName.includes('trim') ||
      normalizedName.includes('clipper') || normalizedName.includes('haircut') ||
      normalizedName.includes('bang') || normalizedName.includes('fringe') ||
      normalizedName.includes('shave') || normalizedName.includes('fade') ||
      normalizedName.includes('taper') || normalizedName.includes('razor')) {
    return { ...FALLBACK_COLORS['haircuts'], abbr: getCategoryAbbreviation(categoryName) };
  }
  // Styling patterns
  if (normalizedName.includes('style') || normalizedName.includes('blow') ||
      normalizedName.includes('updo') || normalizedName.includes('braid') ||
      normalizedName.includes('blowout') || normalizedName.includes('set') ||
      normalizedName.includes('iron') || normalizedName.includes('curl') ||
      normalizedName.includes('flat iron') || normalizedName.includes('wave')) {
    return { ...FALLBACK_COLORS['styling'], abbr: getCategoryAbbreviation(categoryName) };
  }
  if (normalizedName.includes('extension') || normalizedName.includes('install') ||
      normalizedName.includes('tape-in') || normalizedName.includes('sew-in') ||
      normalizedName.includes('weft')) {
    return { ...FALLBACK_COLORS['extensions'], abbr: getCategoryAbbreviation(categoryName) };
  }
  if (normalizedName.includes('treatment') || normalizedName.includes('keratin') || normalizedName.includes('condition') ||
      normalizedName.includes('repair') || normalizedName.includes('olaplex') || normalizedName.includes('deep condition') ||
      normalizedName.includes('mask') || normalizedName.includes('scalp')) {
    return { ...FALLBACK_COLORS['treatment'], abbr: getCategoryAbbreviation(categoryName) };
  }
  
  // Return default with dynamic abbreviation
  return {
    ...DEFAULT_COLOR,
    abbr: getCategoryAbbreviation(categoryName),
  };
}

/**
 * Calculate contrasting text color for a background
 */
export function getContrastingTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// ============================================================
// DARK MODE COLOR DERIVATION SYSTEM
// ============================================================
// Re-derives dark mode colors from light-mode hex values.
// Not opacity-based — produces richer, more saturated tokens
// that read well against deep charcoal calendar backgrounds.

import { hexToHsl, hslToHex } from '@/lib/colorUtils';

interface ColorTokenSet {
  fill: string;
  stroke: string;
  hover: string;
  selected: string;
  text: string;
}

/**
 * Derive a complete dark-mode color token set from a light-mode hex color.
 * Uses HSL transformations to produce richer, contained colors for dark backgrounds.
 */
export function deriveDarkModeColor(hexColor: string): ColorTokenSet {
  const hslStr = hexToHsl(hexColor);
  const parts = hslStr.split(/[\s%]+/).map(v => parseFloat(v));
  const [h, s, l] = parts;

  // Special case: grays (very low saturation)
  const isGray = s < 8;
  
  // Dark fill derivation
  let darkS: number;
  let darkL: number;
  
  if (isGray) {
    darkS = Math.min(s + 3, 12);
    darkL = Math.max(Math.min(l * 0.35 + 15, 32), 20);
  } else if (l > 85) {
    // Very light colors (e.g., Blonding #facc15 has high lightness in perceived terms)
    darkS = Math.min(s + 8, 85);
    darkL = Math.max(Math.min(l * 0.35 + 16, 38), 22);
  } else if (l < 25) {
    // Very dark colors (e.g., Block #374151)
    darkS = Math.min(s + 6, 30);
    darkL = Math.max(l + 8, 22);
  } else {
    darkS = Math.min(s + 8, 85);
    darkL = Math.max(Math.min(l * 0.45 + 18, 42), 22);
  }

  const fillHsl = `${Math.round(h)} ${Math.round(darkS)}% ${Math.round(darkL)}%`;
  const fill = hslToHex(fillHsl);
  
  // Stroke: darker, more saturated edge
  const strokeS = Math.min(darkS + 4, 90);
  const strokeL = Math.max(darkL - 12, 8);
  const strokeHsl = `${Math.round(h)} ${Math.round(strokeS)}% ${Math.round(strokeL)}%`;
  const stroke = hslToHex(strokeHsl);
  
  // Hover: slightly brighter
  const hoverL = Math.min(darkL + 5, 50);
  const hoverHsl = `${Math.round(h)} ${Math.round(darkS)}% ${Math.round(hoverL)}%`;
  const hover = hslToHex(hoverHsl);
  
  // Selected: slightly deeper, more saturated
  const selectedS = Math.min(darkS + 4, 90);
  const selectedL = Math.max(darkL - 4, 12);
  const selectedHsl = `${Math.round(h)} ${Math.round(selectedS)}% ${Math.round(selectedL)}%`;
  const selected = hslToHex(selectedHsl);
  
  // Text: contrast-aware
  const text = darkL > 35 ? '#1a1a2e' : '#e8e4df';
  
  return { fill, stroke, hover, selected, text };
}

/**
 * Boost overly-pale category hex colors for better visibility on light calendar backgrounds.
 * Colors with lightness > 85% get darkened and saturated so they don't look washed out.
 */
export function boostPaleCategoryColor(hexColor: string): string {
  const hslStr = hexToHsl(hexColor);
  const parts = hslStr.split(/[\s%]+/).map(v => parseFloat(v));
  const [h, s, l] = parts;
  // Only boost if the color is very light (L > 82%) — typical of pastel/washed-out colors
  if (l <= 82) return hexColor;
  // Bring lightness down to 72-78 range and bump saturation
  const boostedL = Math.max(l * 0.82, 68);
  const boostedS = Math.min(s + 15, 90);
  return hslToHex(`${Math.round(h)} ${Math.round(boostedS)}% ${Math.round(boostedL)}%`);
}

/**
 * Derive light-mode token set from a hex color.
 */
export function deriveLightModeColor(hexColor: string): ColorTokenSet {
  const hslStr = hexToHsl(hexColor);
  const parts = hslStr.split(/[\s%]+/).map(v => parseFloat(v));
  const [h, s, l] = parts;
  
  // Stroke: 20% darker
  const strokeL = Math.max(l - 20, 5);
  const stroke = hslToHex(`${Math.round(h)} ${Math.round(s)}% ${Math.round(strokeL)}%`);
  
  // Hover: 5% lighter
  const hoverL = Math.min(l + 5, 95);
  const hover = hslToHex(`${Math.round(h)} ${Math.round(s)}% ${Math.round(hoverL)}%`);
  
  // Selected: 8% darker
  const selectedL = Math.max(l - 8, 5);
  const selected = hslToHex(`${Math.round(h)} ${Math.round(s)}% ${Math.round(selectedL)}%`);
  
  const text = getContrastingTextColor(hexColor);
  
  return { fill: hexColor, stroke, hover, selected, text };
}

/**
 * Get complete dual-mode color tokens for any hex color.
 */
export function deriveFullColorTokens(hexColor: string): { light: ColorTokenSet; dark: ColorTokenSet } {
  return {
    light: deriveLightModeColor(hexColor),
    dark: deriveDarkModeColor(hexColor),
  };
}

/**
 * Returns inline style object for a calendar appointment block.
 * Handles light/dark mode switching with proper containment.
 */
export function getCalendarBlockStyle(
  hexColor: string,
  isDark: boolean,
  state: 'default' | 'hover' | 'selected' = 'default'
): React.CSSProperties {
  if (!isDark) {
    const light = deriveLightModeColor(hexColor);
    return {
      backgroundColor: state === 'hover' ? light.hover : state === 'selected' ? light.selected : light.fill,
      color: light.text,
      borderColor: light.stroke,
      borderWidth: '0 0 0 4px',
      borderStyle: 'solid',
    };
  }

  const dark = deriveDarkModeColor(hexColor);
  return {
    backgroundColor: state === 'hover' ? dark.hover : state === 'selected' ? dark.selected : dark.fill,
    color: dark.text,
    borderColor: dark.stroke,
    borderWidth: '1px',
    borderStyle: 'solid',
  };
}

/**
 * Get the derived dark-mode text color for a given category hex.
 * Used when you need just the text color without full style.
 */
export function getDarkModeTextColor(hexColor: string): string {
  return deriveDarkModeColor(hexColor).text;
}

// ============================================================
// SOLID DARK MODE SYSTEM (Calendar Appointment Blocks)
// ============================================================
// Solid, richly saturated fills for dark mode calendar blocks.
// Inspired by macOS-native calendar aesthetic: vivid but controlled
// solid fills, left accent bars, white text, zero transparency.

interface DarkCategoryStyle {
  fill: string;
  stroke: string;
  accent: string;
  hover: string;
  selected: string;
  text: string;
  glow: string;
  ring: string;
}

/**
 * Returns a solid dark-mode style set for a calendar appointment block.
 * Derives rich, saturated fills from the light-mode hex that sit at
 * lightness 30-42%, well above the 7-14% calendar background.
 */
/**
 * Convert hex to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/**
 * Derive a deeper, more vibrant accent edge color from a card's own hue.
 * Used by the schedule appointment leading-edge accent so each card's left
 * border belongs to the card's own color family (no global purple/primary).
 *
 * Rules:
 * - Preserve hue (never drift to a different color).
 * - Reduce lightness so the edge reads deeper than the fill.
 * - Modestly increase saturation for vibrance.
 * - Grays stay neutral but darker (no invented hue).
 * - Pale fills (consultation/champagne) get a stronger lightness drop so
 *   the edge visibly contrasts the soft body.
 */
export function deriveAccentEdgeColor(hexColor: string, isDark: boolean): string {
  const hslStr = hexToHsl(hexColor);
  const parts = hslStr.split(/[\s%]+/).map(v => parseFloat(v));
  const [h, s, l] = parts;
  const isGray = s < 8;

  if (isDark) {
    // Dark mode: brighten + saturate so the edge pops against the dark fill.
    if (isGray) {
      return hslToHex(`${Math.round(h)} ${Math.round(Math.min(s + 4, 14))}% ${Math.round(Math.min(l + 18, 62))}%`);
    }
    const accentS = Math.min(s + 12, 92);
    const accentL = Math.min(Math.max(l + 8, 48), 62);
    return hslToHex(`${Math.round(h)} ${Math.round(accentS)}% ${Math.round(accentL)}%`);
  }

  // Light mode: deeper + slightly more saturated than the fill.
  if (isGray) {
    const accentL = Math.max(l - 22, 18);
    return hslToHex(`${Math.round(h)} ${Math.round(s)}% ${Math.round(accentL)}%`);
  }

  // Pale fills (l > 78) need a bigger drop to be visible against the body.
  const drop = l > 78 ? 22 : l > 65 ? 18 : 14;
  const accentL = Math.max(l - drop, 18);
  const accentS = Math.min(s + 10, 92);
  return hslToHex(`${Math.round(h)} ${Math.round(accentS)}% ${Math.round(accentL)}%`);
}

export function getDarkCategoryStyle(hexColor: string): DarkCategoryStyle {
  const hslStr = hexToHsl(hexColor);
  const parts = hslStr.split(/[\s%]+/).map(v => parseFloat(v));
  const [, s] = parts;

  const isGray = s < 8;
  const { r, g, b } = hexToRgb(hexColor);

  // Ghost style: translucent tint with visible category color
  const fillAlpha = isGray ? 0.18 : 0.15;
  const fill = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;

  // Hover: slightly more opaque
  const hover = `rgba(${r}, ${g}, ${b}, ${isGray ? 0.25 : 0.22})`;

  // Selected: more opaque
  const selected = `rgba(${r}, ${g}, ${b}, ${isGray ? 0.32 : 0.28})`;
  // Stroke: original light-mode hex
  const stroke = hexColor;

  // Accent bar: original light-mode hex for colored, derived for grays
  const accent = isGray
    ? hslToHex(`${Math.round(parts[0])} ${Math.round(Math.min(s + 8, 20))}% 35%`)
    : hexColor;

  // Text: original light-mode hex for colored, warm off-white for grays
  const text = isGray ? '#e8e4df' : hexColor;

  // Glow: enhanced category glow for ghost aesthetic
  const glowAlpha = isGray ? 0.12 : 0.22;
  const glow = `0 0 12px rgba(${r}, ${g}, ${b}, ${glowAlpha})`;

  // Ring: 2px outline for selected state
  const ring = `0 0 0 2px ${hexColor}`;

  return { fill, stroke, accent, hover, selected, text, glow, ring };
}
