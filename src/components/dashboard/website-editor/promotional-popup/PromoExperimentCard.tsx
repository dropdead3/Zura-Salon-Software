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
 *     `MIN_IMPRESSIONS_FOR_RATES` gate as the global funnel card.
 *   - Bucketing version: edits to the variant set bump `version` so visitor
 *     assignment re-shuffles. Renaming/weight-only edits also bump because
 *     re-entry could otherwise show the visitor an arm that no longer exists.
 *   - Currency: none on this surface.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Plus, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
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
import { pickActiveEntry } from '@/lib/promo-schedule';
import {
  usePromotionalPopupFunnel,
  MIN_IMPRESSIONS_FOR_RATES,
} from '@/hooks/usePromotionalPopupFunnel';

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

/** Per-variant funnel row. Memoized so adding/removing variants doesn't
 *  re-fetch sibling rows. */
function VariantFunnelRow({
  offerCode,
  variantKey,
  totalImpressions,
}: {
  offerCode: string;
  variantKey: string;
  /** All-arm impressions in window — used to render a share % so the
   *  operator can sanity-check that traffic is splitting roughly to plan. */
  totalImpressions: number;
}) {
  const { data } = usePromotionalPopupFunnel({ offerCode, variantKey });
  if (!data) {
    return (
      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <span>—</span><span>—</span><span>—</span><span>—</span>
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
    <div className="grid grid-cols-4 gap-2 text-xs">
      <span className="font-mono">{data.impressions.toLocaleString()}</span>
      <span className="font-mono text-muted-foreground">{share}</span>
      <span className="font-mono">{data.ctaClicks.toLocaleString()}</span>
      <span className="font-mono text-primary">{ctr}</span>
    </div>
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

  // Reset draft when an Add succeeds — handled inside handleAdd directly.

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
    // Label-only edits don't need to re-shuffle, but we keep the bump for
    // simplicity — users editing copy mid-test are typically iterating, not
    // measuring, and the alternative (label vs. structural edit detection)
    // is a foot-gun.
    writeVariants(
      variants.map((v) => (v.id === id ? { ...v, label: label.slice(0, 40) } : v)),
    );
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
                  return (
                    <div key={v.id} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
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
                          <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                            Snapshot deleted
                          </Badge>
                        ) : null}
                      </div>
                      {offerCode ? (
                        <>
                          <div className="grid grid-cols-4 gap-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <span>Impressions</span>
                            <span>Actual share</span>
                            <span>CTA clicks</span>
                            <span>CTR</span>
                          </div>
                          <VariantFunnelRow
                            offerCode={offerCode}
                            variantKey={v.id}
                            totalImpressions={totalImpressions}
                          />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                Redemption attribution is offer-code-level until variant tagging
                propagates through the booking flow.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
