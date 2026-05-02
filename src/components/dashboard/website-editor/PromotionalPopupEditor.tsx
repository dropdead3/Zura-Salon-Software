import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Megaphone, Loader2, RotateCcw, Gift, X, ExternalLink, Link2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/Sparkline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolvePopupDestination } from '@/lib/promo-destination';
import { usePromotionalPopupRedemptions } from '@/hooks/usePromotionalPopupRedemptions';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrency } from '@/lib/formatCurrency';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useWebsiteColorTheme } from '@/hooks/useWebsiteColorTheme';
import { readThemeTokenSwatches, subscribeToThemeChanges } from '@/lib/themeTokenSwatches';
import { EYEBROW_ICON_OPTIONS, getEyebrowIcon } from '@/lib/eyebrow-icons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { EditorCard } from './EditorCard';
import { MediaWithFocalPoint } from '@/components/ui/media-with-focal-point';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useEditorDirtyState } from '@/hooks/useEditorDirtyState';
import {
  usePersistGuards,
  makeOverflowGuard,
  makeContrastGuard,
} from '@/hooks/usePersistGuards';
import { GlyphPicker } from '@/components/ui/glyph-picker';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { useOrgPublicUrl } from '@/hooks/useOrgPublicUrl';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import {
  dispatchPromoPopupPreviewReset,
  getLastPromoPopupPreviewPhase,
  PROMO_POPUP_PREVIEW_STATE_EVENT,
  type PromoPopupPreviewPhase,
  type PromoPopupPreviewStateDetail,
} from '@/lib/promoPopupPreviewReset';
import { coerceAutoMinimizeMs } from '@/lib/clampAutoMinimizeSeconds';
import { createEditorTelemetry } from '@/lib/editor-telemetry';
import { cn } from '@/lib/utils';
import { bestTextContrast } from '@/lib/color-contrast';
import {
  usePromotionalPopup,
  useUpdatePromotionalPopup,
  DEFAULT_PROMO_POPUP,
  resolveImageRender,
  type PromotionalPopupSettings,
  type PopupSurface,
  type EyebrowIcon,
  type PopupAcceptDestination,
  type ModalImageLayout,
  type CornerCardImage,
} from '@/hooks/usePromotionalPopup';
import { useBookingSurfaceConfig } from '@/hooks/useBookingSurfaceConfig';
import { useHydratedFormState } from '@/hooks/useHydratedFormState';
import { ThemeAwareColorInput } from './inputs/ThemeAwareColorInput';
// All pure helpers (constants, char counters, swatch mocks, datetime
// utilities, char-overflow detection, and the time-aware eyebrow chip)
// were lifted into a colocated `internals.tsx` module during the Wave 1
// editor split. The editor body itself (state, save flow, save guards,
// section JSX) stays here. Wave 2 will further decompose the body into
// per-tab sub-editors, but this PR is a pure refactor — zero behavior
// change. See `mem://architecture/promo-variant-parity-contract.md` for
// the parity rules around the public-side variants this editor configures.
import {
  SURFACE_OPTIONS,
  ACCENT_PRESETS,
  HEADLINE_CEILINGS,
  BODY_CEILINGS,
  DISCLAIMER_CEILING,
  collectOverflows,
  EyebrowUrgencySuggestion,
  Section,
  Field,
  CharCounter,
  appearanceLabel,
  FabPreviewSwatch,
  AppearancePreviewSwatch,
  toLocalInput,
  fromLocalInput,
  AccentContrastWarning,
  type OverflowFinding,
} from './promotional-popup/internals';
import { PromoLibraryCard } from './promotional-popup/PromoLibraryCard';
import { PopupAnalyticsCard } from './promotional-popup/PopupAnalyticsCard';
import { PromoScheduleCard } from './promotional-popup/PromoScheduleCard';
import { PromoExperimentCard } from './promotional-popup/PromoExperimentCard';
import { PromoGoalCard } from './promotional-popup/PromoGoalCard';

export function PromotionalPopupEditor() {
  const orgId = useSettingsOrgId();
  const { publicPageUrl } = useOrgPublicUrl();
  const { data: settings, isLoading } = usePromotionalPopup();
  const updateSettings = useUpdatePromotionalPopup();
  // Read booking surface config to know whether the org enforces a
  // consultation-required policy. The "Schedule a consultation" destination
  // is only enabled when this is set — otherwise the popup would route
  // visitors into a flow the booking surface doesn't actually gate.
  const { data: bookingConfig } = useBookingSurfaceConfig();
  const consultationPolicyEnabled =
    bookingConfig?.flow?.newClientPolicy === 'consultation-required';
  const { dashPath } = useOrgDashboardPath();

  // ── Website-theme accent resolver ──
  // The "House Default" preset must reflect the *website* theme primary, not
  // the dashboard's `--primary` (which is the operator's dashboard theme — e.g.
  // zura-purple). Mirrors the ThemeAwareColorInput Canon: resolve against the
  // website theme class via a sandboxed element, repaint on theme-preview
  // events so tile-clicks in Site Design update the swatch instantly.
  const { theme: websiteTheme } = useWebsiteColorTheme();
  const [previewThemeClass, setPreviewThemeClass] = useState<string | null>(null);
  useEffect(() => {
    const onThemePreview = (e: Event) => {
      const next = (e as CustomEvent).detail?.themeClass;
      if (typeof next === 'string' && next) setPreviewThemeClass(next);
    };
    window.addEventListener('editor-theme-preview', onThemePreview);
    return () => window.removeEventListener('editor-theme-preview', onThemePreview);
  }, []);
  useEffect(() => {
    if (previewThemeClass && previewThemeClass === `theme-${websiteTheme}`) {
      setPreviewThemeClass(null);
    }
  }, [previewThemeClass, websiteTheme]);
  const websiteThemeClass = previewThemeClass ?? `theme-${websiteTheme}`;
  const [websitePrimaryHex, setWebsitePrimaryHex] = useState<string>(
    () => readThemeTokenSwatches(websiteThemeClass).find((s) => s.key === 'primary')?.hex ?? '',
  );
  useEffect(() => {
    const refresh = () => {
      const hex = readThemeTokenSwatches(websiteThemeClass).find((s) => s.key === 'primary')?.hex ?? '';
      setWebsitePrimaryHex(hex);
    };
    refresh();
    return subscribeToThemeChanges(refresh);
  }, [websiteThemeClass]);

  // Resolve the public booking URL once so the destination chip + lint can
  // render the exact URL a visitor will land on. Falls back to relative path
  // when the org doesn't have a public URL ready yet.
  const publicBookingUrl = publicPageUrl('booking') ?? null;

  // Hydration is delegated to a shared hook that survives the post-save
  // refetch race (see `useHydratedFormState` for the contract). Direct
  // useEffect+ref logic here previously clobbered fast post-save edits like
  // flipping Appearance right after Save.
  const {
    formData,
    setFormData,
    savedSnapshot,
    setSavedSnapshot,
    isDirty,
  } = useHydratedFormState<PromotionalPopupSettings>(
    settings ?? null,
    DEFAULT_PROMO_POPUP,
  );
  const [autoSaving, setAutoSaving] = useState(false);
  // Cross-card rotation focus — calendar-strip click in `PromoScheduleCard`
  // and rotation-pill click in `PopupAnalyticsCard` both write here so the
  // two surfaces stay in lockstep ("visual → row → metrics").
  const [focusedRotationId, setFocusedRotationId] = useState<string | null>(null);

  // Dev-only save-trace telemetry. Records every step of a save attempt
  // (click → mutation success → refetch result → form snapshot) and emits
  // a single grouped console log on flush. No-op in production builds.
  const telemetryRef = useRef(createEditorTelemetry('promo-editor'));

  // Refs eliminate stale-closure races between the auto-save Enable toggle and
  // the manual "Save to preview" button. Both save paths read the *current*
  // form state from `formDataRef`, and `savingRef` serializes mutations so a
  // late-arriving stale write can never overwrite a fresh one.
  const formDataRef = useRef<PromotionalPopupSettings>(formData);
  const savedSnapshotRef = useRef<PromotionalPopupSettings>(savedSnapshot);
  const savingChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  useEffect(() => {
    savedSnapshotRef.current = savedSnapshot;
  }, [savedSnapshot]);

  // Telemetry checkpoint: every refetch result that lands during an active
  // save trace. Lets us see at a glance whether a stale/null payload arrived
  // mid-save (the original snap-back bug fingerprint).
  useEffect(() => {
    telemetryRef.current.event('refetch-result', {
      hasSettings: settings != null,
      headline: settings?.headline,
      enabled: settings?.enabled,
    });
  }, [settings]);

  // Live count + 14-day velocity for the *saved* offer code. We track
  // savedSnapshot.offerCode (not formData) so the count reflects what's
  // actually in production, not in-flight edits — operators editing the code
  // shouldn't see the count flicker mid-keystroke.
  const { data: redemptionData } = usePromotionalPopupRedemptions(
    savedSnapshot.offerCode,
  );
  const redemptionCount = redemptionData?.count ?? 0;
  const redemptionSeries = redemptionData?.series ?? [];
  const redemptionLast24h = redemptionData?.last24h ?? 0;
  const revenueAttributed = redemptionData?.revenueAttributed ?? 0;
  const revenueAttributedSince = redemptionData?.revenueAttributedSince ?? null;

  // Broadcast dirty state to the editor shell so it can:
  // (1) light up the Save button, (2) intercept Done / tab switches with the
  // unsaved-changes guard instead of silently dropping the operator's edits.
  useEditorDirtyState(isDirty);

  const handleChange = <K extends keyof PromotionalPopupSettings>(
    field: K,
    value: PromotionalPopupSettings[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSurface = (surface: PopupSurface, checked: boolean) => {
    setFormData((prev) => {
      const next = new Set(prev.showOn);
      if (checked) next.add(surface);
      else next.delete(surface);
      return { ...prev, showOn: Array.from(next) as PopupSurface[] };
    });
  };

  // Default CTA labels per destination — used to auto-rename the Accept
  // button when the operator switches destinations *and* the current label
  // still matches a previous default. Manual overrides are preserved.
  const DEFAULT_CTA_FOR_DESTINATION: Record<PopupAcceptDestination, string> = {
    booking: 'Claim Offer',
    consultation: 'Book Consultation',
    'custom-url': 'Learn More',
  };
  const KNOWN_DEFAULT_LABELS = new Set(Object.values(DEFAULT_CTA_FOR_DESTINATION));

  const handleDestinationChange = (next: PopupAcceptDestination) => {
    setFormData((prev) => {
      const currentLabel = prev.ctaAcceptLabel?.trim() ?? '';
      // Only auto-rewrite when the field still holds a known default — never
      // overwrite operator-authored copy.
      const shouldRewriteLabel =
        !currentLabel || KNOWN_DEFAULT_LABELS.has(currentLabel);
      return {
        ...prev,
        acceptDestination: next,
        ctaAcceptLabel: shouldRewriteLabel
          ? DEFAULT_CTA_FOR_DESTINATION[next]
          : prev.ctaAcceptLabel,
      };
    });
  };

  // Detects every counter currently in destructive state. Drives both the
  // Save confirmation guard *and* the per-field destructive underline so
  // operators see the same story passively (border) and actively (toast).
  const overflows = collectOverflows(formData);

  // Refs to the offending inputs so the overflow guard can scroll-into-view
  // the first offender when Save is blocked.
  const headlineRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const disclaimerRef = useRef<HTMLTextAreaElement | null>(null);

  // Serialize every write through `savingChainRef` so the auto-save toggle and
  // the manual Save can never interleave. Each new write awaits the previous
  // one — last write wins, but only after the prior one finishes, eliminating
  // the race where a stale-closure mutation lands AFTER a fresh one and
  // overwrites it. Source-of-truth for the payload is `formDataRef`, not the
  // captured `formData`, so a synchronous Save click that fires before React
  // re-renders still serializes the *current* form state.
  const enqueueWrite = useCallback(
    (
      buildNext: () => PromotionalPopupSettings,
      onSuccess?: (next: PromotionalPopupSettings) => void,
      onError?: (err: unknown, attemptedNext: PromotionalPopupSettings) => void,
    ): Promise<void> => {
      const run = savingChainRef.current.then(async () => {
        const next = buildNext();
        try {
          await updateSettings.mutateAsync(next);
          setSavedSnapshot(next);
          onSuccess?.(next);
        } catch (err) {
          onError?.(err, next);
          throw err;
        }
      });
      // Don't break the chain on a single failure — subsequent writes should
      // still be allowed to proceed against current form state.
      savingChainRef.current = run.catch(() => {});
      return run;
    },
    [updateSettings],
  );

  const persist = useCallback(async () => {
    const t = telemetryRef.current;
    t.event('save-clicked', {
      headline: formDataRef.current.headline,
      enabled: formDataRef.current.enabled,
      appearance: formDataRef.current.appearance,
    });
    try {
      await enqueueWrite(
        () => formDataRef.current,
        (next) => {
          t.event('mutation-success', { headline: next.headline, enabled: next.enabled });
          toast.success('Promotional popup saved');
          // Mirror the auto-save toggle's behavior: nudge the live preview
          // iframe to reflect the just-saved draft without a manual reload.
          triggerPreviewRefresh();
          // Snapshot the form state immediately after save so the trace
          // shows whether anything mutated between save and the next render.
          t.event('form-snapshot', {
            headline: formDataRef.current.headline,
            enabled: formDataRef.current.enabled,
          });
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      t.event('mutation-error', { message: msg });
      toast.error(`Failed to save: ${msg}`);
    } finally {
      // Defer flush so the post-save refetch checkpoint (above effect) lands
      // in the same grouped log instead of a separate one.
      setTimeout(() => t.flush(), 250);
    }
  }, [enqueueWrite]);

  // Composed Save guards — overflow first (data loss), contrast second
  // (legibility). usePersistGuards picks the first blocking finding for the
  // toast and scrolls/focuses the offending input. Adding a third guard later
  // (link reachability, deposit amount, etc.) is a one-line append.
  const fieldRefs = useMemo(
    () => ({
      headline: headlineRef.current,
      body: bodyRef.current,
      disclaimer: disclaimerRef.current,
    }),
    // Refs are read at guard-evaluation time; we only need to recompute the
    // memo when overflow findings change so the guard sees fresh nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overflows],
  );
  // Empty-code guard — warns (doesn't block) when the destination is a
  // booking flow but no code is attached. Visitors would land on plain booking
  // with nothing applied: a silent dead-end on a "Claim Offer" promise. Same
  // warn-don't-block pattern as overflow/contrast — operator can ship via
  // "Save anyway" if the offer truly has no code.
  const offerCodeRef = useRef<HTMLInputElement | null>(null);
  const guards = useMemo(
    () => [
      makeOverflowGuard<OverflowFinding>(overflows, fieldRefs),
      makeContrastGuard({
        accent: formData.accentColor,
        getRatio: bestTextContrast,
      }),
      () => {
        const dest = formData.acceptDestination ?? 'booking';
        const codeMissing = !(formData.offerCode ?? '').trim();
        if (!codeMissing) return null;
        if (dest !== 'booking' && dest !== 'consultation') return null;
        return {
          field: 'offerCode',
          title: 'No offer code attached',
          description:
            'Visitors who click Claim Offer will land on plain booking with nothing applied. Add a code or switch the destination to a custom URL.',
          scrollTo: offerCodeRef.current,
        };
      },
    ],
    [overflows, fieldRefs, formData.accentColor, formData.acceptDestination, formData.offerCode],
  );
  const { guardedSave, isFieldGuarded } = usePersistGuards({ guards, persist });
  // Back-compat alias — existing destructive-state styling reads this name.
  const isFieldOverflowing = isFieldGuarded;

  useEditorSaveAction(guardedSave);

  // Auto-save for the binary Enable toggle — operators expect a switch to
  // "just work" without hunting for Save. We persist immediately, refresh
  // the preview, and skip the dirty-state path for this single field.
  // Reads from `formDataRef` (not the captured `formData`) and routes through
  // `enqueueWrite` so it can never race the manual "Save to preview" button —
  // a stale-closure save can no longer overwrite the just-toggled enable bit.
  const handleEnableToggle = useCallback(
    async (checked: boolean) => {
      // Optimistic UI flip so the switch feels instant.
      setFormData((prev) => ({ ...prev, enabled: checked }));
      setAutoSaving(true);
      try {
        await enqueueWrite(
          // Build the payload at write-time from the freshest form state so
          // any in-flight typing is also captured by this auto-save.
          () => ({ ...formDataRef.current, enabled: checked }),
          () => {
            toast.success(checked ? 'Popup enabled' : 'Popup disabled');
            triggerPreviewRefresh();
          },
          () => {
            // Roll back optimistic state on failure.
            setFormData((prev) => ({ ...prev, enabled: !checked }));
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        toast.error(`Failed to update: ${msg}`);
      } finally {
        setAutoSaving(false);
      }
    },
    [enqueueWrite],
  );

  // Subscribe to the popup's lifecycle phase so the restart button can
  // render a context-aware label. Echoed by `PromotionalPopup.tsx` only
  // in preview mode; sole event owner is `src/lib/promoPopupPreviewReset.ts`.
  // Seeded from the cached last phase so a late mount renders the right
  // label on first paint without waiting for a transition.
  const [popupPhase, setPopupPhase] = useState<PromoPopupPreviewPhase>(
    () => getLastPromoPopupPreviewPhase(),
  );
  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<PromoPopupPreviewStateDetail>).detail;
      if (detail?.phase) setPopupPhase(detail.phase);
    };
    window.addEventListener(PROMO_POPUP_PREVIEW_STATE_EVENT, onState);
    return () => window.removeEventListener(PROMO_POPUP_PREVIEW_STATE_EVENT, onState);
  }, []);

  // Phase-aware copy. Higher cognitive fit than a static label —
  // operators QA'ing the FAB transition see what the next click will do
  // without having to remember which phase they're in.
  // Single canonical label regardless of phase. Each click restarts the
  // full lifecycle: slide-up → countdown → close-into-FAB. Phase-aware
  // copy was removed — operators told us the consistent label is clearer
  // because the action it performs is always the same (replay the cycle).
  const restartButtonCopy = useMemo<{ label: string; title: string }>(
    () => ({
      label: 'Preview Popup Offer',
      title: 'Replay the full lifecycle: slide up → countdown → close into FAB',
    }),
    [],
  );
  // popupPhase is still tracked for the dismissal-count recount trigger below.
  void popupPhase;

  // Count of per-org dismissal records currently in localStorage. Surfaced
  // in the restart button's tooltip so operators understand the side-effect
  // ("also clears N visitor dismissal records") before clicking.
  //
  // Sourced from real signals — never the lifecycle phase, which only
  // proxies for "operator just clicked restart" and silently goes stale
  // when the editor mounts mid-session or another tab clears storage.
  // Anchors:
  //   - mount + orgId change → seed initial count
  //   - cross-tab `storage` event → react when another tab clears records
  //   - same-tab restart → recount inline (storage event is cross-tab only)
  const countDismissalRecords = useCallback((): number => {
    if (typeof window === 'undefined' || !orgId) return 0;
    try {
      const prefix = `zura.promo.${orgId}.`;
      let count = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) count += 1;
      }
      return count;
    } catch {
      return 0;
    }
  }, [orgId]);

  const [dismissalRecordCount, setDismissalRecordCount] = useState<number>(() =>
    countDismissalRecords(),
  );

  useEffect(() => {
    setDismissalRecordCount(countDismissalRecords());
    if (typeof window === 'undefined' || !orgId) return;
    const prefix = `zura.promo.${orgId}.`;
    const onStorage = (e: StorageEvent) => {
      // Cross-tab signal only. Same-tab `removeItem` does NOT fire `storage`
      // (per spec) — that path is handled by `handleResetSession` below.
      // Filter to org-scoped keys (or a full clear with key=null) so
      // unrelated localStorage churn doesn't trigger a recount.
      if (e.storageArea !== window.localStorage) return;
      if (e.key !== null && !e.key.startsWith(prefix)) return;
      setDismissalRecordCount(countDismissalRecords());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [orgId, countDismissalRecords]);

  // Single canonical restart action. Clears per-org dismissal records +
  // session sentinel, then dispatches the canonical preview-reset event so
  // the popup re-runs its full lifecycle (slide-in → countdown → soft-close
  // into FAB) in-place — no iframe reload, no lost scroll position.
  // See `src/lib/promoPopupPreviewReset.ts` for event ownership canon.
  const handleResetSession = useCallback(() => {
    if (typeof window === 'undefined' || !orgId) return;
    try {
      const prefix = `zura.promo.${orgId}.`;
      const toDelete: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) toDelete.push(k);
      }
      toDelete.forEach((k) => window.localStorage.removeItem(k));
      // Session sentinels are now namespaced per `${STORAGE_PREFIX}.session.${orgId}.${code}`
      // (see usePromoLifecycle.ts). Clear every session key for this org so
      // "once-per-session" dismissals don't survive a manual restart.
      const sessionPrefix = `zura.promo.session.${orgId}.`;
      const sessionToDelete: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(sessionPrefix)) sessionToDelete.push(k);
      }
      sessionToDelete.forEach((k) => window.sessionStorage.removeItem(k));
      // Pulse-hint sentinel is also session-scoped per org+code now.
      const pulsePrefix = `zura.promo.fab-pulsed.${orgId}.`;
      const pulseToDelete: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(pulsePrefix)) pulseToDelete.push(k);
      }
      pulseToDelete.forEach((k) => window.sessionStorage.removeItem(k));
      // Same-tab mutation — `storage` event won't fire for this tab, so
      // recount inline to keep the tooltip accurate without waiting for
      // a re-render trigger.
      setDismissalRecordCount(countDismissalRecords());
      dispatchPromoPopupPreviewReset({ reason: 'manual' });
      toast.success(
        toDelete.length > 0
          ? `Cleared ${toDelete.length} dismissal record(s) — popup restarted`
          : 'Popup preview restarted',
      );
    } catch (err) {
      toast.error('Could not reset session storage');
    }
  }, [orgId, countDismissalRecords]);


  // Opens the live public site in a new tab with `?preview=true`, the trusted
  // editor-preview channel that bypasses frequency caps and forces an immediate
  // trigger. Lets QA validate the real layout outside the editor iframe.
  const fullPreviewUrl = publicPageUrl(null, { preview: true });
  const handleOpenFullPreview = useCallback(() => {
    if (!fullPreviewUrl) {
      toast.error('Public site URL is not ready yet');
      return;
    }
    window.open(fullPreviewUrl, '_blank', 'noopener,noreferrer');
  }, [fullPreviewUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorCard
      title="Promotional Popup"
      icon={Megaphone}
      description="Show a one-time offer to website visitors. Accept routes them to booking with the offer code attached; decline dismisses based on your frequency cap."
    >
      {/* Enable + QA actions */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="promo-enabled" className="text-base font-medium">
              Show Promotional Popup
            </Label>
            <p className="text-sm text-muted-foreground">
              Toggle the popup on or off across the public site. Saves automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {autoSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />
            )}
            <Switch
              id="promo-enabled"
              checked={formData.enabled}
              disabled={autoSaving}
              onCheckedChange={handleEnableToggle}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          {/* Single phase-aware restart button. Collapses what used to be
              two buttons ("Restart preview" + "Reset popup session") — the
              former was a strict subset of the latter once both started
              dispatching the canonical lifecycle event. Tooltip surfaces
              the side-effect (clearing N visitor dismissal records) so the
              loss of the "restart without clearing storage" affordance is
              explicit; preview already bypasses dismissals so that
              affordance had no QA value. */}
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetSession}
                  className="gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {restartButtonCopy.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-sans text-xs">{restartButtonCopy.title}</p>
                <p className="font-sans text-[11px] text-muted-foreground mt-1">
                  {dismissalRecordCount > 0
                    ? `Also clears ${dismissalRecordCount} visitor dismissal record${dismissalRecordCount === 1 ? '' : 's'}.`
                    : 'No visitor dismissal records to clear.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenFullPreview}
            disabled={!fullPreviewUrl}
            className="gap-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open full preview
          </Button>
          <p className="font-sans text-[11px] text-muted-foreground ml-auto">
            QA only — preview ignores frequency caps
          </p>
        </div>
      </div>

      {/* Promotion Library — preset templates + saved snapshots. Mounted
          high so operators discover "start from a template" before they
          hand-author copy. Apply paths route through the card's internal
          dirty-state guard so silent overwrites can't happen. */}
      <PromoLibraryCard
        formData={formData}
        setFormData={setFormData}
        isDirty={isDirty}
      />

      {/* Top-of-funnel analytics — impressions → CTA → redemptions → revenue.
          Renders null until an offer code exists (silence is valid output).
          Materiality threshold gates rate metrics so a 1/1 = 100% CTR doesn't
          ship a misleading signal. */}
      <PopupAnalyticsCard
        offerCode={savedSnapshot.offerCode}
        schedule={formData.schedule}
        focusedRotationId={focusedRotationId}
        onFocusRotation={setFocusedRotationId}
        goal={formData.goal ?? null}
      />

      {/* Scheduled Rotation — pre-stage saved snapshots to swap into the live
          popup over a fixed window. Pure resolver in `@/lib/promo-schedule`;
          public component reads via `useResolvedPromotionalPopup` so live and
          preview honor the same active entry. Wrapper toggle still gates the
          popup; rotations only override creative. */}
      <PromoScheduleCard
        formData={formData}
        setFormData={setFormData}
        focusedRotationId={focusedRotationId}
        onFocusRotation={setFocusedRotationId}
      />

      {/* A/B Experiment — split traffic across saved snapshots. Schedule
          rotation takes priority (resolver enforces); this card surfaces a
          banner when overridden so the operator understands precedence. */}
      <PromoExperimentCard formData={formData} setFormData={setFormData} />

      {/* Goal-Based Auto-Suppression — operator caps total redemptions
          (and/or sets a deadline). When the live count hits the cap, the
          public lifecycle hook auto-suppresses the popup for new visitors
          without flipping the wrapper toggle, so schedule + experiment
          state stay intact. Pure resolver in `@/lib/promo-goal`. */}
      <PromoGoalCard formData={formData} setFormData={setFormData} />

      {/* Redemption stat — closes the marketing loop. Shows the operator that
          the popup → booking flow is actually producing redemptions. Silent
          when no code is configured (silence is valid output) and shows "0"
          honestly when the code exists but hasn't been redeemed yet.

          14-day sparkline answers "is it still working?" — flat-zero for new
          codes (silence is valid), then traces velocity as redemptions land.
          Last-24h chip surfaces momentum at a glance. */}
      {savedSnapshot.offerCode?.trim() && (
        <div className="px-3 py-2.5 rounded-lg border border-border/60 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-display uppercase tracking-wider text-[10px] text-muted-foreground">
                  Redemptions
                </p>
                <p className="font-sans text-sm text-foreground">
                  <span className="font-medium tabular-nums">{redemptionCount}</span>
                  <span className="text-muted-foreground">
                    {' '}booking{redemptionCount === 1 ? '' : 's'} confirmed with{' '}
                    <span className="font-mono">{savedSnapshot.offerCode.trim()}</span>
                  </span>
                </p>
              </div>
            </div>
            {redemptionCount === 0 ? (
              <p className="font-sans text-[11px] text-muted-foreground italic shrink-0">
                No redemptions yet
              </p>
            ) : (
              <div
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-sans shrink-0',
                  redemptionLast24h > 0
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                    : 'border-border/60 bg-background text-muted-foreground',
                )}
                title="Confirmed redemptions in the last 24 hours"
              >
                {redemptionLast24h > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="tabular-nums">{redemptionLast24h}</span>
                <span>last 24h</span>
              </div>
            )}
          </div>
          {redemptionCount > 0 && redemptionSeries.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground shrink-0">
                14d
              </span>
              <div className="flex-1 text-primary">
                <Sparkline
                  data={redemptionSeries}
                  height={24}
                  ariaLabel="14-day redemption velocity"
                />
              </div>
            </div>
          )}
          {/* Lifetime attributed revenue — silence is valid: rows pre-dating
              the attribution column write resolve to 0 (honest absence). We
              only render when there's signal, keeping the card calm for new
              codes and historic redemptions. The "since DATE" caption makes
              that exclusion legible — without it, operators see count=12 but
              revenue worth of 8 and reasonably ask "where are the other 4?". */}
          {revenueAttributed > 0 && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
              <div className="min-w-0">
                <span className="font-display uppercase tracking-wider text-[10px] text-muted-foreground block">
                  Revenue attributed
                </span>
                {revenueAttributedSince && (
                  <span
                    className="font-sans text-[10px] text-muted-foreground/80 block mt-0.5"
                    title={`Earliest redemption with attributed revenue: ${new Date(revenueAttributedSince).toLocaleString()}. Earlier redemptions exist but pre-date attribution tracking.`}
                  >
                    since {new Date(revenueAttributedSince).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              <BlurredAmount className="font-sans text-sm font-medium tabular-nums text-foreground">
                {formatCurrency(revenueAttributed)}
              </BlurredAmount>
            </div>
          )}
        </div>
      )}

      {isDirty && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
          <p className="font-sans text-xs text-foreground">
            <span className="font-display uppercase tracking-wider text-[10px] text-primary mr-2">
              Unsaved
            </span>
            Press <strong>Save</strong> to keep this draft. Visitors won't see it until you{' '}
            <strong>Publish</strong> from Website Hub.
          </p>
        </div>
      )}

      {/* Content */}
      <Section title="Content">
        <Field label="Eyebrow (optional)" hint="Small uppercase tag above the headline. Leave blank to hide.">
          {(() => {
            const SelectedEyebrowIcon = getEyebrowIcon(formData.eyebrowIcon);
            return (
              <div className="space-y-2">
                <GlyphPicker
                  ariaLabel="Eyebrow icon"
                  options={EYEBROW_ICON_OPTIONS}
                  value={formData.eyebrowIcon ?? 'none'}
                  onChange={(v) => handleChange('eyebrowIcon', v as EyebrowIcon)}
                  accent={formData.accentColor}
                  emptyCaption="No icon"
                />
                <div className="relative">
                  {SelectedEyebrowIcon ? (
                    <SelectedEyebrowIcon
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                      style={{ color: formData.accentColor || 'hsl(var(--primary))' }}
                    />
                  ) : null}
                  <Input
                    value={formData.eyebrow ?? ''}
                    onChange={(e) => handleChange('eyebrow', e.target.value)}
                    placeholder="Limited time offer"
                    maxLength={32}
                    className={cn(SelectedEyebrowIcon && 'pl-9')}
                  />
                </div>
              </div>
            );
          })()}
          <EyebrowUrgencySuggestion
            endsAt={formData.endsAt}
            currentEyebrow={formData.eyebrow}
            onApply={(text, icon) => {
              handleChange('eyebrow', text);
              handleChange('eyebrowIcon', icon);
            }}
          />
        </Field>
        <Field label="Headline" hint="Keep it short — appears in display type.">
          <Input
            ref={headlineRef}
            value={formData.headline}
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Free Haircut with Any Color Service"
            className={cn(isFieldOverflowing('headline') && 'border-destructive/60 focus-visible:ring-destructive/40')}
          />
          <CharCounter
            length={formData.headline.length}
            ceiling={HEADLINE_CEILINGS[formData.appearance]}
            scopeLabel={`headline in ${appearanceLabel(formData.appearance)}`}
            overflowVerb={formData.appearance === 'banner' ? 'Truncating' : 'Wrapping'}
          />
        </Field>
        <Field label="Body">
          <Textarea
            ref={bodyRef}
            value={formData.body}
            onChange={(e) => handleChange('body', e.target.value)}
            rows={3}
            placeholder="Book a color appointment this month and your haircut is on us."
            className={cn(isFieldOverflowing('body') && 'border-destructive/60 focus-visible:ring-destructive/40')}
          />
          <CharCounter
            length={formData.body.length}
            ceiling={BODY_CEILINGS[formData.appearance]}
            scopeLabel={`body in ${appearanceLabel(formData.appearance)}`}
            overflowVerb={formData.appearance === 'banner' ? 'Truncating' : 'Wrapping'}
          />
        </Field>
        <Field
          label="Value anchor (optional)"
          hint='Small accent chip shown in the modal header next to the eyebrow tag. Gives the offer a number to latch onto (e.g. "$45 value", "Save 30%", "Limited to 10 bookings"). Modal layout only; hidden on mobile widths.'
        >
          <Input
            value={formData.valueAnchor ?? ''}
            onChange={(e) => handleChange('valueAnchor', e.target.value)}
            placeholder="$45 value"
            maxLength={32}
          />
        </Field>
        <Field label="Disclaimer (optional)" hint="Legal fine print — shown below the buttons.">
          <Textarea
            ref={disclaimerRef}
            value={formData.disclaimer ?? ''}
            onChange={(e) => handleChange('disclaimer', e.target.value)}
            rows={2}
            placeholder="New clients only. Cannot be combined with other offers."
            className={cn(isFieldOverflowing('disclaimer') && 'border-destructive/60 focus-visible:ring-destructive/40')}
          />
          <CharCounter
            length={(formData.disclaimer ?? '').length}
            ceiling={DISCLAIMER_CEILING}
            scopeLabel="disclaimer"
            overflowVerb="Over limit"
          />
        </Field>
        <Field label="Image (optional)" hint="Auto-optimized to WebP. Layout + alt text below.">
          {(() => {
            // Per-surface controls. Old `imageTreatment` collapsed two
            // independent decisions ("how does the modal lay out the image"
            // and "does the corner card show it at all") into one enum,
            // which made `cover` and `hidden-on-corner` look identical on
            // the modal preview. We now expose them as separate toggles —
            // each surface owns its own choice. The legacy field is read
            // only via `resolveImageRender` for back-compat; once the
            // operator interacts with either toggle, the new fields take
            // precedence.
            const appearance = formData.appearance ?? 'modal';
            const resolved = resolveImageRender({
              imageUrl: formData.imageUrl,
              imageTreatment: formData.imageTreatment,
              modalImageLayout: formData.modalImageLayout,
              cornerCardImage: formData.cornerCardImage,
            });
            const modalValue: ModalImageLayout =
              formData.modalImageLayout
                ?? (formData.imageTreatment === 'side' ? 'side' : 'cover');
            const cornerValue: CornerCardImage =
              formData.cornerCardImage
                ?? (formData.imageTreatment === 'hidden-on-corner' ? 'hide' : 'show');

            // Focal point has no visible effect when no surface renders the
            // image (banner appearance always, OR corner-card with image
            // hidden AND modal-as-active-appearance with image hidden — but
            // modal can't hide the image, so realistically: banner OR
            // corner-card+hide while previewing corner card). Lock the picker
            // to prevent operators from tuning a value the audience won't see
            // *on the surface they're previewing*.
            const focalDisabled =
              appearance === 'banner' ||
              (appearance === 'corner-card' && resolved.cornerCard === 'none');
            const focalDisabledReason =
              appearance === 'banner'
                ? "Banner appearance doesn't render the image. Switch to Modal or Corner Card to use the focal point."
                : "The corner card is set to hide the image. Switch Corner card → Show to use the focal point.";

            const modalOptions: { value: ModalImageLayout; label: string; hint: string }[] = [
              { value: 'cover', label: 'Cover', hint: 'Full-width strip above the headline' },
              { value: 'side', label: 'Side', hint: 'Left rail beside the copy' },
            ];
            const cornerOptions: { value: CornerCardImage; label: string; hint: string }[] = [
              { value: 'show', label: 'Show', hint: 'Strip above the headline on the corner card' },
              { value: 'hide', label: 'Hide', hint: 'Text-only on the corner card (saves vertical space)' },
            ];

            return (
              <>
                <MediaWithFocalPoint
                  value={formData.imageUrl ?? ''}
                  onChange={(url) => handleChange('imageUrl', url)}
                  focalX={formData.imageFocalX ?? 50}
                  focalY={formData.imageFocalY ?? 50}
                  onFocalChange={(x, y) => {
                    handleChange('imageFocalX', x);
                    handleChange('imageFocalY', y);
                  }}
                  onFocalReset={() => {
                    handleChange('imageFocalX', 50);
                    handleChange('imageFocalY', 50);
                  }}
                  pathPrefix="promotional-popup"
                  placeholder="https://..."
                  focalDisabled={focalDisabled}
                  focalDisabledReason={focalDisabledReason}
                />
                {formData.imageUrl && (
                  <div className="mt-3 space-y-3">
                    {appearance === 'banner' ? (
                      <p className="font-sans text-[11px] text-muted-foreground">
                        Banner appearance does not display the image. Switch to Modal or Corner Card in <span className="text-foreground">Appearance</span> to use it.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Label size="xs">Modal layout</Label>
                            {appearance !== 'modal' && (
                              <span className="font-sans text-[10px] text-muted-foreground">· not previewing</span>
                            )}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 h-9">
                            {modalOptions.map(({ value, label, hint }) => {
                              const active = modalValue === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  title={hint}
                                  onClick={() => handleChange('modalImageLayout', value)}
                                  className={cn(
                                    'h-7 px-3 rounded-full font-sans text-xs transition-colors',
                                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                                  )}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Label size="xs">Corner card</Label>
                            {appearance !== 'corner-card' && (
                              <span className="font-sans text-[10px] text-muted-foreground">· not previewing</span>
                            )}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 h-9">
                            {cornerOptions.map(({ value, label, hint }) => {
                              const active = cornerValue === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  title={hint}
                                  onClick={() => handleChange('cornerCardImage', value)}
                                  className={cn(
                                    'h-7 px-3 rounded-full font-sans text-xs transition-colors',
                                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                                  )}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label size="xs">Alt text</Label>
                      <Input
                        className="mt-1.5"
                        value={formData.imageAlt ?? ''}
                        onChange={(e) => handleChange('imageAlt', e.target.value)}
                        placeholder="Describe the image (leave blank if decorative)"
                        maxLength={140}
                      />
                      <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                        Used by screen readers and indexed for SEO. Empty = decorative.
                      </p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </Field>
      </Section>

      {/* Offer + CTAs */}
      <Section title="Offer & Call to Action">
        <Field
          label="Offer code"
          hint="Attached to the booking URL when a visitor accepts (e.g. FREECUT). Recorded for the team."
        >
          <Input
            ref={offerCodeRef}
            value={formData.offerCode}
            onChange={(e) => handleChange('offerCode', e.target.value.toUpperCase())}
            placeholder="FREECUT"
          />
          {/* Empty-code lint — passive editor warning that mirrors the publish
              gate guard. Fires when destination is booking/consultation but
              the code is empty: visitors would land on plain booking with
              nothing applied. Warn-don't-block: the field still saves. */}
          {!(formData.offerCode ?? '').trim() &&
            ((formData.acceptDestination ?? 'booking') === 'booking' ||
              (formData.acceptDestination ?? 'booking') === 'consultation') && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="font-sans text-xs text-foreground leading-relaxed">
                  No code attached — visitors who click Claim Offer will land on plain booking with nothing applied. Add a code or switch the destination to a Custom URL.
                </p>
              </div>
            )}
        </Field>

        {/* Destination — where Claim Offer sends the visitor */}
        <Field
          label="Where does Claim Offer send the visitor?"
          hint="Pick the destination that matches how a visitor actually claims this offer."
        >
          <div className="space-y-2" role="radiogroup" aria-label="Accept destination">
            {([
              {
                value: 'booking' as const,
                label: 'Direct booking',
                description: 'Send visitors straight into the booking flow with the offer code attached.',
                disabled: false,
                disabledReason: null,
              },
              {
                value: 'consultation' as const,
                label: 'Schedule a consultation',
                description: 'Route visitors to a consultation step before they book — recommended when new clients require a consult first.',
                disabled: !consultationPolicyEnabled,
                disabledReason: 'Enable "Consultation required" in Booking Surface settings to use this destination.',
              },
              {
                value: 'custom-url' as const,
                label: 'Custom URL',
                description: 'Send visitors to an external page, phone number, or email. Add instructions so they know how to claim.',
                disabled: false,
                disabledReason: null,
              },
            ]).map((opt) => {
              const active = (formData.acceptDestination ?? 'booking') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleDestinationChange(opt.value)}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 transition-colors',
                    active
                      ? 'border-foreground bg-muted/50'
                      : 'border-border hover:border-foreground/40',
                    opt.disabled && 'opacity-50 cursor-not-allowed hover:border-border',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 transition-colors',
                        active ? 'border-foreground bg-foreground' : 'border-muted-foreground/40',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="font-sans text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {opt.disabled && opt.disabledReason ? opt.disabledReason : opt.description}
                      </p>
                      {opt.disabled && opt.value === 'consultation' ? (
                        <Link
                          to={dashPath('/admin/booking-surface')}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 inline-flex items-center gap-1 font-sans text-[11px] text-primary hover:underline underline-offset-2"
                        >
                          Open Booking Surface settings
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        {/* Custom URL fields — only when the destination needs them */}
        {formData.acceptDestination === 'custom-url' && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <Field
              label="Destination URL"
              hint="Where the visitor goes when they click. Supports https://, tel:, and mailto: links."
            >
              <Input
                value={formData.customUrl ?? ''}
                onChange={(e) => handleChange('customUrl', e.target.value)}
                placeholder="https://example.com/claim or tel:+15551234567"
              />
              {formData.customUrl &&
                !/^(https?:|tel:|mailto:)/i.test(formData.customUrl.trim()) && (
                  <p className="mt-1 font-sans text-[11px] text-destructive">
                    Must start with https://, tel:, or mailto:
                  </p>
                )}
            </Field>
            <Field
              label="Instructions for the visitor"
              hint="Shown inside the popup beneath the CTA so visitors know what to do at the destination."
            >
              <Textarea
                value={formData.customUrlInstructions ?? ''}
                onChange={(e) => handleChange('customUrlInstructions', e.target.value)}
                placeholder="Mention code FREEHAIR when you call. Available Mon–Sat, 9am–6pm."
                rows={2}
                maxLength={200}
              />
            </Field>
          </div>
        )}

        {/* Live destination preview chip — resolves the same URL the live
            popup will navigate to. Catches typos in customUrl + drift between
            destination radio and offer code before publish. Renders a hint
            row when destination cannot be resolved (custom URL empty/invalid). */}
        {(() => {
          const resolved = resolvePopupDestination(
            {
              acceptDestination: formData.acceptDestination ?? 'booking',
              customUrl: formData.customUrl,
              offerCode: formData.offerCode,
            },
            publicBookingUrl,
          );
          if (!resolved) {
            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border/60 bg-muted/20">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <p className="font-sans text-[11px] text-muted-foreground">
                  {formData.acceptDestination === 'custom-url'
                    ? 'Add a valid URL above to see where visitors will land.'
                    : 'Public site URL not ready yet — destination preview will appear once available.'}
                </p>
              </div>
            );
          }
          return (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/30 cursor-help">
                    <Link2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    <p className="font-sans text-[11px] text-muted-foreground shrink-0">
                      Visitors land on:
                    </p>
                    <p className="font-mono text-[11px] text-foreground truncate min-w-0" title={resolved.fullUrl}>
                      {resolved.shortLabel}
                    </p>
                    {resolved.isExternal && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <p className="font-sans text-xs break-all">{resolved.fullUrl}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })()}

        {/* Audience ↔ destination consistency lint. Warn (don't block) when a
            new-visitors-only popup routes to direct booking while the org's
            booking config requires a consultation first — the popup creative
            promises one flow but the booking surface enforces another. */}
        {formData.audience === 'new-visitors-only' &&
          (formData.acceptDestination ?? 'booking') === 'booking' &&
          consultationPolicyEnabled && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-display uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300">
                  Flow inconsistency
                </p>
                <p className="font-sans text-xs text-foreground mt-0.5 leading-relaxed">
                  Your booking policy requires new clients to schedule a consultation, but this offer routes new visitors to direct booking. Switch the destination to{' '}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
                    onClick={() => handleDestinationChange('consultation')}
                  >
                    Schedule a consultation
                  </button>{' '}
                  to keep the flow consistent.
                </p>
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Accept button label">
            <Input
              value={formData.ctaAcceptLabel}
              onChange={(e) => handleChange('ctaAcceptLabel', e.target.value)}
              placeholder="Claim Offer"
            />
          </Field>
          <Field label="Decline button label">
            <Input
              value={formData.ctaDeclineLabel}
              onChange={(e) => handleChange('ctaDeclineLabel', e.target.value)}
              placeholder="No thanks"
            />
          </Field>
        </div>
      </Section>

      {/* Behavior */}
      <Section title="Behavior">
        <Field
          label="Appearance"
          hint="How the offer enters the page. Pick the layout that matches your brand's tone."
        >
          <div className="space-y-4">
            <Select
              value={formData.appearance}
              onValueChange={(v) => handleChange('appearance', v as PromotionalPopupSettings['appearance'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="modal">Centered modal</SelectItem>
                <SelectItem value="banner">Top banner</SelectItem>
                <SelectItem value="corner-card">Bottom-right card</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex flex-col items-center gap-2">
              <AppearancePreviewSwatch
                appearance={formData.appearance}
                accent={formData.accentColor}
                headline={formData.headline}
                eyebrow={formData.eyebrow}
                eyebrowIcon={formData.eyebrowIcon}
              />
              <span className="font-display uppercase tracking-wider text-[10px] text-muted-foreground">
                Live preview
              </span>
            </div>
          </div>
        </Field>
        <Field label="Trigger">
          <Select
            value={formData.trigger}
            onValueChange={(v) => handleChange('trigger', v as PromotionalPopupSettings['trigger'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediately on load</SelectItem>
              <SelectItem value="delay">After a delay</SelectItem>
              <SelectItem value="scroll">After scrolling</SelectItem>
              <SelectItem value="exit-intent">On exit intent (desktop)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {(formData.trigger === 'delay' || formData.trigger === 'scroll') && (
          <Field
            label={formData.trigger === 'delay' ? 'Delay (milliseconds)' : 'Scroll distance (pixels)'}
          >
            <Input
              type="number"
              min={0}
              value={formData.triggerValueMs ?? ''}
              onChange={(e) =>
                handleChange('triggerValueMs', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder={formData.trigger === 'delay' ? '4000' : '600'}
            />
          </Field>
        )}
        <Field
          label="Frequency cap"
          hint="How often the same visitor sees the popup."
        >
          <Select
            value={formData.frequency}
            onValueChange={(v) => handleChange('frequency', v as PromotionalPopupSettings['frequency'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Once ever (until they clear cookies)</SelectItem>
              <SelectItem value="once-per-session">Once per browsing session</SelectItem>
              <SelectItem value="daily">Once per day</SelectItem>
              <SelectItem value="always">Every page load (testing only)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Auto-minimize after (seconds)"
          hint="Popup collapses to the bottom 'See Offer' chip if the visitor doesn't engage. Range 5–60s. Leave blank to disable (popup stays open until closed)."
        >
          <Input
            type="number"
            min={5}
            max={60}
            value={
              formData.autoMinimizeMs === null || formData.autoMinimizeMs === undefined
                ? ''
                : Math.round(formData.autoMinimizeMs / 1000)
            }
            onChange={(e) => {
              // Single canonical write path. Coercion handles empty
              // string (= disabled), numeric strings, NaN, and the
              // 5000–60000ms clamp — see clampAutoMinimizeSeconds.test.ts.
              // DB now stores only canonical values; the renderer's
              // defensive clamp becomes back-compat-only.
              handleChange('autoMinimizeMs', coerceAutoMinimizeMs(e.target.value));
            }}
            placeholder="15"
          />
        </Field>
        <Field
          label="Accent color"
          hint="Drives the FAB and CTA accents. Match this to your brand's primary color."
        >
          {/* Canonical theme-aware picker — surfaces theme tokens + colors
              already used elsewhere on the site (announcement bar, hero CTAs)
              so the See Offer chip stays cohesive with the rest of the brand.
              The branded ACCENT_PRESETS row below is intentionally separate. */}
          <ThemeAwareColorInput
            value={formData.accentColor}
            onChange={(next) =>
              setFormData((prev) => ({
                ...prev,
                accentColor: next,
                accentPresetKey: null, // any swatch / custom pick clears preset
              }))
            }
            placeholder="#7C3AED — leave blank for theme primary"
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="font-display uppercase tracking-wider text-[10px] text-muted-foreground mr-1">
              Presets
            </span>
            {ACCENT_PRESETS.map((preset) => {
              // Prefer key match (survives theme/hex changes); fall back to
              // color match so legacy rows saved before this field existed
              // still highlight correctly.
              const active = formData.accentPresetKey
                ? formData.accentPresetKey === preset.key
                : !formData.accentPresetKey &&
                  (preset.value ?? null) === (formData.accentColor ?? null);
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      accentColor: preset.value,
                      accentPresetKey: preset.key,
                    }))
                  }
                  title={preset.hint}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2 h-7 transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:bg-muted/60 text-muted-foreground',
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-border/60"
                    style={{
                      backgroundColor:
                        preset.key === 'house' && websitePrimaryHex
                          ? websitePrimaryHex
                          : preset.swatch,
                    }}
                  />
                  <span className="font-sans text-[11px]">{preset.label}</span>
                </button>
              );
            })}
          </div>
          <AccentContrastWarning accent={formData.accentColor} />
        </Field>
        <Field
          label="Reminder button position"
          hint="Where the floating reminder appears after a visitor closes the popup. Flip to bottom-left if a chat widget already lives in the right corner."
        >
          <div className="space-y-4">
            <Select
              value={formData.fabPosition ?? 'bottom-right'}
              onValueChange={(v) => handleChange('fabPosition', v as PromotionalPopupSettings['fabPosition'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom right</SelectItem>
                <SelectItem value="bottom-left">Bottom left</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex flex-col items-center gap-2">
              <FabPreviewSwatch
                position={formData.fabPosition ?? 'bottom-right'}
                headline={formData.headline}
                accent={formData.accentColor}
              />
              <span className="font-display uppercase tracking-wider text-[10px] text-muted-foreground">
                Live preview
              </span>
            </div>
          </div>
        </Field>
      </Section>

      {/* Targeting */}
      <Section title="Where it shows">
        <div className="space-y-2">
          {SURFACE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer"
            >
              <Checkbox
                checked={formData.showOn.includes(opt.value)}
                onCheckedChange={(c) => toggleSurface(opt.value, c === true)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm text-foreground">{opt.label}</div>
                <div className="font-sans text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
        <Field
          label="Audience"
          hint="Limit who sees this popup. 'New visitors only' suppresses the popup for anyone who's already visited your site in this browser."
        >
          <Select
            value={formData.audience}
            onValueChange={(v) => handleChange('audience', v as PopupAudience)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visitors</SelectItem>
              <SelectItem value="new-visitors-only">New visitors only</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* Schedule */}
      <Section title="Schedule (optional)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Starts at" hint="Leave blank for immediate.">
            <Input
              type="datetime-local"
              value={toLocalInput(formData.startsAt)}
              onChange={(e) => handleChange('startsAt', fromLocalInput(e.target.value))}
            />
          </Field>
          <Field label="Ends at" hint="Leave blank for no end.">
            <Input
              type="datetime-local"
              value={toLocalInput(formData.endsAt)}
              onChange={(e) => handleChange('endsAt', fromLocalInput(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="font-display uppercase tracking-wider text-[10px] text-foreground">
          Note
        </strong>
        <p className="mt-1">
          The offer code is recorded on the booking URL so your team can honor it at checkout.
          Discount mechanics (e.g. line-item adjustments) are configured separately under your
          service pricing rules.
        </p>
      </div>
    </EditorCard>
  );
}
