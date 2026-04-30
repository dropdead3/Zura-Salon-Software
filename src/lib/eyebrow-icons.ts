import { Zap, Gift, Clock, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EyebrowIcon } from '@/hooks/usePromotionalPopup';

/**
 * Curated eyebrow glyph set. Locked to four icons that map cleanly to the
 * common promo-eyebrow archetypes:
 *   - zap      → urgency / flash sale
 *   - gift     → reward / freebie
 *   - clock    → time-bound / countdown
 *   - sparkles → new / premium
 *
 * Kept centralized so the public renderer, in-editor swatches, and the
 * picker in the editor stay in lock-step. `none` returns `null` so callers
 * can branch with a single nullish check.
 */
export const EYEBROW_ICON_OPTIONS: { value: EyebrowIcon; label: string; icon: LucideIcon | null }[] = [
  { value: 'none', label: 'None', icon: null },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'clock', label: 'Clock', icon: Clock },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
];

export function getEyebrowIcon(icon: EyebrowIcon | undefined): LucideIcon | null {
  if (!icon || icon === 'none') return null;
  return EYEBROW_ICON_OPTIONS.find((o) => o.value === icon)?.icon ?? null;
}
