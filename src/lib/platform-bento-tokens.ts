/**
 * Platform Bento Design System — Size-Aware Tokens
 *
 * All platform admin UI components must import from here.
 * Radius scales proportionally with component footprint.
 *
 * Formula: radius = clamp(10px, ~3.5-4% of shortest side, 22px)
 *
 * ── NESTING HIERARCHY (CRITICAL) ──
 *
 * Parent containers MUST always have a larger radius than children.
 * Child cards MUST be reduced by 4–8px from parent.
 *
 *   container  → 22px  Outer wrapping containers, glass parent cards
 *   large      → 16px  Standard standalone cards (StatCards, analytics)
 *   medium     → 14px  Standard dashboard cards
 *   small      → 12px  Nested/inner cards inside containers
 *   micro      → 10px  Badges, pills, toggles
 *   xl         → 20px  Modals, drawers, overlays (not for nesting)
 *
 * Valid nesting:
 *   container (22px) → large (16px) or small (12px)
 *   large (16px)     → small (12px) or micro (10px)
 *
 * NEVER nest same-radius cards. NEVER let child exceed parent.
 */

export const platformBento = {
  radius: {
    container: 'rounded-[22px]',
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
export function getCardTier(size: 'sm' | 'md' | 'lg' | 'container') {
  const map = { sm: 'small', md: 'medium', lg: 'large', container: 'container' } as const;
  return map[size];
}
