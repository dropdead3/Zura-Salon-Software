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
 * Doctrine alignment:
 *   - Honest silence: when the goal is hit, the public surface returns
 *     null (no popup), not a fake "expired" state. This card is the only
 *     surface that explains the suppression — visitors just don't see it.
 *   - Visibility contract: card always renders (operators expect to see
 *     the goal control), but the active-progress block stays hidden until
 *     a goal is configured. The "Set a goal" CTA replaces a misleading
 *     blank state.
 *   - Materiality: the progress + suppression banner only render when an
 *     `offerCode` is also configured. Unattributable popups can't be
 *     goal-tracked because we have no rows to count.
 *   - No currency on this surface; no `BlurredAmount` wrap needed.
 */
import { useMemo } from 'react';
import { Target, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
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
import { usePromotionalPopupRedemptions } from '@/hooks/usePromotionalPopupRedemptions';

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

export function PromoGoalCard({ formData, setFormData }: PromoGoalCardProps) {
  const offerCode = formData.offerCode?.trim() ?? '';
  const goal = formData.goal;

  // Live redemption count — reuses the editor's existing query so we don't
  // double-fetch when both the analytics card and this card mount.
  const { data: redemptionStats } = usePromotionalPopupRedemptions(offerCode);
  const redemptions = redemptionStats?.count ?? 0;

  const status = useMemo(
    () => evaluateGoal({ goal, redemptions }),
    [goal, redemptions],
  );
  const configured = isGoalConfigured(goal);

  const updateGoal = (next: PromoGoal | undefined) => {
    setFormData({ ...formData, goal: next });
  };

  const handleClear = () => {
    updateGoal(undefined);
    toast.success('Goal cleared — popup will run until manually paused.');
  };

  const handleRaise = () => {
    if (!goal || typeof goal.capRedemptions !== 'number') return;
    // Raise by 50% (rounded up to the nearest 5) or +10, whichever is
    // larger — matches operator intuition for "give me meaningful headroom".
    const bump = Math.max(10, Math.ceil((goal.capRedemptions * 0.5) / 5) * 5);
    const next = clampGoalCap(goal.capRedemptions + bump);
    updateGoal({ ...goal, capRedemptions: next });
    toast.success(`Cap raised to ${next} — popup re-armed.`);
  };

  const handleCapChange = (raw: string) => {
    if (raw === '') {
      updateGoal({ ...(goal ?? {}), capRedemptions: null });
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    updateGoal({ ...(goal ?? {}), capRedemptions: clampGoalCap(parsed) });
  };

  const handleDeadlineChange = (raw: string) => {
    updateGoal({ ...(goal ?? {}), deadline: fromLocalInput(raw) });
  };

  // Nothing to count against without an offer code — show a soft empty
  // state explaining why goal-tracking isn't available yet (Materiality).
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
                  Raise cap
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
