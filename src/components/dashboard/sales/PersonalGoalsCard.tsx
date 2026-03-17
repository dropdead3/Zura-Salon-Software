import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Target, Edit2, Save, X, Loader2, ShoppingBag } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useStylistPersonalGoals } from '@/hooks/useStylistPersonalGoals';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface PersonalGoalsCardProps {
  userId: string;
  currentMonthlyRevenue?: number;
  currentWeeklyRevenue?: number;
  currentRetailMonthlyRevenue?: number;
  currentRetailWeeklyRevenue?: number;
}

export function PersonalGoalsCard({
  userId,
  currentMonthlyRevenue = 0,
  currentWeeklyRevenue = 0,
  currentRetailMonthlyRevenue = 0,
  currentRetailWeeklyRevenue = 0,
}: PersonalGoalsCardProps) {
  const { goals, isLoading, upsertGoals, isUpdating } = useStylistPersonalGoals(userId);
  const { formatCurrencyWhole } = useFormatCurrency();
  const [isEditing, setIsEditing] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [weeklyTarget, setWeeklyTarget] = useState(0);
  const [retailMonthlyTarget, setRetailMonthlyTarget] = useState(0);
  const [retailWeeklyTarget, setRetailWeeklyTarget] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (goals) {
      setMonthlyTarget(goals.monthly_target);
      setWeeklyTarget(goals.weekly_target);
      setRetailMonthlyTarget(goals.retail_monthly_target ?? 0);
      setRetailWeeklyTarget(goals.retail_weekly_target ?? 0);
      setNotes(goals.notes || '');
    }
  }, [goals]);

  const handleSave = () => {
    upsertGoals({
      monthlyTarget,
      weeklyTarget,
      retailMonthlyTarget,
      retailWeeklyTarget,
      notes,
    });
    setIsEditing(false);
  };

  const monthlyProgress = monthlyTarget > 0 ? (currentMonthlyRevenue / monthlyTarget) * 100 : 0;
  const weeklyProgress = weeklyTarget > 0 ? (currentWeeklyRevenue / weeklyTarget) * 100 : 0;
  const retailMonthlyProgress = retailMonthlyTarget > 0 ? (currentRetailMonthlyRevenue / retailMonthlyTarget) * 100 : 0;
  const retailWeeklyProgress = retailWeeklyTarget > 0 ? (currentRetailWeeklyRevenue / retailWeeklyTarget) * 100 : 0;

  const hasServiceGoals = monthlyTarget > 0 || weeklyTarget > 0;
  const hasRetailGoals = retailMonthlyTarget > 0 || retailWeeklyTarget > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <DashboardLoader size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">MY PERSONAL GOALS</CardTitle>
              <MetricInfoTooltip description="Your individual revenue and retail goals. Progress is calculated from your booked appointments, completed services, and retail sales in the current period." />
            </div>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size={tokens.button.inline} onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size={tokens.button.inline} onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
              <Button size={tokens.button.inline} onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>Set and track your personal sales targets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-5">
            {/* Service Revenue Section */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service Revenue</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly">Monthly Target</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="monthly"
                      type="number"
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly">Weekly Target</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="weekly"
                      type="number"
                      value={weeklyTarget}
                      onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Retail Revenue Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retail Revenue</p>
                <ShoppingBag className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retailMonthly">Monthly Target</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="retailMonthly"
                      type="number"
                      value={retailMonthlyTarget}
                      onChange={(e) => setRetailMonthlyTarget(Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retailWeekly">Weekly Target</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="retailWeekly"
                      type="number"
                      value={retailWeeklyTarget}
                      onChange={(e) => setRetailWeeklyTarget(Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Motivation</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you working towards?"
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Two-column view: Service | Retail */}
            <div className={cn('grid gap-6', (hasServiceGoals || hasRetailGoals) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
              {/* Service Goals */}
              {hasServiceGoals && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly</span>
                      <span className="font-medium">
                        {formatCurrencyWhole(currentMonthlyRevenue)} / {formatCurrencyWhole(monthlyTarget)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(monthlyProgress, 100)}
                      className={cn('h-2', monthlyProgress >= 100 && 'bg-success/20 [&>div]:bg-success-foreground')}
                    />
                    {monthlyProgress >= 100 && <p className="text-xs text-success-foreground font-medium">🎉 Goal achieved!</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Weekly</span>
                      <span className="font-medium">
                        {formatCurrencyWhole(currentWeeklyRevenue)} / {formatCurrencyWhole(weeklyTarget)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(weeklyProgress, 100)}
                      className={cn('h-2', weeklyProgress >= 100 && 'bg-success/20 [&>div]:bg-success-foreground')}
                    />
                    {weeklyProgress >= 100 && <p className="text-xs text-success-foreground font-medium">🎉 Goal achieved!</p>}
                  </div>
                </div>
              )}

              {/* Retail Goals */}
              {hasRetailGoals && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retail</p>
                    <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly</span>
                      <span className="font-medium">
                        {formatCurrencyWhole(currentRetailMonthlyRevenue)} / {formatCurrencyWhole(retailMonthlyTarget)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(retailMonthlyProgress, 100)}
                      className={cn('h-2', retailMonthlyProgress >= 100 && 'bg-success/20 [&>div]:bg-success-foreground')}
                    />
                    {retailMonthlyProgress >= 100 && <p className="text-xs text-success-foreground font-medium">🎉 Goal achieved!</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Weekly</span>
                      <span className="font-medium">
                        {formatCurrencyWhole(currentRetailWeeklyRevenue)} / {formatCurrencyWhole(retailWeeklyTarget)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(retailWeeklyProgress, 100)}
                      className={cn('h-2', retailWeeklyProgress >= 100 && 'bg-success/20 [&>div]:bg-success-foreground')}
                    />
                    {retailWeeklyProgress >= 100 && <p className="text-xs text-success-foreground font-medium">🎉 Goal achieved!</p>}
                  </div>
                </div>
              )}
            </div>

            {notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground italic">"{notes}"</p>
              </div>
            )}

            {!hasServiceGoals && !hasRetailGoals && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Click edit to set your personal goals
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
