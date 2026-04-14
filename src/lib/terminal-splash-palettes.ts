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
  cream: palette(
    ['#0a0a08', '#2d2820', '#0a0a08'],
    '#b8a77a',
    '#9e8d64',
    184, 167, 122,
  ),
  rose: palette(
    ['#140a0c', '#3d1a24', '#140a0c'],
    '#d4728a',
    '#b85a72',
    212, 114, 138,
  ),
  sage: palette(
    ['#0a100c', '#1a3d26', '#0a100c'],
    '#5cb87a',
    '#4a9e66',
    92, 184, 122,
  ),
  ocean: palette(
    ['#0a0c14', '#1a2640', '#0a0c14'],
    '#4a8ad4',
    '#3a72b8',
    74, 138, 212,
  ),
  zura: palette(
    ['#0a0a14', '#1a1040', '#0a0a14'],
    '#8b5cf6',
    '#7c3aed',
    139, 92, 246,
  ),
  ember: palette(
    ['#140a04', '#3d2010', '#140a04'],
    '#d4872a',
    '#b87020',
    212, 135, 42,
  ),
  noir: palette(
    ['#080808', '#1a1a1a', '#080808'],
    '#e0e0e0',
    '#b0b0b0',
    224, 224, 224,
  ),
};

export function getTerminalPalette(theme: ColorTheme): TerminalPalette {
  return terminalPalettes[theme] ?? terminalPalettes.cream;
}
