import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gift, X, ChevronRight } from 'lucide-react';
import {
  isPopupActive,
  usePromotionalPopup,
  type PopupSurface,
  type PromotionalPopupSettings,
} from '@/hooks/usePromotionalPopup';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { useIsEditorPreview } from '@/hooks/useIsEditorPreview';
import { useOrgPath } from '@/hooks/useOrgPath';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getEyebrowIcon } from '@/lib/eyebrow-icons';

interface Props {
  /**
   * Logical surface this popup is being mounted on. The component still
   * filters via the operator's `showOn` list — this just identifies the
   * caller (used for frequency-cap key + `showOn` matching).
   */
  surface?: PopupSurface;
}

type DismissalRecord = {
  lastShownAt: number;
  response: 'accepted' | 'declined' | 'soft';
};

const STORAGE_PREFIX = 'zura.promo';

function storageKey(orgId: string, code: string) {
  return `${STORAGE_PREFIX}.${orgId}.${code || 'default'}`;
}

function readDismissal(orgId: string | undefined, code: string): DismissalRecord | null {
  if (!orgId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(orgId, code));
    return raw ? (JSON.parse(raw) as DismissalRecord) : null;
  } catch {
    return null;
  }
}

function writeDismissal(orgId: string | undefined, code: string, record: DismissalRecord) {
  if (!orgId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(orgId, code), JSON.stringify(record));
  } catch {
    // ignore quota errors — popup will simply re-show next visit
  }
}

function shouldRespectDismissal(
  cfg: PromotionalPopupSettings,
  record: DismissalRecord | null,
): boolean {
  if (!record) return false;
  // Once a visitor accepts or declines, never re-prompt under 'once'.
  if (cfg.frequency === 'once') return true;
  if (cfg.frequency === 'always') return false;
  if (cfg.frequency === 'once-per-session') {
    // Session-scoped: dismissed records survive for the active session only.
    // We piggy-back on sessionStorage as a session sentinel.
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}.session`) === 'dismissed';
  }
  if (cfg.frequency === 'daily') {
    return Date.now() - record.lastShownAt < 24 * 60 * 60 * 1000;
  }
  return false;
}

function markSessionDismissed() {
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
      sid = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return '';
  }
}

async function recordResponse(args: {
  organizationId: string | undefined | null;
  offerCode: string;
  surface: PopupSurface;
  response: 'accepted' | 'declined' | 'soft';
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
    });
  } catch (err) {
    // Non-fatal: localStorage already records the dismissal client-side.
    console.warn('[promo] failed to record response', err);
  }
}

export function PromotionalPopup({ surface = 'all-public' }: Props) {
  const orgId = useSettingsOrgId();
  const orgPath = useOrgPath();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: cfg } = usePromotionalPopup();
  // Editor-preview QA mode: bypass frequency caps + force immediate trigger
  // so operators can faithfully QA enable/disable + content. Real visitor
  // suppression rules (sessionStorage caps, analytics writes) are skipped.
  const isPreview = useIsEditorPreview();

  const [open, setOpen] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [pulseFab, setPulseFab] = useState(false);
  const triggeredRef = useRef(false);

  // Auto-suppress the entire offer prompt on the booking surface — if the
  // visitor reached booking organically (or via the accept handler), don't
  // double-ask. Detection is path-based so it survives slug variations.
  const onBookingSurface = useMemo(() => {
    return /\/booking(\/|$|\?)/i.test(location.pathname);
  }, [location.pathname]);

  // Hide popup completely when accept lands on the booking surface with the
  // matching promo code already attached. Avoids re-prompting after acceptance.
  const promoQueryParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('promo');
  }, [location.search]);

  const active = isPopupActive(cfg, surface);
  const code = cfg?.offerCode?.trim() ?? '';

  useEffect(() => {
    if (!active || !cfg) return;
    if (triggeredRef.current) return;
    if (promoQueryParam && promoQueryParam === code) return;
    // Booking surface = visitor is already in the funnel; don't double-ask.
    if (onBookingSurface && !isPreview) return;

    // In editor preview, bypass dismissal so reloads always re-show the popup.
    if (!isPreview) {
      const dismissal = readDismissal(orgId, code);
      if (shouldRespectDismissal(cfg, dismissal)) return;
    }

    let cleanup: (() => void) | undefined;

    const fire = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
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
        const threshold = cfg.triggerValueMs ?? 600; // px scrolled
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

  // One-time pulse hint: 30s after the FAB appears, gently pulse it once so
  // the visitor remembers the offer is still available. Session-scoped — we
  // never pulse twice in the same browsing session.
  const PULSE_SESSION_KEY = `${STORAGE_PREFIX}.fab-pulsed`;
  useEffect(() => {
    if (!showFab || open || isPreview) return;
    if (typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem(PULSE_SESSION_KEY) === '1') return;
    } catch { /* ignore */ }

    const t = window.setTimeout(() => {
      setPulseFab(true);
      try { window.sessionStorage.setItem(PULSE_SESSION_KEY, '1'); } catch { /* ignore */ }
      // Pulse runs for ~2.4s (3 cycles of 800ms), then we stop the animation
      // class so the FAB doesn't keep drawing attention indefinitely.
      const stop = window.setTimeout(() => setPulseFab(false), 2400);
      return () => window.clearTimeout(stop);
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [showFab, open, isPreview, PULSE_SESSION_KEY]);

  // Esc key closes (counts as soft dismiss — operator told us silence is valid).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSoftClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If the popup is disabled or config missing, render nothing at all.
  if (!active || !cfg) return null;
  // Auto-suppress on /booking — the visitor is in the funnel; the offer code
  // is already being honored via the URL param when relevant.
  if (onBookingSurface && !isPreview) return null;

  const accent = cfg.accentColor || 'hsl(var(--primary))';
  const fabPos = cfg.fabPosition === 'bottom-left' ? 'bottom-left' : 'bottom-right';

  function handleAccept() {
    if (!isPreview) {
      writeDismissal(orgId, code, { lastShownAt: Date.now(), response: 'accepted' });
      markSessionDismissed();
      void recordResponse({ organizationId: orgId, offerCode: code, surface, response: 'accepted' });
    }
    setOpen(false);
    setShowFab(false); // Offer claimed — no need for the re-entry FAB.
    if (isPreview) return; // Don't navigate the editor iframe — operator is QA'ing.
    // Land on the booking surface with the offer code attached. Booking
    // page surfaces it as a banner; checkout/payroll can later honor it.
    const target = orgPath('/booking');
    const params = new URLSearchParams();
    if (code) params.set('promo', code);
    navigate(params.toString() ? `${target}?${params.toString()}` : target);
  }

  function handleDecline() {
    if (!isPreview) {
      writeDismissal(orgId, code, { lastShownAt: Date.now(), response: 'declined' });
      markSessionDismissed();
      void recordResponse({ organizationId: orgId, offerCode: code, surface, response: 'declined' });
    }
    setOpen(false);
    if (!isPreview) setShowFab(true);
  }

  function handleSoftClose() {
    if (!isPreview) {
      // Soft dismiss respects the frequency cap but isn't a recorded decline.
      writeDismissal(orgId, code, { lastShownAt: Date.now(), response: 'soft' });
      markSessionDismissed();
      void recordResponse({ organizationId: orgId, offerCode: code, surface, response: 'soft' });
    }
    setOpen(false);
    if (!isPreview) setShowFab(true);
  }

  function handleFabOpen() {
    setShowFab(false);
    setOpen(true);
  }

  function handleFabDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setShowFab(false);
  }

  // FAB element rendered after dismissal. Reuses the offer's accent color and
  // headline so the visitor can re-open the offer at any time during the session.
  const fab = showFab && !open ? (
    <div
      className={cn(
        'fixed bottom-6 z-50 flex items-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300',
        fabPos === 'bottom-left' ? 'left-6 flex-row-reverse' : 'right-6',
      )}
    >
      <button
        type="button"
        onClick={handleFabOpen}
        aria-label={`Reopen offer: ${cfg.headline}`}
        className={cn(
          'group flex items-center gap-2 rounded-full pl-3 pr-4 sm:pr-5 h-12 shadow-2xl text-primary-foreground hover:scale-[1.03] transition-transform',
          // Session-scoped one-time pulse hint (~3 cycles, then auto-stops).
          pulseFab && 'motion-safe:animate-[promoFabPulse_800ms_ease-in-out_3]',
        )}
        style={{ backgroundColor: accent }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
          <Gift className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline font-display uppercase tracking-wider text-xs max-w-[180px] truncate">
          {cfg.headline}
        </span>
        <ChevronRight className="hidden sm:inline h-4 w-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
      </button>
      <button
        type="button"
        aria-label="Dismiss offer reminder"
        onClick={handleFabDismiss}
        className={cn(
          'hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 text-muted-foreground hover:text-foreground transition-colors',
          fabPos === 'bottom-left' ? 'mr-2' : 'ml-2',
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  if (!open) return fab;

  // ── Variant: corner-card (bottom-right toast-like) ──
  if (cfg.appearance === 'corner-card') {
    // Corner-card is the densest surface — operators can hide the image here
    // via `hidden-on-corner` so it doesn't crush headline + body. `side`
    // collapses to `top` (no room for a left rail at 360px).
    const cornerImageMode: 'top' | 'none' =
      !cfg.imageUrl || cfg.imageTreatment === 'hidden-on-corner' ? 'none' : 'top';
    return (
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="promo-popup-title"
        className="fixed bottom-6 right-6 z-50 w-[min(92vw,360px)] rounded-2xl bg-card border border-border shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-4"
        style={{ borderTopColor: accent, borderTopWidth: 3 }}
      >
        <PromoBody cfg={cfg} accent={accent} imageMode={cornerImageMode} onAccept={handleAccept} onDecline={handleDecline} onClose={handleSoftClose} compact />
      </div>
    );
  }

  // ── Variant: banner (top of viewport, full-width) ──
  if (cfg.appearance === 'banner') {
    return (
      <div
        role="dialog"
        aria-labelledby="promo-popup-title"
        className="fixed top-0 inset-x-0 z-50 bg-card border-b border-border shadow-md animate-in slide-in-from-top-2"
        style={{ borderBottomColor: accent, borderBottomWidth: 2 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {cfg.eyebrow && (() => {
              const Icon = getEyebrowIcon(cfg.eyebrowIcon);
              return (
                <p
                  className="font-display uppercase tracking-[0.18em] text-[10px] sm:text-[11px] mb-0.5 truncate inline-flex items-center gap-1"
                  style={{ color: accent }}
                >
                  {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  <span className="truncate">{cfg.eyebrow}</span>
                </p>
              );
            })()}
            <p
              id="promo-popup-title"
              className="font-display uppercase tracking-wide text-sm sm:text-base text-foreground truncate"
            >
              {cfg.headline}
            </p>
            {cfg.body && (
              <p className="font-sans text-xs sm:text-sm text-muted-foreground truncate">{cfg.body}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAccept}
              className="font-display uppercase tracking-wider text-xs px-4 py-2 rounded-full text-primary-foreground"
              style={{ backgroundColor: accent }}
            >
              {cfg.ctaAcceptLabel}
            </button>
            <button
              onClick={handleDecline}
              className="font-sans text-xs text-muted-foreground hover:text-foreground px-3 py-2"
              aria-label={cfg.ctaDeclineLabel}
            >
              {cfg.ctaDeclineLabel}
            </button>
            <button
              onClick={handleSoftClose}
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Variant: modal (default) ──
  // Image modes:
  //   - none: no image to render
  //   - top:  full-width strip above the headline (default `cover` behavior)
  //   - side: left rail (modal widens to max-w-2xl + grid layout)
  const modalImageMode: 'top' | 'side' | 'none' = !cfg.imageUrl
    ? 'none'
    : cfg.imageTreatment === 'side'
      ? 'side'
      : 'top';
  const modalWide = modalImageMode === 'side';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSoftClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        className={cn(
          'relative w-full rounded-2xl bg-card border border-border shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out overflow-hidden',
          modalWide ? 'max-w-2xl' : 'max-w-md',
        )}
        style={{ borderTopColor: accent, borderTopWidth: 4 }}
      >
        <button
          onClick={handleSoftClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground p-1 rounded-full bg-card/60 backdrop-blur"
        >
          <X className="h-4 w-4" />
        </button>
        {modalWide ? (
          <div className="grid grid-cols-[200px_1fr]">
            <div className="bg-muted">
              <img
                src={cfg.imageUrl}
                alt={cfg.imageAlt ?? ''}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 sm:p-8">
              <PromoBody cfg={cfg} accent={accent} imageMode="none" onAccept={handleAccept} onDecline={handleDecline} onClose={handleSoftClose} />
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <PromoBody cfg={cfg} accent={accent} imageMode={modalImageMode} onAccept={handleAccept} onDecline={handleDecline} onClose={handleSoftClose} />
          </div>
        )}
      </div>
    </div>
  );
}

function PromoBody({
  cfg,
  accent,
  onAccept,
  onDecline,
  compact = false,
}: {
  cfg: PromotionalPopupSettings;
  accent: string;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  compact?: boolean;
}) {
  return (
    <>
      {cfg.imageUrl && (
        <div
          className={cn(
            'mb-4 overflow-hidden rounded-xl bg-muted',
            compact ? 'h-24' : 'h-32 sm:h-40',
          )}
        >
          <img src={cfg.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {cfg.eyebrow && (() => {
        const Icon = getEyebrowIcon(cfg.eyebrowIcon);
        return (
          <p
            className={cn(
              'font-display uppercase tracking-[0.2em] mb-2 inline-flex items-center gap-1.5',
              compact ? 'text-[10px]' : 'text-[11px] sm:text-xs',
            )}
            style={{ color: accent }}
          >
            {Icon && <Icon className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden="true" />}
            <span>{cfg.eyebrow}</span>
          </p>
        );
      })()}
      <h2
        id="promo-popup-title"
        className={cn(
          'font-display uppercase tracking-wide text-foreground mb-2',
          compact ? 'text-base' : 'text-xl sm:text-2xl',
        )}
      >
        {cfg.headline}
      </h2>
      {cfg.body && (
        <p
          className={cn(
            'font-sans text-muted-foreground mb-4',
            compact ? 'text-sm' : 'text-sm sm:text-base',
          )}
        >
          {cfg.body}
        </p>
      )}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mb-3">
        <button
          onClick={onDecline}
          className="font-sans text-sm px-4 py-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
        >
          {cfg.ctaDeclineLabel}
        </button>
        <button
          onClick={onAccept}
          className="flex-1 font-display uppercase tracking-wider text-xs sm:text-sm px-5 py-2.5 rounded-full text-primary-foreground transition hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {cfg.ctaAcceptLabel}
        </button>
      </div>
      {cfg.disclaimer && (
        <p className="font-sans text-[11px] text-muted-foreground/80 leading-relaxed">{cfg.disclaimer}</p>
      )}
    </>
  );
}
