import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { useThemeAuthority } from '@/hooks/useThemeAuthority';

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

const SITE_SETTINGS_KEY = 'org_custom_typography';

type OrgTypographyValue = { tokens?: TypographyTheme } & Record<string, unknown>;

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

/**
 * Theme Governance — typography overrides are ORGANIZATION-scoped.
 * Persisted in `site_settings` row `org_custom_typography`. Mutations
 * are gated by `useThemeAuthority().canEditOrgTheme` (Account Owner only).
 * RLS enforces the same gate server-side.
 */
export function useTypographyTheme() {
  const [pendingChanges, setPendingChanges] = useState<TypographyTheme>({});
  const [currentValues, setCurrentValues] = useState<TypographyTheme>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const orgId = useSettingsOrgId();
  const { canEditOrgTheme } = useThemeAuthority();

  const { data: dbValue, isLoading } = useSiteSettings<OrgTypographyValue>(SITE_SETTINGS_KEY);
  const updateSetting = useUpdateSiteSetting<OrgTypographyValue>();

  const savedTheme: TypographyTheme | null = useMemo(
    () => (dbValue?.tokens as TypographyTheme | undefined) ?? null,
    [dbValue?.tokens]
  );

  // Apply theme overrides to CSS variables
  const applyTheme = useCallback((theme: TypographyTheme) => {
    Object.entries(theme).forEach(([key, value]) => {
      if (value) {
        setCSSVariable(key, value);
      }
    });
  }, []);

  // Apply saved org typography on load + initialize current values
  useEffect(() => {
    const defaults = getAllCurrentValues();
    if (savedTheme) {
      applyTheme(savedTheme);
      setCurrentValues({ ...defaults, ...savedTheme });
    } else {
      setCurrentValues(defaults);
    }
  }, [savedTheme, applyTheme]);

  // Set a single variable (for live preview)
  const setVariable = useCallback((key: string, value: string) => {
    setCSSVariable(key, value);
    setPendingChanges(prev => ({ ...prev, [key]: value }));
    setCurrentValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  const getMergedTheme = useCallback((): TypographyTheme => {
    return { ...savedTheme, ...pendingChanges };
  }, [savedTheme, pendingChanges]);

  // Save all pending changes — owner-gated, org-scoped
  const saveTheme = useCallback(async () => {
    if (!canEditOrgTheme) {
      toast({
        title: "Permission denied",
        description: "Only the Account Owner can change organization typography.",
        variant: "destructive",
      });
      return false;
    }
    if (!orgId) {
      toast({
        title: "Error",
        description: "No active organization context.",
        variant: "destructive",
      });
      return false;
    }

    setIsSaving(true);
    try {
      const mergedTheme = getMergedTheme();
      await updateSetting.mutateAsync({
        key: SITE_SETTINGS_KEY,
        value: { tokens: mergedTheme },
      });

      setPendingChanges({});

      toast({
        title: "Typography saved",
        description: "Organization typography has been updated for everyone.",
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
  }, [canEditOrgTheme, orgId, getMergedTheme, updateSetting, toast]);

  // Discard pending changes (revert to saved theme)
  const discardChanges = useCallback(() => {
    Object.keys(pendingChanges).forEach(key => {
      removeCSSVariable(key);
    });
    if (savedTheme) {
      applyTheme(savedTheme);
    }
    const defaults = getAllCurrentValues();
    if (savedTheme) {
      setCurrentValues({ ...defaults, ...savedTheme });
    } else {
      setCurrentValues(defaults);
    }
    setPendingChanges({});
  }, [pendingChanges, savedTheme, applyTheme]);

  // Reset to default typography — owner-gated, org-scoped
  const resetToDefault = useCallback(async () => {
    if (!canEditOrgTheme) {
      toast({
        title: "Permission denied",
        description: "Only the Account Owner can reset organization typography.",
        variant: "destructive",
      });
      return false;
    }
    if (!orgId) return false;

    setIsSaving(true);
    try {
      Object.values(typographyTokens).flat().forEach(token => {
        removeCSSVariable(token.key);
      });

      await updateSetting.mutateAsync({
        key: SITE_SETTINGS_KEY,
        value: { tokens: {} },
      });

      setPendingChanges({});
      setCurrentValues(getAllCurrentValues());

      toast({
        title: "Typography reset",
        description: "Organization typography has been reset to the default.",
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
  }, [canEditOrgTheme, orgId, updateSetting, toast]);

  return {
    savedTheme,
    pendingChanges,
    currentValues,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    canEditOrgTheme,
    setVariable,
    saveTheme,
    discardChanges,
    resetToDefault,
    getMergedTheme,
  };
}
