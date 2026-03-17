/**
 * Auto-suggest a swatch color hex from a professional hair color product name.
 * Combines shade level (darkness) with tone indicators (letters/keywords) to
 * pick the closest match from the curated HAIR_COLOR_SWATCHES palette.
 */

import { extractShadeLevel } from './shadeSort';
import { HAIR_COLOR_SWATCHES } from '@/components/platform/backroom/SwatchPicker';

type ToneFamily = 'natural' | 'ash' | 'gold' | 'red' | 'copper' | 'violet' | 'blue' | 'pastel' | 'vivid' | 'red_violet' | 'warm_brown';

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
  'GW': 'gold',
  'RR': 'red',
  'R': 'red',
  'RB': 'red',
  'RV': 'red',
  'RC': 'copper',
  'C': 'copper',
  'CC': 'copper',
  'CG': 'copper',
  'CR': 'copper',
  'V': 'violet',
  'VR': 'violet',
  'VV': 'violet',
  'BV': 'violet',
  'VB': 'violet',
  'B': 'natural',
  'BB': 'natural',
  'BG': 'gold',
  // Redken Shades EQ chart additions
  'T': 'ash',         // Titanium
  'SB': 'ash',        // Silver Blue
  'GY': 'ash',        // Green Yellow (Matte)
  'P': 'ash',         // Pearl
  'PP': 'ash',        // Pearl Pearl
  'M': 'ash',         // Matte
  'BP': 'ash',        // Blue Pearl
  'W': 'gold',        // Warm
  'WG': 'gold',       // Warm Gold
  'WN': 'gold',       // Warm Natural
  'NW': 'gold',       // Natural Warm
  'NG': 'gold',       // Natural Gold
  'Y': 'gold',        // Yellow
  'NB': 'natural',    // Natural Blue / Mahogany
  'O': 'copper',      // Orange
  'RO': 'copper',     // Red Orange
  'OR': 'copper',     // Orange Red
  'VG': 'violet',     // Violet Gold
  'VRo': 'red_violet', // Violet Rose
  'RVG': 'red_violet', // Red Violet Gold
};

/** Keyword → tone family (checked against full product name) */
const KEYWORD_TONE_MAP: [RegExp, ToneFamily][] = [
  // Pastel & Vivid first (more specific)
  [/\bpastel\b/i, 'pastel'],
  [/\bdusty\b/i, 'pastel'],
  [/\bneon\b/i, 'vivid'],
  [/\bvivid\b/i, 'vivid'],
  [/\bvibrant\b/i, 'vivid'],
  [/\bfashion\b/i, 'vivid'],
  [/\belectric\b/i, 'vivid'],
  [/\bhot pink\b/i, 'vivid'],
  [/\bmagenta\b/i, 'vivid'],
  [/\bfuchsia\b/i, 'vivid'],
  [/\bcyan\b/i, 'vivid'],
  [/\bfire\b/i, 'vivid'],
  // Standalone color words → vivid family (fashion colors)
  [/\borange\b/i, 'vivid'],
  [/\byellow\b/i, 'vivid'],
  [/\bpink\b/i, 'vivid'],
  [/\bteal\b/i, 'blue'],
  // Rose gold is copper family
  [/\brose\s*gold\b/i, 'copper'],
  // Red violet combos (before red and violet)
  [/\bred\s*violet\b/i, 'red_violet'],
  [/\bviolet\s*red\b/i, 'red_violet'],
  [/\bcranberry\b/i, 'red_violet'],
  [/\bmerlot\b/i, 'red_violet'],
  [/\braspberry\b/i, 'red_violet'],
  [/\brose\s*violet\b/i, 'red_violet'],
  // Warm brown / mocha
  [/\bmocha\b/i, 'warm_brown'],
  [/\bespresso\b/i, 'warm_brown'],
  [/\bcaf[eé]\b/i, 'warm_brown'],
  [/\bcinnamon\b/i, 'warm_brown'],
  [/\bmushroom\s*brown\b/i, 'warm_brown'],
  [/\bsand\b/i, 'warm_brown'],
  // Standard tones
  [/\bplatinum\b/i, 'ash'],
  [/\bash\b/i, 'ash'],
  [/\bsilver\b/i, 'ash'],
  [/\bsmoke\b/i, 'ash'],
  [/\bpewter\b/i, 'ash'],
  [/\bicy\b/i, 'ash'],
  [/\bcool\b/i, 'ash'],
  [/\bgreige\b/i, 'ash'],
  [/\bmushroom\b/i, 'ash'],
  [/\bsteel\s*beige\b/i, 'ash'],
  [/\bpearl\b/i, 'ash'],
  [/\bmatte\b/i, 'ash'],
  [/\btitanium\b/i, 'ash'],
  [/\bdriftwood\b/i, 'ash'],
  [/\bgold\b/i, 'gold'],
  [/\bbeige\b/i, 'gold'],
  [/\bhoney\b/i, 'gold'],
  [/\bchampagne\b/i, 'gold'],
  [/\bbutter\b/i, 'gold'],
  [/\bwarm\b/i, 'gold'],
  [/\btoffee\b/i, 'gold'],
  [/\bbutterscotch\b/i, 'gold'],
  [/\bcopper\b/i, 'copper'],
  [/\bauburn\b/i, 'copper'],
  [/\bginger\b/i, 'copper'],
  [/\btitian\b/i, 'copper'],
  [/\brusset\b/i, 'copper'],
  [/\bburnt\s*sienna\b/i, 'copper'],
  [/\bflamme\b/i, 'copper'],
  [/\bpaprika\b/i, 'copper'],
  [/\bmahogany\b/i, 'red'],
  [/\bred\b/i, 'red'],
  [/\bburgundy\b/i, 'red'],
  [/\bwine\b/i, 'red'],
  [/\bcherry\b/i, 'red'],
  [/\bstrawberry\b/i, 'red'],
  [/\bbonfire\b/i, 'red'],
  [/\bcayenne\b/i, 'red'],
  [/\baubergine\b/i, 'violet'],
  [/\bviolet\b/i, 'violet'],
  [/\bpurple\b/i, 'violet'],
  [/\bplum\b/i, 'violet'],
  [/\bmauve\b/i, 'violet'],
  [/\blavender\b/i, 'violet'],
  [/\borchid\b/i, 'violet'],
  [/\biridescent\b/i, 'violet'],
  [/\bblue\b/i, 'blue'],
  [/\bnavy\b/i, 'blue'],
  [/\bdenim\b/i, 'blue'],
  [/\bslate\b/i, 'blue'],
  [/\bsteel\b/i, 'blue'],
  [/\bbrown\b/i, 'natural'],
  [/\bblonde?\b/i, 'natural'],
  [/\bnatural\b/i, 'natural'],
  [/\bneutral\b/i, 'natural'],
  [/\bcaramel\b/i, 'natural'],
  [/\bchocolate\b/i, 'natural'],
  [/\bchestnut\b/i, 'natural'],
  // Redken-specific warm brown keywords
  [/\bchicory\b/i, 'warm_brown'],
  [/\bmaple\b/i, 'warm_brown'],
  [/\bmocha\s*java\b/i, 'warm_brown'],
  [/\bcardamom\b/i, 'warm_brown'],
  [/\bcedar\b/i, 'warm_brown'],
  [/\bsandal\b/i, 'warm_brown'],
  // Rose (standalone, not "rose gold") → red_violet
  [/\brose\b/i, 'red_violet'],
];

/**
 * Extract tone letter codes from a product name token.
 */
function extractToneCode(name: string): string | null {
  const tokens = name.split(/\s+/);
  for (const token of tokens) {
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
    if (TONE_CODE_MAP[code]) return TONE_CODE_MAP[code];
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
    '1-2': '#1a1a1a',
    '3': '#2B1810',
    '4': '#3B2314',
    '5': '#5C3A1E',
    '6': '#8B6239',
    '7': '#9B7B3A',
    '8': '#C4A44A',
    '9': '#D4C47A',
    '10': '#E8DDB5',
    '11+': '#F0EAD6',
  },
  ash: {
    '1-3': '#3A3A3A',
    '4': '#4A4A42',
    '5': '#5A5A5A',
    '6': '#6B6B5E',
    '7': '#8A8A7B',
    '8': '#A8A898',
    '9': '#C5C5BB',
    '10': '#D5CFC0',
    '11+': '#E8E4D8',
  },
  gold: {
    '1-3': '#7A5C1F',
    '4-5': '#8C6E28',
    '6': '#9E7E30',
    '7': '#B8860B',
    '8': '#C4981E',
    '9': '#D4A830',
    '10': '#E0CC80',
    '11+': '#EDE4C0',
  },
  red: {
    '1-3': '#4A0E0E',
    '4': '#5B1414',
    '5': '#6B1A1A',
    '6': '#7A1E1E',
    '7': '#8B2020',
    '8': '#A52828',
    '9': '#B22222',
    '10+': '#C45050',
  },
  copper: {
    '1-3': '#6A2E12',
    '4': '#7E3410',
    '5': '#8B3A0F',
    '6': '#9A4414',
    '7': '#B5541A',
    '8': '#CC6C28',
    '9': '#D08030',
    '10+': '#E0A850',
  },
  violet: {
    '1-3': '#3E1C3E',
    '4': '#502850',
    '5': '#5C305C',
    '6': '#6B3A6B',
    '7': '#7E4E7E',
    '8': '#926092',
    '9': '#9E789E',
    '10+': '#B090B0',
  },
  blue: {
    '1-3': '#1A2A40',
    '4': '#1E3450',
    '5': '#2A4060',
    '6': '#2A4A6B',
    '7': '#3A5A7A',
    '8': '#4A6070',
    '9': '#5A7A90',
    '10+': '#5A7A90',
  },
  red_violet: {
    '1-3': '#3C1228',
    '4': '#4B2C3D',
    '5': '#6B1845',
    '6': '#8B2A4E',
    '7': '#BC2B6E',
    '8': '#A0406A',
    '9': '#C4608A',
    '10+': '#D880A0',
  },
  warm_brown: {
    '1-3': '#3E2418',
    '4': '#4A2E1C',
    '5': '#6B4A30',
    '6': '#7A5638',
    '7': '#A08060',
    '8': '#9A8872',
    '9': '#C4AB82',
    '10+': '#B09070',
  },
  pastel: {
    default_pink: '#F4C2C2',
    default_lavender: '#D4B8E0',
    default_blue: '#A8C8E8',
    default_mint: '#A8E0C8',
    default_peach: '#FADADD',
    default_yellow: '#F8E8A0',
    default: '#D4B8E0',
  },
  vivid: {
    default_pink: '#FF1493',
    default_purple: '#8B00FF',
    default_blue: '#0050FF',
    default_green: '#39FF14',
    default_orange: '#FF6600',
    default_red: '#EE0000',
    default_yellow: '#FFD700',
    default: '#8B00FF',
  },
};

function lookupSwatchForLevel(level: number, tone: ToneFamily): string {
  const map = TONE_LEVEL_MAP[tone];

  // Pastel/vivid: pick a sub-color based on keywords (handled in caller) or use default
  if (tone === 'pastel' || tone === 'vivid') {
    return map.default!;
  }

  if (level <= 2) return map['1-2'] ?? map['1-3'] ?? Object.values(map)[0];
  if (level <= 3) return map['3'] ?? map['1-3'] ?? Object.values(map)[0];
  if (level <= 4) return map['4'] ?? map['4-5'] ?? map['1-3']!;
  if (level <= 5) return map['5'] ?? map['4-5'] ?? map['6']!;
  if (level <= 6) return map['6'] ?? map['6-7'] ?? map['5']!;
  if (level <= 7) return map['7'] ?? map['6-7'] ?? map['8']!;
  if (level <= 8) return map['8'] ?? map['8-9'] ?? map['7']!;
  if (level <= 9) return map['9'] ?? map['8-9'] ?? map['10']!;
  if (level <= 10) return map['10'] ?? map['10+'] ?? map['11+'] ?? map['8-9']!;
  return map['11+'] ?? map['10+'] ?? map['10'] ?? Object.values(map).pop()!;
}

/** For pastel/vivid, try to refine by sub-color keywords */
function refinePastelVividHex(name: string, tone: ToneFamily): string | null {
  const map = TONE_LEVEL_MAP[tone];
  const lower = name.toLowerCase();

  const subColorMap: [RegExp, string][] = [
    [/pink|rose/i, map.default_pink!],
    [/purple|violet|lilac|lavender/i, tone === 'pastel' ? map.default_lavender! : map.default_purple!],
    [/blue|cyan|teal/i, map.default_blue!],
    [/green|mint/i, map.default_green ?? map.default_mint!],
    [/orange|coral|peach|apricot/i, tone === 'pastel' ? map.default_peach! : map.default_orange!],
    [/red|fire|vibrant\s*red/i, map.default_red ?? map.default_pink!],
    [/yellow|gold/i, map.default_yellow!],
  ];

  for (const [regex, hex] of subColorMap) {
    if (regex.test(lower) && hex) return hex;
  }

  return map.default!;
}

/**
 * Direct color name → hex for products with no numeric level.
 * Returns a hex from the palette for standalone color names.
 */
function guessColorFromName(name: string): string | null {
  const lower = name.toLowerCase();

  const directColorMap: [RegExp, string][] = [
    [/\bdusty\s*lavender\b/, '#D4B8E0'],   // pastel lavender
    [/\bdusty\s*pink\b/, '#F4C2C2'],        // pastel pink
    [/\bdusty\s*rose\b/, '#F4C2C2'],        // pastel pink
    [/\brose\s*gold\b/, '#CC6C28'],          // copper 8
    [/\bsilver\s*smoke\b/, '#A8A898'],       // ash 8
    [/\bhot\s*pink\b/, '#FF1493'],           // vivid pink
    [/\belectric\s*blue\b/, '#0050FF'],      // vivid blue
    // Red violet family
    [/\bred\s*violet\b/, '#8B2A4E'],
    [/\bcranberry\b/, '#8E1B3D'],
    [/\bmerlot\b/, '#6D2040'],
    [/\braspberry\b/, '#A02050'],
    [/\brose\s*violet\b/, '#A0406A'],
    // Warm brown / mocha
    [/\bmocha\b/, '#6B4A30'],
    [/\bespresso\b/, '#4A2E1C'],
    [/\bcinnamon\b/, '#8B5E3C'],
    [/\bcaf[eé]\s*au\s*lait\b/, '#B09070'],
    [/\bmushroom\s*brown\b/, '#8A7760'],
    [/\bsand\b/, '#C4AB82'],
    // Ash / cool expanded
    [/\bcool\s*sand\b/, '#C4BAA2'],
    [/\bcool\s*tan\b/, '#B0A68E'],
    [/\bgreige\b/, '#A89F8B'],
    [/\bmushroom\b/, '#9C8E7A'],
    [/\bsteel\s*beige\b/, '#BEB8AA'],
    // Copper expanded
    [/\bcopper[\s-]*red\b/, '#A03818'],
    [/\bcopper[\s-]*violet\b/, '#8B3A50'],
    [/\bburnt\s*sienna\b/, '#964B22'],
    // Gold expanded
    [/\btoffee\b/, '#A07028'],
    [/\bbutterscotch\b/, '#D4982C'],
    [/\bcaramel\s*gold\b/, '#C08A30'],
    // Red expanded
    [/\bred[\s-]*mahogany\b/, '#6B2828'],
    // Violet expanded
    [/\baubergine\b/, '#3D1C38'],
    [/\bwarm\s*plum\b/, '#5E2848'],
    [/\bpurple[\s-]*brown\b/, '#4A2A3A'],
    [/\biridescent\s*violet\b/, '#7858A0'],
    // Original entries
    [/\bmagenta\b/, '#FF1493'],
    [/\bfuchsia\b/, '#FF1493'],
    [/\bteal\b/, '#2A6060'],
    [/\bpurple\b/, '#8B00FF'],
    [/\borange\b/, '#FF6600'],
    [/\byellow\b/, '#FFD700'],
    [/\bpink\b/, '#FF1493'],
    [/\bred\b/, '#EE0000'],
    [/\bviolet\b/, '#8B00FF'],
    [/\blavender\b/, '#D4B8E0'],
    [/\bmint\b/, '#A8E0C8'],
    [/\bpeach\b/, '#FADADD'],
    [/\bcoral\b/, '#FF6600'],
    [/\bplum\b/, '#6B3A6B'],
    [/\bnavy\b/, '#1E3450'],
    [/\bburgundy\b/, '#5B1414'],
    [/\bcherry\b/, '#8B2020'],
    [/\bauburn\b/, '#8B3A0F'],
    [/\bcopper\b/, '#B5541A'],
    [/\bginger\b/, '#9A4414'],
    [/\bchocolate\b/, '#3B2314'],
    [/\bcaramel\b/, '#8B6239'],
    [/\bchampagne\b/, '#D9C48E'],
    [/\bhoney\b/, '#C4981E'],
    [/\bplatinum\b/, '#D5CFC0'],
    [/\bsilver\b/, '#C5C5BB'],
    [/\bmauve\b/, '#7E4E7E'],
    [/\borchid\b/, '#926092'],
    [/\bslate\b/, '#4A6070'],
    [/\bsteel\b/, '#5A7A90'],
    [/\bsmoke\b/, '#C5C5BB'],
  ];

  for (const [regex, hex] of directColorMap) {
    if (regex.test(lower)) return hex;
  }

  return null;
}

/** Pick a mid-level hex for a tone family (used when no numeric level found) */
function getMidLevelHex(tone: ToneFamily): string {
  const midLevelMap: Record<ToneFamily, string> = {
    natural: '#8B6239',  // level 6
    ash: '#8A8A7B',      // level 7
    gold: '#B8860B',     // level 7
    red: '#7A1E1E',      // level 6
    copper: '#B5541A',   // level 7
    violet: '#6B3A6B',   // level 6
    blue: '#2A4A6B',     // level 6
    red_violet: '#8B2A4E', // level 6
    warm_brown: '#7A5638',  // level 6
    pastel: '#D4B8E0',   // default
    vivid: '#8B00FF',    // default
  };
  return midLevelMap[tone];
}

/**
 * Given a product name, suggest the closest swatch hex from the palette.
 * Returns null if no reasonable suggestion can be made.
 */
export function suggestSwatchColor(productName: string): string | null {
  if (!productName) return null;

  // "Clear" products
  if (/\bclear\b/i.test(productName)) return 'transparent';

  const tone = detectTone(productName);

  // For pastel/vivid, level doesn't matter as much
  if (tone === 'pastel' || tone === 'vivid') {
    const hex = refinePastelVividHex(productName, tone);
    if (hex) {
      const inPalette = HAIR_COLOR_SWATCHES.some((s) => s.hex === hex);
      return inPalette ? hex : null;
    }
  }

  const level = extractShadeLevel(productName);

  // No numeric level found — try direct color name lookup or mid-level tone
  if (level === 999) {
    // First try direct color name matching
    const directHex = guessColorFromName(productName);
    if (directHex) {
      const inPalette = HAIR_COLOR_SWATCHES.some((s) => s.hex === directHex);
      return inPalette ? directHex : null;
    }

    // If tone was detected (not just default natural), use mid-level for that tone
    if (tone !== 'natural') {
      const midHex = getMidLevelHex(tone);
      const inPalette = HAIR_COLOR_SWATCHES.some((s) => s.hex === midHex);
      return inPalette ? midHex : null;
    }

    // No tone detected either — can't suggest
    return null;
  }

  if (level === Infinity) return 'transparent';

  const hex = lookupSwatchForLevel(level, tone);

  // Verify hex is in our palette
  const inPalette = HAIR_COLOR_SWATCHES.some((s) => s.hex === hex);
  return inPalette ? hex : null;
}
