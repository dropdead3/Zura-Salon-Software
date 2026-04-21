import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  useUserCompensationAssignments,
  useAssignUserToPlan,
  useUnassignUserFromPlan,
  useCompensationPlans,
  type CompensationPlan,
} from '@/hooks/useCompensationPlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, X } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

interface Props {
  plan: CompensationPlan;
}

export function PlanAssignmentTable({ plan }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [search, setSearch] = useState('');

  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['compensation-plan-staff', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url, stylist_level, is_active')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments } = useUserCompensationAssignments();
  const { data: allPlans } = useCompensationPlans(true);
  const assign = useAssignUserToPlan();
  const unassign = useUnassignUserFromPlan();

  const planById = useMemo(
    () => new Map((allPlans || []).map((p) => [p.id, p])),
    [allPlans],
  );
  const assignmentByUser = useMemo(() => {
    const m = new Map<string, string>();
    (assignments || []).forEach((a) => m.set(a.user_id, a.plan_id));
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (staff || []).filter((s) => {
      if (!q) return true;
      return (
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.display_name || '').toLowerCase().includes(q) ||
        (s.stylist_level || '').toLowerCase().includes(q)
      );
    });
  }, [staff, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Assignments</CardTitle>
              <CardDescription className="font-sans">
                Add staff to this plan. Only one active plan per person at a time.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff…"
            className="pl-9"
          />
        </div>

        {staffLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton + ' h-14'} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground font-sans py-8 text-center">
            No staff match.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((s) => {
              const currentPlanId = assignmentByUser.get(s.user_id);
              const onThisPlan = currentPlanId === plan.id;
              const otherPlan = currentPlanId && !onThisPlan ? planById.get(currentPlanId) : null;
              return (
                <div key={s.user_id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={s.photo_url || undefined} alt={s.full_name || ''} />
                      <AvatarFallback>
                        {(s.full_name || s.display_name || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium font-sans truncate">
                        {s.display_name || s.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-sans truncate">
                        {s.stylist_level || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {otherPlan && (
                      <Badge variant="outline" className="text-xs">
                        On: {otherPlan.name}
                      </Badge>
                    )}
                    {onThisPlan ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unassign.mutate(s.user_id)}
                        disabled={unassign.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          assign.mutate({ userId: s.user_id, planId: plan.id })
                        }
                        disabled={assign.isPending}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
