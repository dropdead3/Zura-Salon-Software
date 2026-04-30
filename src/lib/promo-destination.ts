import type { PopupAcceptDestination, PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';

/**
 * Resolves the URL a visitor will land on when they click "Claim Offer".
 * Returns both a compact display path (for inline chip rendering) and the
 * fully-qualified URL (for tooltip / copy-to-clipboard). Mirrors the runtime
 * logic in `PromotionalPopup.tsx#handleAccept` so the editor preview never
 * drifts from what the live popup actually does.
 *
 * Returns `null` when the destination cannot be resolved (e.g., custom URL is
 * empty, public URL not yet ready). Callers should fall back to a hint, not a
 * fabricated path.
 */
export interface ResolvedDestination {
  /** Compact form for the inline chip — relative path or scheme-only summary. */
  shortLabel: string;
  /** Fully-qualified URL revealed on hover / for copy actions. */
  fullUrl: string;
  /** True when the destination is external (https/tel/mailto) and will open a new tab. */
  isExternal: boolean;
}

export function resolvePopupDestination(
  cfg: Pick<
    PromotionalPopupSettings,
    'acceptDestination' | 'customUrl' | 'offerCode'
  >,
  publicBookingUrl: string | null,
): ResolvedDestination | null {
  const destination: PopupAcceptDestination = cfg.acceptDestination ?? 'booking';
  const code = (cfg.offerCode ?? '').trim();

  if (destination === 'custom-url') {
    const raw = (cfg.customUrl ?? '').trim();
    if (!raw) return null;
    if (!/^(https?:|tel:|mailto:)/i.test(raw)) return null;
    if (/^tel:/i.test(raw)) {
      return { shortLabel: raw, fullUrl: raw, isExternal: true };
    }
    if (/^mailto:/i.test(raw)) {
      return { shortLabel: raw, fullUrl: raw, isExternal: true };
    }
    // https://example.com/path → host + path
    try {
      const u = new URL(raw);
      const short = `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
      return { shortLabel: short, fullUrl: raw, isExternal: true };
    } catch {
      return { shortLabel: raw, fullUrl: raw, isExternal: true };
    }
  }

  // booking + consultation share the same target — the booking surface itself.
  if (!publicBookingUrl) return null;

  const params = new URLSearchParams();
  if (code) params.set('promo', code);
  if (destination === 'consultation') params.set('consultation', 'true');

  const qs = params.toString();
  const full = qs ? `${publicBookingUrl}?${qs}` : publicBookingUrl;

  // Compact path: strip protocol + host so the chip stays scannable.
  let short = full;
  try {
    const u = new URL(full);
    short = `${u.pathname}${u.search}`;
  } catch {
    // Leave as-is.
  }

  return { shortLabel: short, fullUrl: full, isExternal: false };
}
