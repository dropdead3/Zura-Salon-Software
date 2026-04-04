import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePlatformBranding } from '@/hooks/usePlatformBranding';
import {
  DEFAULT_LOGIN_LOGO,
  DEFAULT_LANDING_LOGO,
  DEFAULT_PLATFORM_LOGO_DARK,
  DEFAULT_PLATFORM_LOGO_LIGHT,
  DEFAULT_PLATFORM_ICON_DARK,
  DEFAULT_PLATFORM_ICON_LIGHT,
} from '@/lib/platform-assets';
import { PLATFORM_NAME } from '@/lib/brand';

type PlatformLogoVariant = 'login' | 'landing' | 'sidebar' | 'sidebar-icon';

interface PlatformLogoProps {
  variant: PlatformLogoVariant;
  /** 'dark' | 'light' — for sidebar variants that depend on theme */
  theme?: 'dark' | 'light';
  className?: string;
  alt?: string;
}

/**
 * Centralized platform logo resolver.
 * 
 * Resolves the correct logo source from:
 *   1. Platform branding settings (runtime config)
 *   2. Canonical bundled defaults (immutable fallback)
 * 
 * Handles image load errors gracefully by falling back to defaults.
 */
export function PlatformLogo({ variant, theme = 'dark', className, alt }: PlatformLogoProps) {
  const { branding } = usePlatformBranding();
  const [imgError, setImgError] = useState(false);

  const resolveSource = (): string => {
    if (imgError) return getFallback(variant, theme);

    switch (variant) {
      case 'login':
        return branding.login_logo_url || branding.primary_logo_url || DEFAULT_LOGIN_LOGO;
      case 'landing':
        return branding.login_logo_url || branding.primary_logo_url || DEFAULT_LANDING_LOGO;
      case 'sidebar':
        return theme === 'dark'
          ? (branding.primary_logo_url || DEFAULT_PLATFORM_LOGO_DARK)
          : (branding.secondary_logo_url || DEFAULT_PLATFORM_LOGO_LIGHT);
      case 'sidebar-icon':
        return theme === 'dark'
          ? (branding.icon_dark_url || DEFAULT_PLATFORM_ICON_DARK)
          : (branding.icon_light_url || DEFAULT_PLATFORM_ICON_LIGHT);
      default:
        return DEFAULT_PLATFORM_LOGO_DARK;
    }
  };

  return (
    <img
      src={resolveSource()}
      alt={alt || PLATFORM_NAME}
      className={cn('object-contain', className)}
      onError={() => setImgError(true)}
    />
  );
}

function getFallback(variant: PlatformLogoVariant, theme: string): string {
  switch (variant) {
    case 'login': return DEFAULT_LOGIN_LOGO;
    case 'landing': return DEFAULT_LANDING_LOGO;
    case 'sidebar':
      return theme === 'dark' ? DEFAULT_PLATFORM_LOGO_DARK : DEFAULT_PLATFORM_LOGO_LIGHT;
    case 'sidebar-icon':
      return theme === 'dark' ? DEFAULT_PLATFORM_ICON_DARK : DEFAULT_PLATFORM_ICON_LIGHT;
    default:
      return DEFAULT_PLATFORM_LOGO_DARK;
  }
}
