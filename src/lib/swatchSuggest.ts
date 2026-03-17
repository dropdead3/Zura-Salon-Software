/**
 * Auto-suggest a swatch color hex from a professional hair color product name.
 * Combines shade level (darkness) with tone indicators (letters/keywords) to
 * pick the closest match from the curated HAIR_COLOR_SWATCHES palette.
 */

import { extractShadeLevel } from './shadeSort';
import { HAIR_COLOR_SWATCHES } from '@/components/platform/backroom/SwatchPicker';

type ToneFamily = 'natural' | 'ash' | 'gold' | 'red' | 'copper' | 'violet' | 'blue';

/** Map of tone code letters → tone family */
const TONE_CODE_MAP: Record<string, ToneFamily> = {
  'NN': 'natural',
  'N': 'natural',
  'NA': 'ash',
  'A': 'ash',
  'AA': 'ash',
  'AB': 'ash',
  'G': 'gold',
  'GN': 'gold',
  'GG': 'gold',
  'GB': 'gold',
  'RR': 'red',
  'R': 'red',
  'RB': 'red',
  'RC': 'copper',
  'C': 'copper',
  'CC': 'copper',
  'CG': 'copper',
  'V': 'violet',
  'VR': 'violet',
  'VV': 'violet',
  'BV': 'violet',
  'B': 'blue',
  'BB': 'blue',
};

/** Keyword → tone family (checked against full product name) */
const KEYWORD_TONE_MAP: [RegExp, ToneFamily][] = [
  [/\bplatinum\b/i, 'ash'],
  [/\bash\b/i, 'ash'],
  [/\bsilver\b/i, 'ash'],
  [/\bgold\b/i, 'gold'],
  [/\bbeige\b/i, 'gold'],
  [/\bcopper\b/i, 'copper'],
  [/\bauburn\b/i, 'copper'],
  [/\bmahogany\b/i, 'red'],
  [/\bred\b/i, 'red'],
  [/\bviolet\b/i, 'violet'],
  [/\bpurple\b/i, 'violet'],
  [/\bblue\b/i, 'blue'],
  [/\bbrown\b/i, 'natural'],
  [/\bblonde?\b/i, 'natural'],
  [/\bnatural\b/i, 'natural'],
  [/\bneutral\b/i, 'natural'],
];

/**
 * Extract tone letter codes from a product name token.
 * E.g. "3NN" → "NN", "6/1A" → "A", "7.43G" → "G"
 */
function extractToneCode(name: string): string | null {
  const tokens = name.split(/\s+/);
  for (const token of tokens) {
    // Match tokens like "3NN", "6.1A", "7/43GN", "10.02RR"
    const match = token.match(/^\d+(?:[.\/]\d+)*([A-Za-z]{1,3})$/);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  return null;
}

function detectTone(name: string): ToneFamily {
  // 1. Try tone code letters from the shade number token
  const code = extractToneCode(name);
  if (code) {
    // Try longest match first (e.g. "NN" before "N")
    if (TONE_CODE_MAP[code]) return TONE_CODE_MAP[code];
    // Try first two chars, then first char
    if (code.length >= 2 && TONE_CODE_MAP[code.slice(0, 2)]) return TONE_CODE_MAP[code.slice(0, 2)];
    if (TONE_CODE_MAP[code[0]]) return TONE_CODE_MAP[code[0]];
  }

  // 2. Keyword search in product name
  for (const [regex, family] of KEYWORD_TONE_MAP) {
    if (regex.test(name)) return family;
  }

  return 'natural';
}

/** Level + tone → swatch hex lookup */
const TONE_LEVEL_MAP: Record<ToneFamily, Record<string, string>> = {
  natural: {
    '1-3': '#1a1a1a',   // Black
    '4': '#3B2314',      // Dark Brown
    '5': '#5C3A1E',      // Medium Brown
    '6': '#8B6239',      // Light Brown
    '7': '#9B7B3A',      // Dark Blonde
    '8': '#C4A44A',      // Blonde
    '9': '#D4C47A',      // Light Blonde
    '10': '#E8DDB5',     // Very Light Blonde
    '11+': '#F0EAD6',    // Platinum
  },
  ash: {
    '1-3': '#1a1a1a',
    '4-5': '#5A5A5A',    // Dark Ash
    '6-7': '#8A8A7B',    // Ash
    '8-9': '#D4C47A',    // Light Blonde (cool)
    '10': '#E8DDB5',
    '11+': '#F0EAD6',
  },
  gold: {
    '1-3': '#3B2314',
    '4-5': '#7A5C1F',    // Dark Gold
    '6-7': '#B8860B',    // Gold
    '8-9': '#C4A44A',    // Blonde
    '10': '#D4C47A',
    '11+': '#E8DDB5',
  },
  red: {
    '1-3': '#6B1A1A',    // Dark Red
    '4-5': '#8B2020',    // Red
    '6-7': '#8B2020',
    '8-9': '#B5541A',    // Copper (lighter reds)
    '10+': '#B5541A',
  },
  copper: {
    '1-3': '#8B3A0F',    // Dark Copper
    '4-5': '#8B3A0F',
    '6-7': '#B5541A',    // Copper
    '8-9': '#B5541A',
    '10+': '#B8860B',    // Gold at very light
  },
  violet: {
    default: '#6B3A6B',
  },
  blue: {
    default: '#2A4A6B',
  },
};

function lookupSwatchForLevel(level: number, tone: ToneFamily): string {
  const map = TONE_LEVEL_MAP[tone];

  // For single-swatch tones
  if (map.default) return map.default;

  if (level <= 3) return map['1-3'] ?? map['4-5'] ?? Object.values(map)[0];
  if (level <= 4) return map['4'] ?? map['4-5'] ?? map['1-3']!;
  if (level <= 5) return map['5'] ?? map['4-5'] ?? map['6']!;
  if (level <= 6) return map['6'] ?? map['6-7'] ?? map['5']!;
  if (level <= 7) return map['7'] ?? map['6-7'] ?? map['8']!;
  if (level <= 8) return map['8'] ?? map['8-9'] ?? map['7']!;
  if (level <= 9) return map['9'] ?? map['8-9'] ?? map['10']!;
  if (level <= 10) return map['10'] ?? map['10+'] ?? map['11+'] ?? map['8-9']!;
  return map['11+'] ?? map['10+'] ?? map['10'] ?? Object.values(map).pop()!;
}

/**
 * Given a product name, suggest the closest swatch hex from the palette.
 * Returns null if no reasonable suggestion can be made.
 */
export function suggestSwatchColor(productName: string): string | null {
  if (!productName) return null;

  // "Clear" products
  if (/\bclear\b/i.test(productName)) return 'transparent';

  const level = extractShadeLevel(productName);

  // No numeric level found and no clear — can't suggest
  if (level === 999) return null;
  if (level === Infinity) return 'transparent';

  const tone = detectTone(productName);
  const hex = lookupSwatchForLevel(level, tone);

  // Verify hex is in our palette
  const inPalette = HAIR_COLOR_SWATCHES.some((s) => s.hex === hex);
  return inPalette ? hex : null;
}
