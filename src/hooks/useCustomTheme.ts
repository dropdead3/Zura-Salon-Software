import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// All editable CSS variable tokens organized by category
export const editableTokens = {
  core: [
    { key: 'background', label: 'Background', category: 'core' },
    { key: 'foreground', label: 'Foreground', category: 'core' },
    { key: 'card', label: 'Card', category: 'core' },
    { key: 'card-foreground', label: 'Card Text', category: 'core' },
    { key: 'popover', label: 'Popover', category: 'core' },
    { key: 'popover-foreground', label: 'Popover Text', category: 'core' },
  ],
  brand: [
    { key: 'primary', label: 'Primary', category: 'brand' },
    { key: 'primary-foreground', label: 'Primary Text', category: 'brand' },
    { key: 'secondary', label: 'Secondary', category: 'brand' },
    { key: 'secondary-foreground', label: 'Secondary Text', category: 'brand' },
    { key: 'accent', label: 'Accent', category: 'brand' },
    { key: 'accent-foreground', label: 'Accent Text', category: 'brand' },
  ],
  special: [
    { key: 'oat', label: 'Oat', category: 'special' },
    { key: 'gold', label: 'Gold', category: 'special' },
    { key: 'muted', label: 'Muted', category: 'special' },
    { key: 'muted-foreground', label: 'Muted Text', category: 'special' },
    { key: 'destructive', label: 'Destructive', category: 'special' },
    { key: 'destructive-foreground', label: 'Destructive Text', category: 'special' },
  ],
  ui: [
    { key: 'border', label: 'Border', category: 'ui' },
    { key: 'input', label: 'Input', category: 'ui' },
    { key: 'ring', label: 'Ring', category: 'ui' },
  ],
  sidebar: [
    { key: 'sidebar-background', label: 'Sidebar BG', category: 'sidebar' },
    { key: 'sidebar-foreground', label: 'Sidebar Text', category: 'sidebar' },
    { key: 'sidebar-primary', label: 'Sidebar Primary', category: 'sidebar' },
    { key: 'sidebar-primary-foreground', label: 'Sidebar Primary Text', category: 'sidebar' },
    { key: 'sidebar-accent', label: 'Sidebar Accent', category: 'sidebar' },
    { key: 'sidebar-accent-foreground', label: 'Sidebar Accent Text', category: 'sidebar' },
    { key: 'sidebar-border', label: 'Sidebar Border', category: 'sidebar' },
    { key: 'sidebar-ring', label: 'Sidebar Ring', category: 'sidebar' },
  ],
};

// Preset theme definitions
export const themePresets = {
  midnight: {
    name: 'Midnight',
    description: 'Deep blue tones for a sleek, professional look',
    preview: ['220 45% 15%', '220 60% 50%', '220 70% 65%'],
    colors: {
      'background': '220 25% 8%',
      'foreground': '220 15% 92%',
      'card': '220 25% 12%',
      'card-foreground': '220 15% 92%',
      'popover': '220 25% 12%',
      'popover-foreground': '220 15% 92%',
      'primary': '220 70% 55%',
      'primary-foreground': '220 25% 8%',
      'secondary': '220 20% 18%',
      'secondary-foreground': '220 15% 92%',
      'muted': '220 15% 22%',
      'muted-foreground': '220 12% 55%',
      'accent': '220 45% 25%',
      'accent-foreground': '220 15% 92%',
      'oat': '220 25% 28%',
      'gold': '45 80% 50%',
      'border': '220 18% 22%',
      'input': '220 20% 18%',
      'ring': '220 70% 55%',
      'sidebar-background': '220 25% 10%',
      'sidebar-foreground': '220 15% 92%',
      'sidebar-primary': '220 70% 55%',
      'sidebar-primary-foreground': '220 25% 8%',
      'sidebar-accent': '220 20% 18%',
      'sidebar-accent-foreground': '220 15% 92%',
      'sidebar-border': '220 18% 22%',
      'sidebar-ring': '220 70% 55%',
    },
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm orange and amber tones for a cozy feel',
    preview: ['25 95% 55%', '35 90% 60%', '15 85% 50%'],
    colors: {
      'background': '30 40% 97%',
      'foreground': '20 30% 12%',
      'card': '30 35% 99%',
      'card-foreground': '20 30% 12%',
      'popover': '30 35% 99%',
      'popover-foreground': '20 30% 12%',
      'primary': '25 95% 53%',
      'primary-foreground': '0 0% 100%',
      'secondary': '35 30% 92%',
      'secondary-foreground': '20 30% 12%',
      'muted': '35 25% 88%',
      'muted-foreground': '25 15% 45%',
      'accent': '35 40% 90%',
      'accent-foreground': '20 30% 12%',
      'oat': '35 45% 82%',
      'gold': '38 85% 50%',
      'border': '35 25% 85%',
      'input': '35 25% 90%',
      'ring': '25 95% 53%',
      'sidebar-background': '30 35% 98%',
      'sidebar-foreground': '20 30% 12%',
      'sidebar-primary': '25 95% 53%',
      'sidebar-primary-foreground': '0 0% 100%',
      'sidebar-accent': '35 30% 92%',
      'sidebar-accent-foreground': '20 30% 12%',
      'sidebar-border': '35 25% 85%',
      'sidebar-ring': '25 95% 53%',
    },
  },
  forest: {
    name: 'Forest',
    description: 'Deep greens and earthy tones for a natural vibe',
    preview: ['145 45% 30%', '145 35% 45%', '120 30% 25%'],
    colors: {
      'background': '145 20% 8%',
      'foreground': '145 12% 92%',
      'card': '145 18% 12%',
      'card-foreground': '145 12% 92%',
      'popover': '145 18% 12%',
      'popover-foreground': '145 12% 92%',
      'primary': '145 50% 42%',
      'primary-foreground': '145 20% 8%',
      'secondary': '145 15% 18%',
      'secondary-foreground': '145 12% 92%',
      'muted': '145 12% 22%',
      'muted-foreground': '145 10% 55%',
      'accent': '145 25% 25%',
      'accent-foreground': '145 12% 92%',
      'oat': '145 20% 28%',
      'gold': '45 75% 48%',
      'border': '145 15% 22%',
      'input': '145 15% 18%',
      'ring': '145 50% 42%',
      'sidebar-background': '145 18% 10%',
      'sidebar-foreground': '145 12% 92%',
      'sidebar-primary': '145 50% 42%',
      'sidebar-primary-foreground': '145 20% 8%',
      'sidebar-accent': '145 15% 18%',
      'sidebar-accent-foreground': '145 12% 92%',
      'sidebar-border': '145 15% 22%',
      'sidebar-ring': '145 50% 42%',
    },
  },
  lavender: {
    name: 'Lavender',
    description: 'Soft purple tones for a calming atmosphere',
    preview: ['270 50% 70%', '280 45% 60%', '260 40% 75%'],
    colors: {
      'background': '270 30% 97%',
      'foreground': '270 25% 15%',
      'card': '270 25% 99%',
      'card-foreground': '270 25% 15%',
      'popover': '270 25% 99%',
      'popover-foreground': '270 25% 15%',
      'primary': '270 55% 55%',
      'primary-foreground': '0 0% 100%',
      'secondary': '270 20% 93%',
      'secondary-foreground': '270 25% 15%',
      'muted': '270 15% 90%',
      'muted-foreground': '270 12% 48%',
      'accent': '270 30% 92%',
      'accent-foreground': '270 25% 15%',
      'oat': '270 25% 85%',
      'gold': '42 75% 48%',
      'border': '270 18% 88%',
      'input': '270 18% 92%',
      'ring': '270 55% 55%',
      'sidebar-background': '270 25% 98%',
      'sidebar-foreground': '270 25% 15%',
      'sidebar-primary': '270 55% 55%',
      'sidebar-primary-foreground': '0 0% 100%',
      'sidebar-accent': '270 20% 93%',
      'sidebar-accent-foreground': '270 25% 15%',
      'sidebar-border': '270 18% 88%',
      'sidebar-ring': '270 55% 55%',
    },
  },
  cherry: {
    name: 'Cherry',
    description: 'Bold red and pink tones for a vibrant look',
    preview: ['350 80% 55%', '340 75% 60%', '355 70% 50%'],
    colors: {
      'background': '350 25% 8%',
      'foreground': '350 15% 92%',
      'card': '350 22% 12%',
      'card-foreground': '350 15% 92%',
      'popover': '350 22% 12%',
      'popover-foreground': '350 15% 92%',
      'primary': '350 75% 55%',
      'primary-foreground': '350 25% 8%',
      'secondary': '350 18% 18%',
      'secondary-foreground': '350 15% 92%',
      'muted': '350 12% 22%',
      'muted-foreground': '350 10% 55%',
      'accent': '350 30% 25%',
      'accent-foreground': '350 15% 92%',
      'oat': '350 22% 28%',
      'gold': '42 80% 50%',
      'border': '350 15% 22%',
      'input': '350 15% 18%',
      'ring': '350 75% 55%',
      'sidebar-background': '350 22% 10%',
      'sidebar-foreground': '350 15% 92%',
      'sidebar-primary': '350 75% 55%',
      'sidebar-primary-foreground': '350 25% 8%',
      'sidebar-accent': '350 18% 18%',
      'sidebar-accent-foreground': '350 15% 92%',
      'sidebar-border': '350 15% 22%',
      'sidebar-ring': '350 75% 55%',
    },
  },
};

export type ThemePresetKey = keyof typeof themePresets;

export type CustomTheme = Record<string, string>;

// Convert HSL string to hex for color picker
export function hslStringToHex(hslString: string): string {
  if (!hslString || hslString === 'transparent') return '#ffffff';
  
  // Parse "40 30% 96%" format
  const parts = hslString.trim().split(/\s+/);
  if (parts.length < 3) return '#ffffff';
  
  const h = parseFloat(parts[0]) || 0;
  const s = parseFloat(parts[1]) / 100 || 0;
  const l = parseFloat(parts[2]) / 100 || 0;
  
  // HSL to RGB conversion
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert hex to HSL string for CSS variables
export function hexToHslString(hex: string): string {
  if (!hex || hex === 'transparent') return '';
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '';
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Get current computed value of a CSS variable
export function getCSSVariable(varName: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
  return value;
}

// Apply CSS variable override
function setCSSVariable(varName: string, value: string): void {
  document.documentElement.style.setProperty(`--${varName}`, value);
}

// Remove CSS variable override (revert to stylesheet value)
function removeCSSVariable(varName: string): void {
  document.documentElement.style.removeProperty(`--${varName}`);
}

export function useCustomTheme() {
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(null);
  const [pendingChanges, setPendingChanges] = useState<CustomTheme>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Fetch current user and their custom theme
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        const { data, error } = await supabase
          .from('user_preferences')
          .select('custom_theme')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data?.custom_theme) {
          const theme = data.custom_theme as CustomTheme;
          setCustomTheme(theme);
          // Apply saved theme on load
          applyTheme(theme);
        }
      } catch (error) {
        console.error('Error fetching custom theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTheme();
  }, []);
  
  // Apply theme overrides to CSS variables
  const applyTheme = useCallback((theme: CustomTheme) => {
    Object.entries(theme).forEach(([key, value]) => {
      if (value) {
        setCSSVariable(key, value);
      }
    });
  }, []);
  
  // Set a single variable (for live preview)
  const setVariable = useCallback((key: string, hexValue: string) => {
    const hslValue = hexToHslString(hexValue);
    if (hslValue) {
      setCSSVariable(key, hslValue);
      setPendingChanges(prev => ({ ...prev, [key]: hslValue }));
    }
  }, []);
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;
  
  // Get merged theme (saved + pending)
  const getMergedTheme = useCallback((): CustomTheme => {
    return { ...customTheme, ...pendingChanges };
  }, [customTheme, pendingChanges]);
  
  // Save all pending changes to database
  const saveTheme = useCallback(async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to save theme changes",
        variant: "destructive",
      });
      return false;
    }
    
    setIsSaving(true);
    try {
      const mergedTheme = getMergedTheme();
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          custom_theme: mergedTheme,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (error) throw error;
      
      setCustomTheme(mergedTheme);
      setPendingChanges({});
      
      toast({
        title: "Theme saved",
        description: "Your custom theme has been saved and will persist across sessions",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving theme:', error);
      toast({
        title: "Error",
        description: "Failed to save theme. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, getMergedTheme, toast]);
  
  // Discard pending changes (revert to saved theme)
  const discardChanges = useCallback(() => {
    // Remove all CSS overrides
    Object.keys(pendingChanges).forEach(key => {
      removeCSSVariable(key);
    });
    
    // Re-apply saved theme
    if (customTheme) {
      applyTheme(customTheme);
    }
    
    setPendingChanges({});
  }, [pendingChanges, customTheme, applyTheme]);
  
  // Reset to default theme (clear all customizations)
  const resetToDefault = useCallback(async () => {
    if (!userId) return false;
    
    setIsSaving(true);
    try {
      // Clear all custom CSS overrides
      const allTokens = [
        ...editableTokens.core,
        ...editableTokens.brand,
        ...editableTokens.special,
        ...editableTokens.ui,
        ...editableTokens.sidebar,
      ];
      
      allTokens.forEach(token => {
        removeCSSVariable(token.key);
      });
      
      // Clear from database
      const { error } = await supabase
        .from('user_preferences')
        .update({ custom_theme: null })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      setCustomTheme(null);
      setPendingChanges({});
      
      toast({
        title: "Theme reset",
        description: "Your theme has been reset to the default",
      });
      
      return true;
    } catch (error) {
      console.error('Error resetting theme:', error);
      toast({
        title: "Error",
        description: "Failed to reset theme. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, toast]);
  
  // Export theme as JSON
  const exportTheme = useCallback(() => {
    const theme = getMergedTheme();
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [getMergedTheme]);
  
  // Import theme from JSON
  const importTheme = useCallback((jsonString: string) => {
    try {
      const theme = JSON.parse(jsonString) as CustomTheme;
      applyTheme(theme);
      setPendingChanges(theme);
      toast({
        title: "Theme imported",
        description: "Theme applied. Click Save to persist your changes.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Invalid file",
        description: "The file could not be parsed as a valid theme",
        variant: "destructive",
      });
      return false;
    }
  }, [applyTheme, toast]);
  
  // Apply a preset theme
  const applyPreset = useCallback((presetKey: ThemePresetKey) => {
    const preset = themePresets[presetKey];
    if (!preset) return;
    
    applyTheme(preset.colors);
    setPendingChanges(preset.colors);
    toast({
      title: `${preset.name} preset applied`,
      description: "Customize further or click Save to keep this theme.",
    });
  }, [applyTheme, toast]);
  
  return {
    customTheme,
    pendingChanges,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setVariable,
    saveTheme,
    discardChanges,
    resetToDefault,
    exportTheme,
    importTheme,
    applyPreset,
    getMergedTheme,
  };
}
