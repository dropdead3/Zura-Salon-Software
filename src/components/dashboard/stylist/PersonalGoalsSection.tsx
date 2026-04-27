/**
 * PersonalGoalsSection — stylist's own monthly + weekly targets with
 * live progress against booked revenue.
 *
 * Stylist Privacy Contract: targets and progress are scoped to the
 * authenticated user. No team data is read or rendered.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useStylistPersonalGoals } from '@/hooks/useStylistPersonalGoals';
import { useStylistIncomeForecast } from '@/hooks/useStylistIncomeForecast';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { tokens } from '@/lib/design-tokens';

export function PersonalGoalsSection() {
  const { user } = useAuth();
  const { goals, isLoading, upsertGoals, isUpdating } = useStylistPersonalGoals(user?.id);
  const { data: forecast } = useStylistIncomeForecast();
  const { formatCurrencyWhole } = useFormatCurrency();

  const [open, setOpen] = useState(false);
  const [weekly, setWeekly] = useState('');
  const [monthly, setMonthly] = useState('');

  const weeklyTarget = Number(goals?.weekly_target ?? 0);
  const monthlyTarget = Number(goals?.monthly_target ?? 0);
  const bookedThisWeek = forecast?.bookedRevenue ?? 0;

  // Project monthly from current week's booked revenue (4.33 weeks/month)
  const projectedMonthly = bookedThisWeek * 4.33;

  const weeklyPct = weeklyTarget > 0 ? Math.min(100, (bookedThisWeek / weeklyTarget) * 100) : 0;
  const monthlyPct = monthlyTarget > 0 ? Math.min(100, (projectedMonthly / monthlyTarget) * 100) : 0;

  const openEditor = () => {
    setWeekly(weeklyTarget ? String(weeklyTarget) : '');
    setMonthly(monthlyTarget ? String(monthlyTarget) : '');
    setOpen(true);
  };

  const handleSave = () => {
    upsertGoals({
      weeklyTarget: Number(weekly) || 0,
      monthlyTarget: Number(monthly) || 0,
    });
    setOpen(false);
  };

  return (
    <Card className="rounded-xl bg-card/80 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Personal Goals</CardTitle>
            <CardDescription>Your own targets — not visible to your team</CardDescription>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-4 rounded-full"
              onClick={openEditor}
            >
              <Pencil className="w-4 h-4 mr-2" />
              {weeklyTarget || monthlyTarget ? 'Edit' : 'Set goals'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Your sales targets</DialogTitle>
              <DialogDescription>
                These targets stay private to you. Only you see your progress.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="weekly">Weekly target</Label>
                <Input
                  id="weekly"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="0"
                  value={weekly}
                  onChange={(e) => setWeekly(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly">Monthly target</Label>
                <Input
                  id="monthly"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="0"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                Save targets
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isLoading && weeklyTarget === 0 && monthlyTarget === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="font-sans text-sm text-muted-foreground">
              Set a weekly and monthly target to see your private progress here.
            </p>
          </div>
        ) : (
          <>
            <ProgressRow
              label="This week"
              currentLabel={<BlurredAmount>{formatCurrencyWhole(bookedThisWeek)}</BlurredAmount>}
              targetLabel={<BlurredAmount>{formatCurrencyWhole(weeklyTarget)}</BlurredAmount>}
              pct={weeklyPct}
              hasTarget={weeklyTarget > 0}
            />
            <ProgressRow
              label="This month (projected)"
              currentLabel={<BlurredAmount>{formatCurrencyWhole(projectedMonthly)}</BlurredAmount>}
              targetLabel={<BlurredAmount>{formatCurrencyWhole(monthlyTarget)}</BlurredAmount>}
              pct={monthlyPct}
              hasTarget={monthlyTarget > 0}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressRow({
  label,
  currentLabel,
  targetLabel,
  pct,
  hasTarget,
}: {
  label: string;
  currentLabel: React.ReactNode;
  targetLabel: React.ReactNode;
  pct: number;
  hasTarget: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-sans text-sm tabular-nums text-foreground">
          {currentLabel}
          {hasTarget && (
            <span className="text-muted-foreground"> / {targetLabel}</span>
          )}
        </span>
      </div>
      <Progress value={hasTarget ? pct : 0} className="h-2" />
      {hasTarget && (
        <p className="text-[10px] font-sans text-muted-foreground tabular-nums">
          {pct.toFixed(0)}% to goal
        </p>
      )}
    </div>
  );
}
