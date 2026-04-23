import type { ColorTheme } from '@/hooks/useColorTheme';

export interface TerminalPalette {
  /** 3-stop vertical gradient: top → middle → top */
  gradientStops: [string, string, string];
  /** Primary accent color (hex) */
  accentColor: string;
  /** Softer glow version of accent for radials */
  accentGlow: string;
  /** Text color on the dark background */
  textColor: string;
  /** Muted/secondary text */
  mutedColor: string;
  /** CSS-compatible rgba for glows */
  accentRgba: (alpha: number) => string;
}

const palette = (
  stops: [string, string, string],
  accent: string,
  glow: string,
  accentR: number,
  accentG: number,
  accentB: number,
): TerminalPalette => ({
  gradientStops: stops,
  accentColor: accent,
  accentGlow: glow,
  textColor: '#ffffff',
  mutedColor: 'rgba(255,255,255,0.4)',
  accentRgba: (a) => `rgba(${accentR},${accentG},${accentB},${a})`,
});

export const terminalPalettes: Record<ColorTheme, TerminalPalette> = {
  bone: palette(
    ['#0a0a0a', '#2a2826', '#0a0a0a'],
    '#a8a195',
    '#8a8378',
    168, 161, 149,
  ),
  rosewood: palette(
    ['#140a0c', '#3d1a24', '#140a0c'],
    '#c45872',
    '#a8425c',
    196, 88, 114,
  ),
  sage: palette(
    ['#0a100c', '#1a3d26', '#0a100c'],
    '#5cb87a',
    '#4a9e66',
    92, 184, 122,
  ),
  marine: palette(
    ['#050a1f', '#0a1530', '#050a1f'],
    '#1e6bff',
    '#0d4fdb',
    30, 107, 255,
  ),
  zura: palette(
    ['#0a0a14', '#1a1040', '#0a0a14'],
    '#8b5cf6',
    '#7c3aed',
    139, 92, 246,
  ),
  cognac: palette(
    ['#140a04', '#3d2010', '#140a04'],
    '#c47820',
    '#a86518',
    196, 120, 32,
  ),
  noir: palette(
    ['#080808', '#1a1a1a', '#080808'],
    '#e0e0e0',
    '#b0b0b0',
    224, 224, 224,
  ),
  neon: palette(
    ['#0a0408', '#3d1024', '#0a0408'],
    '#ff2d8a',
    '#d4206e',
    255, 45, 138,
  ),
};

export function getTerminalPalette(theme: ColorTheme): TerminalPalette {
  return terminalPalettes[theme] ?? terminalPalettes.bone;
}
