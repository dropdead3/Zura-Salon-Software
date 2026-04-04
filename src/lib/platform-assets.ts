/**
 * Canonical platform default assets.
 * 
 * These are immutable bundled fallbacks used when no runtime branding
 * is configured via platform settings. Never import raw SVGs from
 * src/assets in page/layout files — use these constants or the
 * resolver components instead.
 */
import brandWordmarkWhite from '@/assets/brand-wordmark-white.svg';
import brandWordmark from '@/assets/brand-wordmark.svg';
import brandLogoPrimaryWhite from '@/assets/brand-logo-primary-white.svg';
import brandLogoPrimary from '@/assets/brand-logo-primary.svg';
import brandLogoSecondaryWhite from '@/assets/brand-logo-secondary-white.svg';
import brandLogoSecondary from '@/assets/brand-logo-secondary.svg';
import brandIconWhite from '@/assets/brand-icon-white.svg';
import brandIcon from '@/assets/brand-icon.svg';
import zuraLogoWhite from '@/assets/zura-logo-white.svg';

// ── Canonical defaults per surface ──────────────────────────────────────────

/** Platform login page — always dark bg, needs white/light mark */
export const DEFAULT_LOGIN_LOGO = zuraLogoWhite;

/** Landing page nav — dark bg, white wordmark */
export const DEFAULT_LANDING_LOGO = brandWordmarkWhite;

/** Platform sidebar (expanded) — resolved by theme */
export const DEFAULT_PLATFORM_LOGO_DARK = brandWordmarkWhite;
export const DEFAULT_PLATFORM_LOGO_LIGHT = brandWordmark;

/** Platform sidebar (collapsed) — resolved by theme */
export const DEFAULT_PLATFORM_ICON_DARK = brandIconWhite;
export const DEFAULT_PLATFORM_ICON_LIGHT = brandIcon;

/** Organization sidebar (expanded) — resolved by theme */
export const DEFAULT_ORG_LOGO_DARK = brandLogoSecondaryWhite;
export const DEFAULT_ORG_LOGO_LIGHT = brandLogoSecondary;

/** Organization sidebar (collapsed) — falls back to logo */
export const DEFAULT_ORG_ICON_DARK = brandLogoSecondaryWhite;
export const DEFAULT_ORG_ICON_LIGHT = brandLogoSecondary;

// ── Re-exports for email templates / special surfaces ───────────────────────
export {
  brandWordmarkWhite,
  brandWordmark,
  brandLogoPrimaryWhite,
  brandLogoPrimary,
  brandLogoSecondaryWhite,
  brandLogoSecondary,
  brandIconWhite,
  brandIcon,
};
