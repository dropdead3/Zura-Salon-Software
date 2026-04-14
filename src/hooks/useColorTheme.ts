import { useState, useEffect } from 'react';

export type ColorTheme = 'cream' | 'rose' | 'sage' | 'ocean' | 'zura';

const THEME_STORAGE_KEY = 'dd-color-theme';

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('zura');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ColorTheme | null;
    if (savedTheme && ['cream', 'rose', 'sage', 'ocean', 'zura'].includes(savedTheme)) {
      setColorThemeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (theme: ColorTheme) => {
    const html = document.documentElement;
    // Remove all theme classes
    html.classList.remove('theme-cream', 'theme-rose', 'theme-sage', 'theme-ocean', 'theme-zura');
    // Add new theme class
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

// Theme metadata for UI
export const colorThemes = [
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
];
