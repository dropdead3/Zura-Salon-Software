import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UsersRound, Target } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

interface StaffGoal {
  user_id: string;
  monthly_target: number;
  weekly_target: number;
  display_name: string;
}

export function TeamGoalsSummary() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Fetch all staff with their personal goals
  const { data: staffGoals, isLoading } = useQuery({
    queryKey: ['team-goals-summary', orgId],
    queryFn: async () => {
      // Get all active employees
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (empError) throw empError;

      // Get personal goals
      const userIds = (employees || []).map(e => e.user_id);
      const { data: goals, error: goalsError } = await supabase
        .from('stylist_personal_goals')
        .select('user_id, monthly_target, weekly_target')
        .in('user_id', userIds);

      if (goalsError) throw goalsError;

      const goalMap = new Map((goals || []).map(g => [g.user_id, g]));

      return (employees || []).map(e => ({
        user_id: e.user_id,
        display_name: e.display_name || e.full_name || 'Unknown',
        monthly_target: goalMap.get(e.user_id)?.monthly_target ?? 0,
        weekly_target: goalMap.get(e.user_id)?.weekly_target ?? 0,
        hasGoal: goalMap.has(e.user_id) && (goalMap.get(e.user_id)!.monthly_target > 0),
      }));
    },
    enabled: !!orgId,
  });

  const totalStaff = staffGoals?.length ?? 0;
  const withGoals = staffGoals?.filter(s => s.hasGoal).length ?? 0;
  const participationPct = totalStaff > 0 ? Math.round((withGoals / totalStaff) * 100) : 0;
  const staffWithGoals = staffGoals?.filter(s => s.hasGoal) ?? [];
  const staffWithoutGoals = staffGoals?.filter(s => !s.hasGoal) ?? [];

  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <UsersRound className={tokens.card.icon} />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Team Goal Participation</CardTitle>
            <CardDescription>
              {withGoals} of {totalStaff} staff with active goals ({participationPct}%)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress
          value={participationPct}
          className="h-2"
          indicatorClassName={participationPct >= 80 ? 'bg-emerald-500' : participationPct >= 50 ? 'bg-amber-500' : 'bg-destructive'}
        />

        {staffWithGoals.length > 0 && (
          <div className="space-y-2">
            {staffWithGoals.map(s => (
              <div key={s.user_id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className={tokens.body.emphasis}>{s.display_name}</span>
                <span className="text-sm text-muted-foreground">
                  <BlurredAmount>
                    {`$${(s.monthly_target / 1000).toFixed(1)}k/mo`}
                  </BlurredAmount>
                </span>
              </div>
            ))}
          </div>
        )}

        {staffWithoutGoals.length > 0 && (
          <div className="pt-2">
            <p className={cn(tokens.label.tiny, 'mb-2'}>No Goals Set</p>
            <div className="flex flex-wrap gap-1.5">
              {staffWithoutGoals.map(s => (
                <span key={s.user_id} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {s.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
