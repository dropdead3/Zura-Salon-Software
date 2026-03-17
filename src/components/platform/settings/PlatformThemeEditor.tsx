import { useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORM_THEME_TOKENS } from '@/hooks/usePlatformBranding';
import { ColorWheelPicker } from '@/components/ui/color-wheel-picker';
import { PlatformButton } from '../ui/PlatformButton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '../ui/PlatformCard';

interface PlatformThemeEditorProps {
  themeColors: Record<string, string>;
  onChange: (colors: Record<string, string>) => void;
}

// Convert HSL string to hex for color picker
function hslToHex(hsl: string): string {
  const match = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!match) return '#8b5cf6'; // fallback violet

  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert hex to HSL string
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '262 83% 58%'; // fallback

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function PlatformThemeEditor({ themeColors, onChange }: PlatformThemeEditorProps) {
  const handleColorChange = (key: string, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    onChange({ ...themeColors, [key]: hslValue });
    
    // Apply immediately for live preview — scoped to platform container
    const target = (document.querySelector('.platform-theme') as HTMLElement) || document.documentElement;
    target.style.setProperty(`--${key}`, hslValue);
  };

  const handleReset = (key: string) => {
    const { [key]: _, ...rest } = themeColors;
    onChange(rest);
    
    // Remove custom property to revert to default — scoped to platform container
    const target = (document.querySelector('.platform-theme') as HTMLElement) || document.documentElement;
    target.style.removeProperty(`--${key}`);
  };

  const handleResetAll = () => {
    onChange({});
    
    // Remove all custom properties — scoped to platform container
    const target = (document.querySelector('.platform-theme') as HTMLElement) || document.documentElement;
    Object.keys(PLATFORM_THEME_TOKENS).forEach((key) => {
      target.style.removeProperty(`--${key}`);
    });
  };

  const getColorType = (key: string): 'dark' | 'light' | 'primary' | 'accent' => {
    if (key.includes('accent')) return 'primary';
    if (key.includes('bg')) return 'dark';
    if (key.includes('foreground')) return 'light';
    return 'accent';
  };

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <PlatformCardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-violet-400" />
              Theme Colors
            </PlatformCardTitle>
            <PlatformCardDescription>
              Customize the platform color scheme
            </PlatformCardDescription>
          </div>
          {Object.keys(themeColors).length > 0 && (
            <PlatformButton
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="text-slate-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset All
            </PlatformButton>
          )}
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(PLATFORM_THEME_TOKENS).map(([key, { label, default: defaultValue }]) => {
            const currentValue = themeColors[key] || defaultValue;
            const isModified = !!themeColors[key];
            const hexValue = hslToHex(currentValue);

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">{label}</span>
                    {isModified && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Modified" />
                    )}
                  </div>
                  {isModified && (
                    <button
                      onClick={() => handleReset(key)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <ColorWheelPicker
                  value={hexValue}
                  onChange={(hex) => handleColorChange(key, hex)}
                  colorType={getColorType(key)}
                  label={label}
                />
              </div>
            );
          })}
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
