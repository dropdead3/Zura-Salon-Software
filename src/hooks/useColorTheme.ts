import { useState, useEffect } from 'react';

export type ColorTheme = 'zura' | 'cream' | 'rose' | 'sage' | 'ocean' | 'ember' | 'noir';

const THEME_STORAGE_KEY = 'dd-color-theme';

const ALL_THEMES: ColorTheme[] = ['zura', 'cream', 'rose', 'sage', 'ocean', 'ember', 'noir'];
const THEME_CLASSES = ALL_THEMES.map(t => `theme-${t}`);

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('zura');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ColorTheme | null;
    if (savedTheme && ALL_THEMES.includes(savedTheme)) {
      setColorThemeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (theme: ColorTheme) => {
    const html = document.documentElement;
    html.classList.remove(...THEME_CLASSES);
    html.classList.add(`theme-${theme}`);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  };

  return {
    colorTheme: mounted ? colorTheme : 'zura',
    setColorTheme,
    mounted,
  };
}

// Map system color themes to matching service category quick themes
export const COLOR_THEME_TO_CATEGORY_MAP: Record<ColorTheme, string> = {
  zura: 'Lavender Fields',
  cream: 'Neutral Elegance',
  rose: 'Rose Garden',
  sage: 'Coastal Breeze',
  ocean: 'Ocean Avenue',
  ember: 'Sunset Bloom',
  noir: 'Neutral Elegance',
};

// Theme metadata for UI
export const colorThemes = [
  {
    id: 'zura' as ColorTheme,
    name: 'Zura',
    description: 'Brand violet & purple',
    lightPreview: {
      bg: 'hsl(260 25% 95%)',
      accent: 'hsl(260 20% 88%)',
      primary: 'hsl(270 70% 55%)',
    },
    darkPreview: {
      bg: 'hsl(230 25% 5%)',
      accent: 'hsl(270 30% 20%)',
      primary: 'hsl(270 75% 60%)',
    },
  },
  {
    id: 'cream' as ColorTheme,
    name: 'Cream',
    description: 'Warm cream & oat tones',
    lightPreview: {
      bg: 'hsl(40 30% 96%)',
      accent: 'hsl(35 35% 82%)',
      primary: 'hsl(0 0% 8%)',
    },
    darkPreview: {
      bg: 'hsl(0 0% 4%)',
      accent: 'hsl(35 25% 30%)',
      primary: 'hsl(40 20% 92%)',
    },
  },
  {
    id: 'rose' as ColorTheme,
    name: 'Rose',
    description: 'Soft blush pink palette',
    lightPreview: {
      bg: 'hsl(350 30% 97%)',
      accent: 'hsl(350 30% 85%)',
      primary: 'hsl(350 60% 55%)',
    },
    darkPreview: {
      bg: 'hsl(350 15% 6%)',
      accent: 'hsl(350 20% 25%)',
      primary: 'hsl(350 55% 60%)',
    },
  },
  {
    id: 'sage' as ColorTheme,
    name: 'Sage',
    description: 'Calming mint green',
    lightPreview: {
      bg: 'hsl(145 25% 96%)',
      accent: 'hsl(145 25% 82%)',
      primary: 'hsl(145 45% 42%)',
    },
    darkPreview: {
      bg: 'hsl(145 12% 6%)',
      accent: 'hsl(145 15% 25%)',
      primary: 'hsl(145 40% 50%)',
    },
  },
  {
    id: 'ocean' as ColorTheme,
    name: 'Ocean',
    description: 'Cool blue tones',
    lightPreview: {
      bg: 'hsl(210 30% 97%)',
      accent: 'hsl(210 28% 85%)',
      primary: 'hsl(210 60% 50%)',
    },
    darkPreview: {
      bg: 'hsl(210 15% 6%)',
      accent: 'hsl(210 18% 25%)',
      primary: 'hsl(210 55% 55%)',
    },
  },
  {
    id: 'ember' as ColorTheme,
    name: 'Ember',
    description: 'Warm amber & burnt orange',
    lightPreview: {
      bg: 'hsl(25 30% 94%)',
      accent: 'hsl(25 25% 85%)',
      primary: 'hsl(25 80% 50%)',
    },
    darkPreview: {
      bg: 'hsl(20 20% 5%)',
      accent: 'hsl(20 25% 18%)',
      primary: 'hsl(25 75% 55%)',
    },
  },
  {
    id: 'noir' as ColorTheme,
    name: 'Noir',
    description: 'Pure monochrome minimal',
    lightPreview: {
      bg: 'hsl(0 0% 96%)',
      accent: 'hsl(0 0% 88%)',
      primary: 'hsl(0 0% 8%)',
    },
    darkPreview: {
      bg: 'hsl(0 0% 4%)',
      accent: 'hsl(0 0% 15%)',
      primary: 'hsl(0 0% 95%)',
    },
  },
];
