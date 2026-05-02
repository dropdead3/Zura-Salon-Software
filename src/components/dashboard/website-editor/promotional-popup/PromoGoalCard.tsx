/**
 * Promo Goal card — PR 4: Goal-based auto-suppression.
 *
 * Lets the operator set a redemption-count cap (and optional deadline) on
 * the popup. When the live confirmed-redemption count for the wrapper's
 * `offerCode` hits the cap, `usePromoLifecycle` returns `active: false`
 * for new visitors. The popup is *paused*, not disabled — `enabled`,
 * schedule, and experiment state are preserved so operators can raise the
 * cap to re-arm without losing structure.
 *
 * PR 4 enhancements (this file owns three velocity-aware surfaces):
 *
 *   1. Forecast banner ("on pace to hit cap in ~6 days") — pre-empts
 *      suppression rather than discovering it after-the-fact.
 *   2. Velocity-sized "Raise cap" CTA — when the cap fires AND the
 *      deadline hasn't, the suggested bump is sized from recent demand
 *      instead of a flat +50%. Operator sees the rationale inline.
 *   3. Goal-history nudge — "Last 3 promos all hit cap in <2 days —
 *      consider raising baseline cap to 100" once enough runs accumulate.
 *      Backed by `promo_goal_runs` + a one-shot write when this card
 *      observes a fresh cap-hit.
 *
 * Doctrine alignment:
 *   - Honest silence: forecast/nudge return null when signal is too thin.
 *   - Materiality: 3+ non-zero days for forecast; 3+ runs for nudge.
 *   - Visibility contract: card always renders; sub-blocks stay hidden
 *     until they have data to show.
 *   - Signal Preservation: `started_at` is null when unknown, never 0.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  Target,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Sparkles,
  TrendingUp,
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import {
  type PromotionalPopupSettings,
  type PromoGoal,
} from '@/hooks/usePromotionalPopup';
import {
  evaluateGoal,
  clampGoalCap,
  isGoalConfigured,
  GOAL_CAP_MIN,
  GOAL_CAP_MAX,
} from '@/lib/promo-goal';
import {
  forecastDaysToCap,
  suggestCapBump,
  summarizeGoalHistory,
  summarizeCrossCodePattern,
} from '@/lib/promo-goal-velocity';
import { usePromotionalPopupRedemptions } from '@/hooks/usePromotionalPopupRedemptions';
import {
  usePromoGoalHistory,
  usePromoGoalHistoryOrgWide,
  useRecordGoalHit,
} from '@/hooks/usePromoGoalHistory';

interface PromoGoalCardProps {
  formData: PromotionalPopupSettings;
  setFormData: (next: PromotionalPopupSettings) => void;
}

/** ISO -> value for `<input type="datetime-local">` (local time). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Stamp `startedAt` if not set — used when the operator first authors a
 *  cap, when raising past current redemptions to re-arm, and when clearing
 *  + re-setting. Never overwrites an existing timestamp (Signal Preservation). */
function withStartedAt(goal: PromoGoal | undefined, force = false): PromoGoal {
  if (!goal) return { startedAt: new Date().toISOString() };
  if (goal.startedAt && !force) return goal;
  return { ...goal, startedAt: new Date().toISOString() };
}

export function PromoGoalCard({ formData, setFormData }: PromoGoalCardProps) {
  const offerCode = formData.offerCode?.trim() ?? '';
  const goal = formData.goal;

  // Live redemption stats (count + 14-day series). Reuses the editor's
  // existing query so we don't double-fetch when both the analytics card
  // and this card mount.
  const { data: redemptionStats } = usePromotionalPopupRedemptions(offerCode);
  const redemptions = redemptionStats?.count ?? 0;
  const series = redemptionStats?.series ?? [];

  const status = useMemo(
    () => evaluateGoal({ goal, redemptions }),
    [goal, redemptions],
  );
  const configured = isGoalConfigured(goal);

  // ── Velocity helpers (PR 4 enhancements) ──
  const forecast = useMemo(
    () =>
      forecastDaysToCap({
        cap: goal?.capRedemptions ?? null,
        redemptions,
        series,
      }),
    [goal?.capRedemptions, redemptions, series],
  );
  const velocityBump = useMemo(() => suggestCapBump({ series }), [series]);

  // ── Goal history + recalibration nudge ──
  const { data: history = [] } = usePromoGoalHistory(offerCode);
  const historyNudge = useMemo(() => summarizeGoalHistory(history), [history]);
  const recordGoalHit = useRecordGoalHit();

  // ── Cross-code pattern nudge (org-wide) ──
  // Pulls the full org goal-run log and surfaces the single most material
  // bucket comparison (e.g. "free-* hits cap 3× faster than discount-*").
  // Silent until 2+ buckets each have ≥3 runs and the speed ratio is ≥2×.
  const { data: orgHistory = [] } = usePromoGoalHistoryOrgWide();
  const crossCodeNudge = useMemo(
    () => summarizeCrossCodePattern(orgHistory),
    [orgHistory],
  );
  // Suppress when this code IS the fast bucket — the operator already knows
  // the fast pattern works; the comparative insight is for *next* time they
  // author a slow-bucket promo. Keep visible when this code is the slow
  // bucket OR an unrelated bucket — that's when the nudge changes a decision.
  const showCrossCodeNudge =
    crossCodeNudge.kind === 'cross-code' &&
    bucketKeyFromOfferCode(offerCode) !== crossCodeNudge.fastBucket;

  // ── One-shot write when cap-hit is observed for the first time ──
  // Guards against a re-render storm logging the same hit repeatedly.
  // We key the write to `(offerCode, cap, startedAt)` so raising the cap
  // and hitting again logs a fresh row, but a re-render of the same
  // already-hit state does not.
  const lastLoggedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (status.kind !== 'reached-count') return;
    if (!offerCode) return;
    const key = `${offerCode}|${status.cap}|${goal?.startedAt ?? 'unknown'}`;
    if (lastLoggedKeyRef.current === key) return;
    lastLoggedKeyRef.current = key;
    recordGoalHit.mutate({
      offerCode,
      cap: status.cap,
      redemptionsAtHit: status.redemptions,
      startedAt: goal?.startedAt ?? null,
    });
    // We do NOT include `recordGoalHit` in deps — TanStack Query mutations
    // are stable across renders and including it can trigger re-fires
    // after `onSuccess` invalidates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, offerCode, goal?.startedAt]);

  const updateGoal = (next: PromoGoal | undefined) => {
    setFormData({ ...formData, goal: next });
  };

  const handleClear = () => {
    updateGoal(undefined);
    lastLoggedKeyRef.current = null;
    toast.success('Goal cleared — popup will run until manually paused.');
  };

  const handleRaise = () => {
    if (!goal || typeof goal.capRedemptions !== 'number') return;
    // Velocity-sized bump when we have signal; otherwise fall back to
    // the simple max(50%, +10) heuristic from before.
    const bump =
      velocityBump !== null
        ? velocityBump
        : Math.max(10, Math.ceil((goal.capRedemptions * 0.5) / 5) * 5);
    const next = clampGoalCap(goal.capRedemptions + bump);
    // Re-arm the goal — stamp a fresh startedAt so days_taken on the
    // next hit reflects the new run, not the original.
    updateGoal({
      ...goal,
      capRedemptions: next,
      startedAt: new Date().toISOString(),
    });
    lastLoggedKeyRef.current = null;
    toast.success(
      velocityBump !== null
        ? `Cap raised to ${next} (+${bump} ≈ 1 week of headroom).`
        : `Cap raised to ${next} — popup re-armed.`,
    );
  };

  const handleAdoptSuggestion = (suggested: number) => {
    updateGoal({
      ...(goal ?? {}),
      capRedemptions: clampGoalCap(suggested),
      startedAt: new Date().toISOString(),
    });
    lastLoggedKeyRef.current = null;
    toast.success(`Baseline cap set to ${suggested}.`);
  };

  const handleCapChange = (raw: string) => {
    if (raw === '') {
      updateGoal({ ...(goal ?? {}), capRedemptions: null });
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    updateGoal(
      withStartedAt({ ...(goal ?? {}), capRedemptions: clampGoalCap(parsed) }),
    );
  };

  const handleDeadlineChange = (raw: string) => {
    updateGoal(withStartedAt({ ...(goal ?? {}), deadline: fromLocalInput(raw) }));
  };

  const missingOfferCode = !offerCode;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className={tokens.card.title}>Goal</CardTitle>
              <CardDescription>
                Cap total redemptions (and optionally set a deadline). Once
                hit, the popup auto-pauses for new visitors — your config
                stays intact so you can re-arm in one click.
              </CardDescription>
            </div>
          </div>
          {status.kind === 'reached-count' || status.kind === 'reached-deadline' ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Paused
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingOfferCode ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Add an offer code on the popup config first — goal tracking
            counts confirmed redemptions of that code, so there's nothing
            to track without one.
          </div>
        ) : (
          <>
            {/* Recalibration nudge — only when 3+ runs hit cap fast.
                Sits ABOVE the cap input so operators see the pattern
                before they author the next number. */}
            {historyNudge.kind === 'recalibrate-up' ? (
              <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-xs">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <div className="flex-1">
                  <span className="font-display tracking-wide uppercase text-[11px] text-primary">
                    Pattern detected
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    Your last {historyNudge.runs} promos with this code hit
                    cap in {historyNudge.medianDaysTaken} day
                    {historyNudge.medianDaysTaken === 1 ? '' : 's'} or less
                    (median cap {historyNudge.medianCap.toLocaleString()}).
                    Consider a higher baseline.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdoptSuggestion(historyNudge.suggestedNextCap)}
                  className="shrink-0"
                >
                  Set cap to {historyNudge.suggestedNextCap}
                </Button>
              </div>
            ) : null}

            {/* Suppression banner — only when the goal has actually fired. */}
            {status.kind === 'reached-count' ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-display tracking-wide uppercase text-[11px]">
                    Goal reached — popup paused
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    {status.redemptions.toLocaleString()} of{' '}
                    {status.cap.toLocaleString()} redemptions used. New
                    visitors won't see the popup until you raise the cap or
                    clear the goal.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRaise}
                  className="shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  {velocityBump !== null
                    ? `Raise by ${velocityBump}`
                    : 'Raise cap'}
                </Button>
              </div>
            ) : null}

            {status.kind === 'reached-deadline' ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-display tracking-wide uppercase text-[11px]">
                    Deadline passed — popup paused
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    Your goal deadline of{' '}
                    {new Date(status.deadline).toLocaleString()} has passed.
                    Update or clear the deadline to re-arm.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Forecast banner — pre-empts suppression. Silent when no
                cap, no velocity, or already hit (other banners cover it). */}
            {forecast.kind === 'on-pace' && status.kind === 'active' ? (
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs">
                <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <div className="flex-1">
                  <span className="font-display tracking-wide uppercase text-[11px] text-foreground">
                    On pace
                  </span>
                  <p className="mt-0.5 text-muted-foreground">
                    At ~{forecast.dailyRate.toFixed(1)} redemption
                    {forecast.dailyRate === 1 ? '' : 's'}/day, you'll hit
                    cap in ~{forecast.daysUntilCap} day
                    {forecast.daysUntilCap === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Cap + deadline inputs. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-cap" className="text-xs">
                  Redemption cap
                </Label>
                <Input
                  id="goal-cap"
                  type="number"
                  inputMode="numeric"
                  min={GOAL_CAP_MIN}
                  max={GOAL_CAP_MAX}
                  placeholder="e.g. 50"
                  value={
                    typeof goal?.capRedemptions === 'number'
                      ? String(goal.capRedemptions)
                      : ''
                  }
                  onChange={(e) => handleCapChange(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional. Leave empty to track only by deadline.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-deadline" className="text-xs">
                  Deadline
                </Label>
                <Input
                  id="goal-deadline"
                  type="datetime-local"
                  value={toLocalInput(goal?.deadline)}
                  onChange={(e) => handleDeadlineChange(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional. Pauses the popup once this date passes.
                </p>
              </div>
            </div>

            {/* Active progress block — only when there's a cap to progress against. */}
            {status.kind === 'active' && status.remaining !== null ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-display tracking-wide uppercase text-[11px] text-muted-foreground">
                    Progress
                  </span>
                  <span className="font-mono text-foreground">
                    {redemptions.toLocaleString()} /{' '}
                    {(redemptions + status.remaining).toLocaleString()}
                  </span>
                </div>
                <Progress value={status.progressPct} className="h-1.5" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{status.remaining.toLocaleString()} redemptions remaining</span>
                  {status.deadlineDaysLeft !== null ? (
                    <span>
                      {status.deadlineDaysLeft} day
                      {status.deadlineDaysLeft === 1 ? '' : 's'} left
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Deadline-only active block (no cap). */}
            {status.kind === 'active' &&
            status.remaining === null &&
            status.deadlineDaysLeft !== null ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Tracking by deadline only · {status.deadlineDaysLeft} day
                {status.deadlineDaysLeft === 1 ? '' : 's'} left ·{' '}
                {redemptions.toLocaleString()} redemption
                {redemptions === 1 ? '' : 's'} so far
              </div>
            ) : null}

            {configured ? (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear goal
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
