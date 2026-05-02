import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  isPopupActive,
  type PopupSurface,
  type PromotionalPopupSettings,
} from '@/hooks/usePromotionalPopup';
import { useReplayableMount } from '@/hooks/useReplayableMount';
import { usePresenceLifecycle } from '@/hooks/usePresenceLifecycle';
import { clampAutoMinimizeSeconds } from '@/lib/clampAutoMinimizeSeconds';
import {
  PROMO_POPUP_PREVIEW_RESET_EVENT,
  dispatchPromoPopupPreviewState,
} from '@/lib/promoPopupPreviewReset';

// ─────────────────────────────────────────────────────────────────────────
// Storage helpers — frequency cap + soft-dismiss tracking
// ─────────────────────────────────────────────────────────────────────────

export const STORAGE_PREFIX = 'zura.promo';

export type DismissalRecord = {
  lastShownAt: number;
  response: 'accepted' | 'declined' | 'soft';
};

function storageKey(orgId: string, code: string) {
  return `${STORAGE_PREFIX}.${orgId}.${code || 'default'}`;
}

export function readDismissal(orgId: string | undefined, code: string): DismissalRecord | null {
  if (!orgId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(orgId, code));
    return raw ? (JSON.parse(raw) as DismissalRecord) : null;
  } catch {
    return null;
  }
}

export function writeDismissal(orgId: string | undefined, code: string, record: DismissalRecord) {
  if (!orgId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(orgId, code), JSON.stringify(record));
  } catch {
    // ignore quota errors — popup will simply re-show next visit
  }
}

export function shouldRespectDismissal(
  cfg: PromotionalPopupSettings,
  record: DismissalRecord | null,
): boolean {
  if (!record) return false;
  if (cfg.frequency === 'once') return true;
  if (cfg.frequency === 'always') return false;
  if (cfg.frequency === 'once-per-session') {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}.session`) === 'dismissed';
  }
  if (cfg.frequency === 'daily') {
    return Date.now() - record.lastShownAt < 24 * 60 * 60 * 1000;
  }
  return false;
}

export function markSessionDismissed() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}.session`, 'dismissed');
  } catch {
    // ignore
  }
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const key = `${STORAGE_PREFIX}.sid`;
    let sid = window.sessionStorage.getItem(key);
    if (!sid) {
      sid =
        (crypto as unknown as { randomUUID?: () => string })?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return '';
  }
}

/**
 * Records a single popup *impression* (render). Top-of-funnel signal that
 * pairs with `recordResponse` (CTA click / dismissal) and
 * `promotion_redemptions` (final booking) to produce a true conversion
 * funnel. De-duped per session at the DB level via a partial unique index
 * on `(org, code, surface, session_id)` so refreshes / re-mounts inside the
 * same session don't inflate impression counts.
 *
 * Suppressed during editor preview — the operator's QA renders shouldn't
 * pollute production analytics.
 */
export async function recordImpression(args: {
  organizationId: string | undefined | null;
  offerCode: string;
  surface: PopupSurface;
  /** Active A/B variant id (null when not in an experiment). Stamped onto
   *  the impression so the editor can break the funnel down per arm. */
  variantKey?: string | null;
}) {
  if (!args.organizationId) return;
  try {
    await supabase.rpc('record_promo_impression', {
      p_organization_id: args.organizationId,
      p_offer_code: args.offerCode || '',
      p_surface: args.surface,
      p_session_id: getOrCreateSessionId(),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      p_variant_key: args.variantKey ?? null,
    });
  } catch (err) {
    // Non-fatal: missing impression rows simply mean a slightly under-counted
    // funnel — never block the popup from rendering.
    console.warn('[promo] failed to record impression', err);
  }
}

export async function recordResponse(args: {
  organizationId: string | undefined | null;
  offerCode: string;
  surface: PopupSurface;
  response: 'accepted' | 'declined' | 'soft';
  /** Active A/B variant id (null when not in an experiment). */
  variantKey?: string | null;
}) {
  if (!args.organizationId) return;
  try {
    await supabase.rpc('record_promo_response', {
      p_organization_id: args.organizationId,
      p_offer_code: args.offerCode || '',
      p_surface: args.surface,
      p_response: args.response,
      p_session_id: getOrCreateSessionId(),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      p_variant_key: args.variantKey ?? null,
    });
  } catch (err) {
    // Non-fatal: localStorage already records the dismissal client-side.
    console.warn('[promo] failed to record response', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// usePromoLifecycle — the popup's open/close/FAB/countdown state machine
// ─────────────────────────────────────────────────────────────────────────

export type PromoCloseReason = 'soft' | 'decline' | 'accept';

export interface UsePromoLifecycleArgs {
  cfg: PromotionalPopupSettings | null | undefined;
  surface: PopupSurface;
  orgId: string | undefined;
  isPreview: boolean;
  /**
   * Called once after the close animation completes for a soft / decline
   * close. Production visitors get the FAB; the orchestrator decides whether
   * to surface it via this callback.
   */
  onAfterExit?: (reason: PromoCloseReason | null) => void;
}

export interface UsePromoLifecycle {
  // Gating
  active: boolean;
  code: string;
  onBookingSurface: boolean;
  promoQueryParam: string | null;

  // Phase + animation
  open: boolean;
  popupPhase: string;
  isClosing: boolean;
  animationNonce: number;
  onAnimationEnd: (e: React.AnimationEvent<HTMLElement>) => void;

  // FAB
  showFab: boolean;
  pulseFab: boolean;

  // Hover (auto-minimize pause)
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;

  // Auto-minimize countdown
  autoMinimizeSeconds: number | null;
  secondsLeft: number;

  // Operations
  beginExit: (reason: PromoCloseReason) => void;
  reopenFromFab: () => void;
  dismissFab: () => void;
}

/**
 * The popup's full state machine, extracted from the orchestrator so each
 * variant can stay a pure render function. Owns:
 *
 *   - trigger gating (immediate / delay / scroll / exit-intent)
 *   - frequency-cap dismissal storage
 *   - editor-preview short-circuits (immediate trigger, bypass caps,
 *     bypass real-visitor recording)
 *   - the three-phase presence lifecycle (entering / visible / closing)
 *   - the auto-minimize countdown + hover-pause behavior
 *   - the editor's "Restart popup preview" event channel (CustomEvent for
 *     same-window mounts + postMessage bridge for the iframe boundary)
 *   - the FAB show/hide + one-shot pulse hint
 *   - phase echo back to the editor (CustomEvent + postMessage parent bridge)
 *
 * The orchestrator is responsible for: data fetch (`usePromotionalPopup`),
 * the navigation-side effects of `accept` (which need router context), and
 * picking which variant to render based on `cfg.appearance`.
 */
export function usePromoLifecycle({
  cfg,
  surface,
  orgId,
  isPreview,
  onAfterExit,
}: UsePromoLifecycleArgs): UsePromoLifecycle {
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [pulseFab, setPulseFab] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [isHovered, setIsHovered] = useState(false);

  const popupLifecycle = usePresenceLifecycle<PromoCloseReason>({
    onExit: (reason) => {
      setOpen(false);
      // Accept = offer claimed → no FAB re-prompt. Soft + decline both
      // surface the FAB so the visitor can re-open during the session.
      setShowFab(reason !== 'accept');
      onAfterExit?.(reason);
    },
  });
  const popupPhase = popupLifecycle.phase;
  const { key: animationNonce, replay: replayPopupMount } = useReplayableMount();
  const triggeredRef = useRef(false);

  // Auto-suppress on /booking — visitor is in the funnel; don't double-ask.
  const onBookingSurface = useMemo(
    () => /\/booking(\/|$|\?)/i.test(location.pathname),
    [location.pathname],
  );
  const promoQueryParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('promo');
  }, [location.search]);

  const active = isPopupActive(cfg, surface);
  const code = cfg?.offerCode?.trim() ?? '';

  // ── Trigger gate (immediate / delay / scroll / exit-intent) ──
  useEffect(() => {
    if (!active || !cfg) return;
    if (triggeredRef.current) return;
    if (promoQueryParam && promoQueryParam === code) return;
    if (onBookingSurface && !isPreview) return;

    if (!isPreview) {
      const dismissal = readDismissal(orgId, code);
      if (shouldRespectDismissal(cfg, dismissal)) return;
    }

    let cleanup: (() => void) | undefined;

    const fire = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      popupLifecycle.reset();
      setOpen(true);
    };

    // In editor preview, force immediate trigger — delay/scroll/exit-intent
    // are unreliable inside a scaled iframe and would make QA feel broken.
    const effectiveTrigger = isPreview ? 'immediate' : cfg.trigger;

    switch (effectiveTrigger) {
      case 'immediate':
        fire();
        break;
      case 'delay': {
        const t = window.setTimeout(fire, cfg.triggerValueMs ?? 10000);
        cleanup = () => window.clearTimeout(t);
        break;
      }
      case 'scroll': {
        const threshold = cfg.triggerValueMs ?? 600;
        const onScroll = () => {
          if (window.scrollY >= threshold) fire();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        cleanup = () => window.removeEventListener('scroll', onScroll);
        break;
      }
      case 'exit-intent': {
        const onLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) fire();
        };
        document.addEventListener('mouseout', onLeave);
        cleanup = () => document.removeEventListener('mouseout', onLeave);
        break;
      }
    }

    return cleanup;
  }, [active, cfg, code, orgId, promoQueryParam, isPreview, onBookingSurface]);

  // ── One-time FAB pulse hint ──
  const PULSE_SESSION_KEY = `${STORAGE_PREFIX}.fab-pulsed`;
  useEffect(() => {
    if (!showFab || open || isPreview) return;
    if (typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem(PULSE_SESSION_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    const t = window.setTimeout(() => {
      setPulseFab(true);
      try {
        window.sessionStorage.setItem(PULSE_SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      const stop = window.setTimeout(() => setPulseFab(false), 2400);
      return () => window.clearTimeout(stop);
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [showFab, open, isPreview, PULSE_SESSION_KEY]);

  // ── Editor-driven lifecycle reset (CustomEvent + iframe postMessage) ──
  useEffect(() => {
    if (!isPreview) return;
    const runReset = () => {
      triggeredRef.current = false;
      setShowFab(false);
      popupLifecycle.reset();
      // Replay the mount BEFORE flipping `open` so React schedules a fresh
      // mount of the popup root in the same render pass.
      replayPopupMount();
      const seconds = clampAutoMinimizeSeconds(cfg?.autoMinimizeMs);
      if (seconds !== null) {
        setSecondsLeft(seconds);
      }
      setOpen(true);
    };
    const onReset = () => runReset();
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'PREVIEW_PROMO_POPUP_RESET') return;
      runReset();
    };
    window.addEventListener(PROMO_POPUP_PREVIEW_RESET_EVENT, onReset);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener(PROMO_POPUP_PREVIEW_RESET_EVENT, onReset);
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, cfg?.autoMinimizeMs]);

  // ── Echo lifecycle phase to the editor ──
  useEffect(() => {
    if (!isPreview) return;
    const phase = open ? 'open' : showFab ? 'fab' : 'idle';
    dispatchPromoPopupPreviewState(phase);
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'PREVIEW_PROMO_POPUP_STATE', phase }, '*');
      } catch {
        // Cross-origin parent — best-effort only.
      }
    }
  }, [isPreview, open, showFab]);

  // ── Esc closes (soft) ──
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') popupLifecycle.beginExit('soft');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Auto-minimize countdown ──
  const autoMinimizeMs = cfg?.autoMinimizeMs;
  const autoMinimizeSeconds = useMemo(
    () => clampAutoMinimizeSeconds(autoMinimizeMs),
    [autoMinimizeMs],
  );

  useEffect(() => {
    if (!open) return;
    if (autoMinimizeSeconds === null) return;
    setSecondsLeft(autoMinimizeSeconds);
  }, [open, autoMinimizeSeconds]);

  useEffect(() => {
    if (!open) return;
    if (autoMinimizeSeconds === null) return;
    if (isHovered) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(interval);
          popupLifecycle.beginExit('soft');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPreview, isHovered, autoMinimizeSeconds]);

  return {
    active,
    code,
    onBookingSurface,
    promoQueryParam,

    open,
    popupPhase,
    isClosing: popupLifecycle.isClosing,
    animationNonce,
    onAnimationEnd: popupLifecycle.onAnimationEnd,

    showFab,
    pulseFab,

    isHovered,
    setIsHovered,

    autoMinimizeSeconds,
    secondsLeft,

    beginExit: popupLifecycle.beginExit,
    reopenFromFab: () => {
      setShowFab(false);
      popupLifecycle.reset();
      replayPopupMount();
      setOpen(true);
    },
    dismissFab: () => {
      setShowFab(false);
    },
  };
}
