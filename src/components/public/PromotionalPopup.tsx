import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  type PopupSurface,
} from '@/hooks/usePromotionalPopup';
import { useResolvedPromotionalPopup } from '@/hooks/useResolvedPromotionalPopup';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { useIsEditorPreview } from '@/hooks/useIsEditorPreview';
import { useOrgPath } from '@/hooks/useOrgPath';
import { readableForegroundFor } from '@/lib/color-contrast';
// NOTE: heroAlignmentSignal is intentionally NOT consumed here. The FAB is a
// global anchored affordance — it must not reposition based on section-level
// layout state (operators read positional drift as a bug). See
// `mem://style/global-overlay-stability` and the FAB anchor regression test.
import { PromoModal } from './promo/PromoModal';
import { PromoBanner } from './promo/PromoBanner';
import { PromoCornerCard } from './promo/PromoCornerCard';
import { PromoFab } from './promo/PromoFab';
import {
  usePromoLifecycle,
  recordImpression,
  recordResponse,
  writeDismissal,
  markSessionDismissed,
} from './promo/usePromoLifecycle';
import { useEffect, useRef } from 'react';

interface Props {
  /**
   * Logical surface this popup is being mounted on. The component still
   * filters via the operator's `showOn` list — this just identifies the
   * caller (used for frequency-cap key + `showOn` matching).
   */
  surface?: PopupSurface;
}

/**
 * Promotional popup orchestrator. Slim shell that:
 *
 *   1. Fetches the org's popup config (`usePromotionalPopup`).
 *   2. Drives the lifecycle state machine via `usePromoLifecycle`.
 *   3. Wires accept/decline/soft-close handlers (which need router + orgId
 *      + preview-aware navigation).
 *   4. Renders ONE of three pure variant components (`PromoModal`,
 *      `PromoBanner`, `PromoCornerCard`) plus the dismissal `PromoFab`.
 *
 * All variant rendering is pure — props in, JSX out. The lifecycle hook is
 * the single source of truth for trigger gating, dismissal storage,
 * auto-minimize, preview-reset events, and FAB pulse hints.
 */
export function PromotionalPopup({ surface = 'all-public' }: Props) {
  const orgId = useSettingsOrgId();
  const orgPath = useOrgPath();
  const navigate = useNavigate();
  // Resolved = wrapper + any active schedule snapshot. Lifecycle (enabled,
  // targeting, frequency, offerCode) reads the wrapper; rendering reads the
  // resolved creative so a queued rotation swaps copy/imagery without
  // touching the lifecycle state machine.
  const { resolved: cfg, wrapper, variantKey } = useResolvedPromotionalPopup();
  const isPreview = useIsEditorPreview();

  // Lifecycle reads the wrapper (drives enabled/frequency/offerCode/targeting).
  // Creative comes from `cfg` (resolved, includes scheduled overrides).
  const lifecycle = usePromoLifecycle({ cfg: wrapper, surface, orgId, isPreview });

  // Disabled / no config → render nothing at all.
  if (!lifecycle.active || !cfg) return null;
  // Auto-suppress on /booking — the visitor is in the funnel already.
  if (lifecycle.onBookingSurface && !isPreview) return null;

  const accent = cfg.accentColor || 'hsl(var(--primary))';
  const accentFg = readableForegroundFor(cfg.accentColor);
  const fabPos = cfg.fabPosition === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  const code = lifecycle.code;

  // Record one impression per session for this (org, code, surface). DB-level
  // partial unique index dedups; this guard just avoids the wasted round-trip
  // on re-renders / FAB reopen within the same mount. Preview suppressed —
  // operator QA shouldn't pollute production funnel data.
  const impressionRecordedRef = useRef(false);
  useEffect(() => {
    if (isPreview) return;
    if (!orgId || !lifecycle.open) return;
    if (impressionRecordedRef.current) return;
    impressionRecordedRef.current = true;
    void recordImpression({ organizationId: orgId, offerCode: code, surface, variantKey });
  }, [isPreview, orgId, lifecycle.open, code, surface, variantKey]);


  function handleAccept() {
    const destination = cfg!.acceptDestination ?? 'booking';

    // Editor preview: never navigate the iframe — the operator is QA'ing.
    // Surface a toast describing the simulated downstream action.
    if (isPreview) {
      const codeLabel = code ? `code ${code}` : 'no offer code';
      const simulated =
        destination === 'consultation'
          ? `Visitor would be sent to consultation booking with ${codeLabel}.`
          : destination === 'custom-url'
            ? cfg!.customUrl
              ? `Visitor would be sent to ${cfg!.customUrl}.`
              : `Visitor would see your custom instructions${cfg!.customUrlInstructions ? `: "${cfg!.customUrlInstructions}"` : '.'}`
            : `Visitor would be sent to /booking with ${codeLabel}.`;
      toast.success('Claim Offer (preview)', { description: simulated });
      lifecycle.beginExit('accept');
      return;
    }

    writeDismissal(orgId, code, { lastShownAt: Date.now(), response: 'accepted' });
    markSessionDismissed(orgId, code);
    void recordResponse({ organizationId: orgId, offerCode: code, surface, response: 'accepted', variantKey });
    lifecycle.beginExit('accept');

    // Custom URL: open externally in a new tab. tel:/mailto: trigger the
    // device handler. Operator-supplied — only sanity-check the prefix.
    if (destination === 'custom-url' && cfg!.customUrl) {
      const url = cfg!.customUrl.trim();
      const safe = /^(https?:|tel:|mailto:)/i.test(url);
      if (safe) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      // Falls through to booking if URL is malformed — better than a dead click.
    }

    // Booking + consultation: deep link into the public booking surface.
    const target = orgPath('/booking');
    const params = new URLSearchParams();
    if (code) params.set('promo', code);
    if (destination === 'consultation') params.set('consultation', 'true');
    // Variant tag closes the funnel: HostedBookingPage forwards `?v=` to the
    // booking edge function, which stamps it onto promotion_redemptions so
    // the experiment card can attribute bookings to the arm the visitor
    // actually saw — not just CTR.
    if (variantKey) params.set('v', variantKey);
    navigate(params.toString() ? `${target}?${params.toString()}` : target);
  }

  function handleDecline() {
    if (!isPreview) {
      writeDismissal(orgId, code, { lastShownAt: Date.now(), response: 'declined' });
      markSessionDismissed(orgId, code);
      void recordResponse({ organizationId: orgId, offerCode: code, surface, response: 'declined', variantKey });
    }
    lifecycle.beginExit('decline');
  }

  function handleSoftClose() {
    if (!isPreview) {
      writeDismissal(orgId, code, { lastShownAt: Date.now(), response: 'soft' });
      markSessionDismissed(orgId, code);
      void recordResponse({ organizationId: orgId, offerCode: code, surface, response: 'soft', variantKey });
    }
    lifecycle.beginExit('soft');
  }

  // FAB rendered after dismissal (soft / decline). Suppressed when the
  // popup is open or the visitor accepted.
  const fab = lifecycle.showFab && !lifecycle.open ? (
    <PromoFab
      headline={cfg.headline}
      position={fabPos}
      accent={accent}
      accentFg={accentFg}
      pulsing={lifecycle.pulseFab}
      onOpen={lifecycle.reopenFromFab}
      onDismiss={(e) => {
        e.stopPropagation();
        lifecycle.dismissFab();
      }}
    />
  ) : null;

  if (!lifecycle.open) return fab;

  // Countdown packet shared by every variant root. `null` when operator
  // disabled auto-minimize.
  const countdown =
    lifecycle.autoMinimizeSeconds !== null
      ? { secondsLeft: lifecycle.secondsLeft, totalSeconds: lifecycle.autoMinimizeSeconds }
      : null;

  const sharedVariantProps = {
    cfg,
    accent,
    accentFg,
    animationNonce: lifecycle.animationNonce,
    popupPhase: lifecycle.popupPhase,
    isClosing: lifecycle.isClosing,
    isHovered: lifecycle.isHovered,
    setIsHovered: lifecycle.setIsHovered,
    onAccept: handleAccept,
    onDecline: handleDecline,
    onSoftClose: handleSoftClose,
    onAnimationEnd: lifecycle.onAnimationEnd,
    countdown,
  };

  if (cfg.appearance === 'corner-card') {
    return <PromoCornerCard {...sharedVariantProps} fabPosition={fabPos} />;
  }
  if (cfg.appearance === 'banner') {
    return <PromoBanner {...sharedVariantProps} />;
  }
  return <PromoModal {...sharedVariantProps} />;
}
