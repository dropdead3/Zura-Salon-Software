import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ORG_LOGO_DARK,
  DEFAULT_ORG_LOGO_LIGHT,
  DEFAULT_ORG_ICON_DARK,
  DEFAULT_ORG_ICON_LIGHT,
} from '@/lib/platform-assets';

type OrgLogoVariant = 'sidebar' | 'sidebar-icon' | 'website' | 'website-icon';

interface OrganizationLogoProps {
  variant: OrgLogoVariant;
  /** The runtime branding URL from business settings or org record */
  logoUrl?: string | null;
  /** Fallback icon URL from business settings */
  iconUrl?: string | null;
  theme?: 'dark' | 'light';
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * Centralized organization logo resolver.
 * 
 * Resolves logo from:
 *   1. Organization business settings (runtime)
 *   2. Canonical bundled platform defaults (immutable fallback)
 * 
 * Handles load errors gracefully.
 */
export function OrganizationLogo({ variant, logoUrl, iconUrl, theme = 'dark', className, alt = 'Organization', style }: OrganizationLogoProps) {
  const [imgError, setImgError] = useState(false);

  const resolveSource = (): string => {
    if (imgError) return getFallback(variant, theme);

    switch (variant) {
      case 'sidebar':
      case 'website':
        if (logoUrl) return logoUrl;
        return theme === 'dark' ? DEFAULT_ORG_LOGO_DARK : DEFAULT_ORG_LOGO_LIGHT;
      case 'sidebar-icon':
      case 'website-icon':
        if (iconUrl) return iconUrl;
        if (logoUrl) return logoUrl;
        return theme === 'dark' ? DEFAULT_ORG_ICON_DARK : DEFAULT_ORG_ICON_LIGHT;
      default:
        return logoUrl || DEFAULT_ORG_LOGO_DARK;
    }
  };

  return (
    <img
      src={resolveSource()}
      alt={alt}
      className={cn('object-contain', className)}
      style={style}
      onError={() => setImgError(true)}
    />
  );
}

function getFallback(variant: OrgLogoVariant, theme: string): string {
  switch (variant) {
    case 'sidebar':
    case 'website':
      return theme === 'dark' ? DEFAULT_ORG_LOGO_DARK : DEFAULT_ORG_LOGO_LIGHT;
    case 'sidebar-icon':
    case 'website-icon':
      return theme === 'dark' ? DEFAULT_ORG_ICON_DARK : DEFAULT_ORG_ICON_LIGHT;
    default:
      return DEFAULT_ORG_LOGO_DARK;
  }
}
