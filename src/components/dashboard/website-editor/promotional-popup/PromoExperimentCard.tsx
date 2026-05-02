/**
 * Promo Experiment card — A/B testing for the promotional popup.
 *
 * Lets the operator define 2+ variants (each backed by a saved-library
 * snapshot) and split traffic between them by weight. The pure resolver in
 * `@/lib/promo-experiment` deterministically buckets each visitor; this card
 * is the authoring surface plus a per-arm funnel breakdown so the operator
 * can declare a winner.
 *
 * Doctrine alignment:
 *   - Visibility contract: empty state is shown when toggle is OFF (operator
 *     toggled this section on, so silence reads as "broken").
 *   - Schedule rotation takes priority over experiments (see resolver) — this
 *     card surfaces a banner when both are active so the operator understands
 *     why the experiment isn't currently running.
 *   - Materiality: per-arm CTR / redemption rate respects the same
 *     `MIN_IMPRESSIONS_FOR_RATES` gate as the global funnel card. The
 *     significance badge uses a stricter `MIN_PER_ARM_IMPRESSIONS_FOR_SIGNIFICANCE`
 *     gate before claiming a winner — Wald CI on a CTR delta is too noisy
 *     under that. Honest silence beats false confidence.
 *   - Bucketing version: edits to the variant set bump `version` so visitor
 *     assignment re-shuffles. Renaming/weight-only edits also bump because
 *     re-entry could otherwise show the visitor an arm that no longer exists.
 *   - Currency: none on this surface.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  Trophy,
  Crown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePromoLibrary } from '@/hooks/usePromoLibrary';
import {
  type PromotionalPopupSettings,
  type PromoExperimentConfig,
  type PromoExperimentVariant,
} from '@/hooks/usePromotionalPopup';
import { pickActiveEntry, applyScheduledSnapshot } from '@/lib/promo-schedule';
import {
  usePromotionalPopupFunnel,
  MIN_IMPRESSIONS_FOR_RATES,
} from '@/hooks/usePromotionalPopupFunnel';
import {
  ctrSignificance,
  type SignificanceState,
  type ArmStats,
} from '@/lib/promo-stats';

interface PromoExperimentCardProps {
  formData: PromotionalPopupSettings;
  setFormData: (next: PromotionalPopupSettings) => void;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_EXPERIMENT: PromoExperimentConfig = {
  enabled: false,
  name: '',
  version: 1,
  variants: [],
};

/** Per-variant funnel row. Lifts its loaded stats up via `onStats` so the
 *  parent can compute significance deltas across arms (control vs. each).
 *  We don't refactor to `useQueries` because the variant set is small and
 *  the child also owns its own loading state nicely. */
function VariantFunnelRow({
  offerCode,
  variantKey,
  totalImpressions,
  significance,
  isControl,
  onStats,
}: {
  offerCode: string;
  variantKey: string;
  totalImpressions: number;
  significance: SignificanceState | null;
  isControl: boolean;
  /** All-arm impressions in window — used to render a share % so the
   *  operator can sanity-check that traffic is splitting roughly to plan. */
  onStats: (variantKey: string, stats: ArmStats | null) => void;
}) {
  const { data } = usePromotionalPopupFunnel({ offerCode, variantKey });

  // Hoist impressions/clicks up to the parent so it can compute deltas.
  // Effect (not render) to avoid setState-in-render loops.
  useEffect(() => {
    if (!data) {
      onStats(variantKey, null);
      return;
    }
    onStats(variantKey, {
      impressions: data.impressions,
      ctaClicks: data.ctaClicks,
    });
  }, [data, variantKey, onStats]);

  if (!data) {
    return (
      <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
        <span>—</span><span>—</span><span>—</span><span>—</span><span>—</span>
      </div>
    );
  }
  const share =
    totalImpressions > 0
      ? `${Math.round((data.impressions / totalImpressions) * 100)}%`
      : '—';
  const ctr =
    data.impressions >= MIN_IMPRESSIONS_FOR_RATES && data.ctr !== null
      ? `${(data.ctr * 100).toFixed(1)}%`
      : '—';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2 text-xs">
        <span className="font-mono">{data.impressions.toLocaleString()}</span>
        <span className="font-mono text-muted-foreground">{share}</span>
        <span className="font-mono">{data.ctaClicks.toLocaleString()}</span>
        <span className="font-mono">{data.redemptions.toLocaleString()}</span>
        <span className="font-mono text-primary">{ctr}</span>
      </div>
      <SignificanceBadge state={significance} isControl={isControl} />
    </div>
  );
}

/** Badge that translates the Wald CI state into operator-readable copy.
 *  Honest silence: when below per-arm n threshold we tell them how many
 *  more impressions they need rather than show a percentage they'll over-trust. */
function SignificanceBadge({
  state,
  isControl,
}: {
  state: SignificanceState | null;
  isControl: boolean;
}) {
  if (isControl) {
    return (
      <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
        Control
      </Badge>
    );
  }
  if (!state) return null;

  if (state.kind === 'control') return null;

  if (state.kind === 'insufficient') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground cursor-help">
              Need {state.needed.toLocaleString()} more impressions
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="max-w-xs text-xs">
              Both arms need at least 100 impressions before we can call a winner.
              CTR deltas under that are too noisy to act on.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (state.kind === 'inconclusive') {
    const sign = state.deltaPct >= 0 ? '+' : '';
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground cursor-help">
              {sign}{state.deltaPct.toFixed(1)}pp · not significant
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="max-w-xs text-xs">
              The 95% confidence interval on the CTR delta crosses zero — keep collecting.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isWin = state.kind === 'significant-up';
  const sign = state.deltaPct >= 0 ? '+' : '';
  const label = isWin ? 'Significant lift' : 'Significant drop';
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] cursor-help',
              isWin
                ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'border-destructive/40 text-destructive',
            )}
          >
            {isWin ? <Trophy className="w-3 h-3 mr-1" /> : null}
            {sign}{state.deltaPct.toFixed(1)}pp · {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-xs text-xs">
            95% CI: {state.ciLowPct.toFixed(1)}pp to {state.ciHighPct.toFixed(1)}pp vs control.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PromoExperimentCard({
  formData,
  setFormData,
}: PromoExperimentCardProps) {
  const { data: library } = usePromoLibrary();
  const saved = library?.saved ?? [];
  const hasSaved = saved.length > 0;

  const experiment = formData.experiment ?? DEFAULT_EXPERIMENT;
  const variants = experiment.variants;
  const offerCode = formData.offerCode?.trim() ?? '';

  // Schedule precedence — surface a banner so operators know why arms might
  // not be live right now.
  const activeSchedule = pickActiveEntry(formData.schedule, new Date());

  const [draftPromoId, setDraftPromoId] = useState<string>('');
  const [draftLabel, setDraftLabel] = useState<string>('');
  const [armStats, setArmStats] = useState<Record<string, ArmStats | null>>({});
  const [promoteCandidate, setPromoteCandidate] = useState<PromoExperimentVariant | null>(null);

  // Stable callback so child VariantFunnelRow doesn't loop in its useEffect.
  const handleArmStats = useMemo(
    () => (variantKey: string, stats: ArmStats | null) => {
      setArmStats((prev) => {
        const existing = prev[variantKey];
        if (
          existing?.impressions === stats?.impressions &&
          existing?.ctaClicks === stats?.ctaClicks
        ) {
          return prev;
        }
        return { ...prev, [variantKey]: stats };
      });
    },
    [],
  );

  const updateExperiment = (next: PromoExperimentConfig) => {
    setFormData({ ...formData, experiment: next });
  };

  /** Bump version on every variant-set edit so visitor bucketing re-shuffles. */
  const writeVariants = (nextVariants: PromoExperimentVariant[]) => {
    updateExperiment({
      ...experiment,
      version: experiment.version + 1,
      variants: nextVariants,
    });
  };

  const handleAdd = () => {
    if (!draftPromoId) {
      toast.error('Pick a saved promo to test.');
      return;
    }
    const snap = saved.find((s) => s.id === draftPromoId);
    const label = (draftLabel.trim() || snap?.name || 'Variant').slice(0, 40);
    const next: PromoExperimentVariant = {
      id: generateId(),
      label,
      savedPromoId: draftPromoId,
      weight: 1,
    };
    writeVariants([...variants, next]);
    setDraftPromoId('');
    setDraftLabel('');
    toast.success('Variant added — Save to publish.');
  };

  const handleRemove = (id: string) => {
    writeVariants(variants.filter((v) => v.id !== id));
  };

  const handleWeight = (id: string, weight: number) => {
    writeVariants(
      variants.map((v) => (v.id === id ? { ...v, weight: Math.max(1, weight) } : v)),
    );
  };

  const handleLabel = (id: string, label: string) => {
    writeVariants(
      variants.map((v) => (v.id === id ? { ...v, label: label.slice(0, 40) } : v)),
    );
  };

  /**
   * Promote-to-base: copies the winning variant's snapshot creative onto the
   * wrapper config and disables the experiment in one edit. End-state matches
   * "operator picked one and shipped it" — the schedule rotation contract is
   * preserved, the offer code is preserved, telemetry continuity is preserved.
   *
   * We don't drop the experiment.variants[] — operator might want to re-enable
   * later, or use them as a starting point for a follow-up test. Disabled +
   * unchanged is the least surprising state.
   */
  const handlePromote = (variant: PromoExperimentVariant) => {
    const snap = saved.find((s) => s.id === variant.savedPromoId)?.config ?? null;
    if (!snap) {
      toast.error('Snapshot is no longer in the library.');
      return;
    }
    const promoted = applyScheduledSnapshot(formData, snap);
    setFormData({
      ...promoted,
      experiment: { ...experiment, enabled: false },
    });
    setPromoteCandidate(null);
    toast.success(`"${variant.label}" promoted to base — Save to publish.`);
  };

  const eligibleVariants = variants.filter(
    (v) => v.savedPromoId && (v.weight ?? 1) > 0,
  );
  const canEnable = eligibleVariants.length >= 2;
  const totalWeight = eligibleVariants.reduce(
    (s, v) => s + Math.max(1, v.weight ?? 1),
    0,
  );

  // All-arm impression total (no variantKey filter) for the share % column.
  const { data: globalFunnel } = usePromotionalPopupFunnel({ offerCode });
  const totalImpressions = globalFunnel?.impressions ?? 0;

  // Auto-disable if the operator removes too many variants while enabled —
  // running with <2 arms isn't an A/B test, just a forced-creative override.
  useEffect(() => {
    if (experiment.enabled && eligibleVariants.length < 2) {
      updateExperiment({ ...experiment, enabled: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleVariants.length, experiment.enabled]);

  // Control = first eligible variant (by author order). The "first added is
  // the baseline" convention is unambiguous and matches how operators
  // verbalize the test ("we're testing B against A"). Significance is then
  // computed on each non-control vs. this control.
  const controlVariantId = eligibleVariants[0]?.id ?? null;

  const significanceByVariant = useMemo(() => {
    const out: Record<string, SignificanceState | null> = {};
    if (!controlVariantId) return out;
    const control = armStats[controlVariantId];
    if (!control) return out;
    for (const v of eligibleVariants) {
      const arm = armStats[v.id];
      if (!arm) {
        out[v.id] = null;
        continue;
      }
      out[v.id] = ctrSignificance(arm, control, v.id === controlVariantId);
    }
    return out;
  }, [armStats, eligibleVariants, controlVariantId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className={tokens.card.title}>A/B Experiment</CardTitle>
              <CardDescription>
                Split traffic across saved snapshots to test which creative wins.
                Schedule rotations take priority — experiments only run while no
                rotation window is active.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {experiment.enabled ? (
              <Badge variant="outline" className="border-primary/40 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Running
              </Badge>
            ) : null}
            <Switch
              checked={experiment.enabled}
              disabled={!canEnable}
              onCheckedChange={(checked) =>
                updateExperiment({ ...experiment, enabled: checked })
              }
              aria-label="Enable A/B experiment"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSaved ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Save a promo to the library first — variants reference saved snapshots,
            so there's nothing to test until you have at least two.
          </div>
        ) : (
          <>
            {experiment.enabled && activeSchedule ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-display tracking-wide uppercase text-[11px]">
                    Schedule overrides experiment
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    A scheduled rotation is currently live. Variants will resume
                    bucketing after the rotation window ends.
                  </p>
                </div>
              </div>
            ) : null}

            {!offerCode ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                Per-arm metrics will appear once you set an offer code on the wrapper.
                Bucketing still works without one — telemetry just can't attribute the
                funnel back to this popup.
              </div>
            ) : null}

            {/* Experiment name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Experiment name</Label>
              <Input
                value={experiment.name ?? ''}
                onChange={(e) =>
                  updateExperiment({ ...experiment, name: e.target.value.slice(0, 60) })
                }
                placeholder="e.g. Headline framing test"
              />
            </div>

            {/* Variants list */}
            {variants.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_120px_60px_auto] gap-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Variant</span>
                  <span>Snapshot</span>
                  <span>Weight</span>
                  <span></span>
                </div>
                {variants.map((v) => {
                  const snap = saved.find((s) => s.id === v.savedPromoId);
                  const sharePct =
                    totalWeight > 0 && (v.weight ?? 1) > 0
                      ? `${Math.round((Math.max(1, v.weight ?? 1) / totalWeight) * 100)}%`
                      : '—';
                  const isControl = v.id === controlVariantId;
                  const sig = significanceByVariant[v.id] ?? null;
                  const isWinner = sig?.kind === 'significant-up';
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        'space-y-2 rounded-lg border p-3 transition-colors',
                        isWinner
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-border/60 bg-muted/20',
                      )}
                    >
                      <div className="grid grid-cols-[1fr_120px_60px_auto] gap-2 items-center">
                        <Input
                          value={v.label}
                          onChange={(e) => handleLabel(v.id, e.target.value)}
                          placeholder="Label"
                        />
                        <span className="text-xs text-muted-foreground truncate" title={snap?.name}>
                          {snap?.name ?? '(deleted)'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            value={v.weight ?? 1}
                            onChange={(e) => handleWeight(v.id, Number(e.target.value) || 1)}
                            className="h-9 w-14 text-center"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(v.id)}
                          aria-label="Remove variant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Planned share: <span className="text-foreground font-mono">{sharePct}</span></span>
                        {!snap ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-destructive/50 bg-destructive/10 text-destructive"
                            title="Referenced saved-promo no longer exists. This arm will be skipped (no impressions attributed) until you re-link it or remove the variant."
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Missing creative
                          </Badge>
                        ) : null}
                      </div>
                      {offerCode ? (
                        <>
                          <div className="grid grid-cols-5 gap-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <span>Impressions</span>
                            <span>Actual share</span>
                            <span>CTA clicks</span>
                            <span>Bookings</span>
                            <span>CTR</span>
                          </div>
                          <VariantFunnelRow
                            offerCode={offerCode}
                            variantKey={v.id}
                            totalImpressions={totalImpressions}
                            significance={sig}
                            isControl={isControl}
                            onStats={handleArmStats}
                          />
                          {!isControl && snap ? (
                            <div className="flex justify-end pt-1">
                              <Button
                                variant={isWinner ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() => setPromoteCandidate(v)}
                              >
                                <Crown className="w-3 h-3 mr-1" />
                                Promote to base
                              </Button>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No variants yet. Add at least two snapshots below to start a test.
              </p>
            )}

            {/* Add row */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <div className="grid grid-cols-1 gap-3">{/* sidebar-narrow: stack vertically */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Saved promo</Label>
                  <Select value={draftPromoId} onValueChange={setDraftPromoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a snapshot" />
                    </SelectTrigger>
                    <SelectContent>
                      {saved.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Label (optional)</Label>
                  <Input
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    placeholder="e.g. Free haircut framing"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAdd} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add variant
                </Button>
              </div>
            </div>

            {!canEnable ? (
              <p className="text-[11px] text-muted-foreground/80">
                Add at least two variants to enable the experiment. Single-variant
                tests aren't really tests — use a schedule rotation if you just want
                to swap creative.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/80">
                Visitors are bucketed deterministically — the same visitor sees the
                same arm across reloads. Editing the variant set re-shuffles
                everyone (bucket version <span className="font-mono">{experiment.version}</span>).
                The first variant is the control; significance is computed against
                it using a 95% Wald CI on the CTR delta.
              </p>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog
        open={!!promoteCandidate}
        onOpenChange={(open) => !open && setPromoteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Promote "{promoteCandidate?.label}" to base?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This copies the winning snapshot's creative (headline, body, CTA, image,
              accent) onto your live wrapper and turns the experiment off. Your
              targeting, offer code, and frequency stay exactly as they are.
              Variants are kept in the list so you can re-enable or iterate later.
              Remember to Save to publish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => promoteCandidate && handlePromote(promoteCandidate)}
            >
              Promote to base
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
