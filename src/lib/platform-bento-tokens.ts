/**
 * Platform Bento Design System — Size-Aware Tokens
 *
 * All platform admin UI components must import from here.
 * Radius scales proportionally with component footprint.
 *
 * Formula: radius = clamp(10px, ~3.5-4% of shortest side, 22px)
 *
 * Tiers:
 *   micro  → badges, pills, toggles
 *   small  → stat tiles, KPI cards, inputs
 *   medium → standard dashboard cards
 *   large  → analytics panels, activity feed
 *   xl     → modals, drawers, overlays
 */

export const platformBento = {
  radius: {
    micro: 'rounded-[10px]',
    small: 'rounded-xl',       // 12px
    medium: 'rounded-[14px]',
    large: 'rounded-[16px]',
    xl: 'rounded-[20px]',
  },
  padding: {
    micro: 'px-2.5 py-1',
    small: 'p-3.5',
    medium: 'p-4',
    large: 'p-5',
    xl: 'p-6',
  },
  gap: {
    dense: 'gap-2.5',
    standard: 'gap-3.5',
    wide: 'gap-5',
  },
  shadow: {
    none: '',
    medium: 'shadow-sm shadow-black/5',
    large: 'shadow-md shadow-black/[0.08]',
    xl: 'shadow-lg shadow-black/10',
  },
  hover: {
    lift: 'hover:-translate-y-px',
    transition: 'transition-all duration-150 ease-out',
  },
} as const;

/** Base classes shared by all platform card-like containers */
export const PLATFORM_CARD_BASE =
  'border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl';

/** Map PlatformCard size prop to bento tier */
export function getCardTier(size: 'sm' | 'md' | 'lg') {
  const map = { sm: 'small', md: 'medium', lg: 'large' } as const;
  return map[size];
}
