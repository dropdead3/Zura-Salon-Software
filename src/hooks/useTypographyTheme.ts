import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Typography token definitions with defaults
export const typographyTokens = {
  fontSize: [
    { key: 'font-size-xs', label: 'Extra Small', defaultValue: '12px', category: 'fontSize' },
    { key: 'font-size-sm', label: 'Small', defaultValue: '14px', category: 'fontSize' },
    { key: 'font-size-base', label: 'Base', defaultValue: '16px', category: 'fontSize' },
    { key: 'font-size-lg', label: 'Large', defaultValue: '18px', category: 'fontSize' },
    { key: 'font-size-xl', label: 'Extra Large', defaultValue: '20px', category: 'fontSize' },
    { key: 'font-size-2xl', label: '2X Large', defaultValue: '24px', category: 'fontSize' },
    { key: 'font-size-3xl', label: '3X Large', defaultValue: '30px', category: 'fontSize' },
    { key: 'font-size-4xl', label: '4X Large', defaultValue: '36px', category: 'fontSize' },
  ],
  fontWeight: [
    { key: 'font-weight-normal', label: 'Normal', defaultValue: '400', category: 'fontWeight' },
    { key: 'font-weight-medium', label: 'Medium', defaultValue: '500', category: 'fontWeight' },
    { key: 'font-weight-semibold', label: 'Semibold', defaultValue: '600', category: 'fontWeight' },
    { key: 'font-weight-bold', label: 'Bold', defaultValue: '700', category: 'fontWeight' },
  ],
  letterSpacing: [
    { key: 'tracking-tighter', label: 'Tighter', defaultValue: '-0.05em', category: 'letterSpacing' },
    { key: 'tracking-tight', label: 'Tight', defaultValue: '-0.025em', category: 'letterSpacing' },
    { key: 'tracking-normal', label: 'Normal', defaultValue: '0em', category: 'letterSpacing' },
    { key: 'tracking-wide', label: 'Wide', defaultValue: '0.025em', category: 'letterSpacing' },
    { key: 'tracking-wider', label: 'Wider', defaultValue: '0.05em', category: 'letterSpacing' },
    { key: 'tracking-widest', label: 'Widest', defaultValue: '0.1em', category: 'letterSpacing' },
    { key: 'tracking-display', label: 'Display (Headlines)', defaultValue: '0.05em', category: 'letterSpacing' },
  ],
  lineHeight: [
    { key: 'leading-none', label: 'None', defaultValue: '1', category: 'lineHeight' },
    { key: 'leading-tight', label: 'Tight', defaultValue: '1.25', category: 'lineHeight' },
    { key: 'leading-snug', label: 'Snug', defaultValue: '1.375', category: 'lineHeight' },
    { key: 'leading-normal', label: 'Normal', defaultValue: '1.5', category: 'lineHeight' },
    { key: 'leading-relaxed', label: 'Relaxed', defaultValue: '1.625', category: 'lineHeight' },
    { key: 'leading-loose', label: 'Loose', defaultValue: '2', category: 'lineHeight' },
  ],
};

export type TypographyCategory = keyof typeof typographyTokens;
export type TypographyTheme = Record<string, string>;

// Get current computed value of a CSS variable
function getCSSVariable(varName: string): string {
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

// Get all current values
function getAllCurrentValues(): TypographyTheme {
  const values: TypographyTheme = {};
  Object.values(typographyTokens).flat().forEach(token => {
    const current = getCSSVariable(token.key);
    values[token.key] = current || token.defaultValue;
  });
  return values;
}

export function useTypographyTheme() {
  const [savedTheme, setSavedTheme] = useState<TypographyTheme | null>(null);
  const [pendingChanges, setPendingChanges] = useState<TypographyTheme>({});
  const [currentValues, setCurrentValues] = useState<TypographyTheme>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Fetch current user and their custom typography theme
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        // Get initial values from computed styles
        setCurrentValues(getAllCurrentValues());
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        const { data, error } = await supabase
          .from('user_preferences')
          .select('custom_typography')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data?.custom_typography) {
          const theme = data.custom_typography as TypographyTheme;
          setSavedTheme(theme);
          // Apply saved theme on load
          applyTheme(theme);
          // Update current values
          setCurrentValues(prev => ({ ...prev, ...theme }));
        }
      } catch (error) {
        console.error('Error fetching typography theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTheme();
  }, []);
  
  // Apply theme overrides to CSS variables
  const applyTheme = useCallback((theme: TypographyTheme) => {
    Object.entries(theme).forEach(([key, value]) => {
      if (value) {
        setCSSVariable(key, value);
      }
    });
  }, []);
  
  // Set a single variable (for live preview)
  const setVariable = useCallback((key: string, value: string) => {
    setCSSVariable(key, value);
    setPendingChanges(prev => ({ ...prev, [key]: value }));
    setCurrentValues(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;
  
  // Get merged theme (saved + pending)
  const getMergedTheme = useCallback((): TypographyTheme => {
    return { ...savedTheme, ...pendingChanges };
  }, [savedTheme, pendingChanges]);
  
  // Save all pending changes to database
  const saveTheme = useCallback(async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to save typography changes",
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
          custom_typography: mergedTheme,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (error) throw error;
      
      setSavedTheme(mergedTheme);
      setPendingChanges({});
      
      toast({
        title: "Typography saved",
        description: "Your custom typography has been saved and will persist across sessions",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving typography:', error);
      toast({
        title: "Error",
        description: "Failed to save typography. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, getMergedTheme, toast]);
  
  // Discard pending changes (revert to saved theme)
  const discardChanges = useCallback(() => {
    // Remove all CSS overrides for pending changes
    Object.keys(pendingChanges).forEach(key => {
      removeCSSVariable(key);
    });
    
    // Re-apply saved theme
    if (savedTheme) {
      applyTheme(savedTheme);
    }
    
    // Reset current values
    const defaults = getAllCurrentValues();
    if (savedTheme) {
      setCurrentValues({ ...defaults, ...savedTheme });
    } else {
      setCurrentValues(defaults);
    }
    
    setPendingChanges({});
  }, [pendingChanges, savedTheme, applyTheme]);
  
  // Reset to default typography (clear all customizations)
  const resetToDefault = useCallback(async () => {
    if (!userId) return false;
    
    setIsSaving(true);
    try {
      // Clear all custom CSS overrides
      Object.values(typographyTokens).flat().forEach(token => {
        removeCSSVariable(token.key);
      });
      
      // Clear from database
      const { error } = await supabase
        .from('user_preferences')
        .update({ custom_typography: null })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      setSavedTheme(null);
      setPendingChanges({});
      setCurrentValues(getAllCurrentValues());
      
      toast({
        title: "Typography reset",
        description: "Your typography has been reset to the default",
      });
      
      return true;
    } catch (error) {
      console.error('Error resetting typography:', error);
      toast({
        title: "Error",
        description: "Failed to reset typography. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, toast]);
  
  return {
    savedTheme,
    pendingChanges,
    currentValues,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setVariable,
    saveTheme,
    discardChanges,
    resetToDefault,
    getMergedTheme,
  };
}
