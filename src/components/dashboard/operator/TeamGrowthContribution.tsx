import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface TeamMember {
  userId: string;
  name: string;
  totalCents: number;
}

export function TeamGrowthContribution() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { formatCurrency } = useFormatCurrency();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  // Fetch completed tasks with Zura attribution this month, grouped by user
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-growth-contribution', orgId, monthStart],
    queryFn: async () => {
      // Get completed zura/seo tasks this month with revenue
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('user_id, estimated_revenue_impact_cents')
        .eq('is_completed', true)
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd)
        .in('source', ['zura', 'seo_engine'] as any)
        .gt('estimated_revenue_impact_cents', 0);

      if (error) throw error;
      if (!tasks || tasks.length === 0) return [];

      // Aggregate by user
      const byUser: Record<string, number> = {};
      (tasks as any[]).forEach(t => {
        const uid = t.user_id;
        byUser[uid] = (byUser[uid] ?? 0) + (t.estimated_revenue_impact_cents ?? 0);
      });

      // Fetch profiles for names
      const userIds = Object.keys(byUser);
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profileMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Team Member';
      });

      return Object.entries(byUser)
        .map(([userId, totalCents]) => ({
          userId,
          name: profileMap[userId] || 'Team Member',
          totalCents,
        }))
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 5);
    },
    enabled: !!orgId,
  });

  if (isLoading) return null;

  if (members.length === 0) {
    return (
      <Card className="rounded-xl overflow-hidden">
        <div className="p-5 flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Users className={tokens.card.icon} />
          </div>
          <div>
            <h3 className={tokens.card.title}>Growth Drivers</h3>
            <p className="text-xs text-muted-foreground font-sans mt-0.5">Complete Zura tasks to see team growth attribution here</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className={tokens.card.iconBox}>
            <Users className={tokens.card.icon} />
          </div>
          <div>
            <h3 className={tokens.card.title}>Growth Drivers</h3>
            <p className="text-[10px] text-muted-foreground font-sans">Zura-attributed revenue this month</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {members.map((member, i) => {
            const initials = member.name
              .split(' ')
              .map(w => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={member.userId} className="flex items-center gap-3">
                <span className="text-[10px] font-sans text-muted-foreground w-4 text-right tabular-nums">
                  {i + 1}
                </span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-sans bg-muted">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs font-sans truncate flex-1">{member.name}</p>
                <p className="text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                  <BlurredAmount>
                    +{formatCurrency(member.totalCents / 100)}
                  </BlurredAmount>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
