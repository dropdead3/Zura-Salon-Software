import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, ExternalLink } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import {
  useCompensationPlans,
  useUserCompensationAssignments,
  useAssignUserToPlan,
  useUnassignUserFromPlan,
  PLAN_TYPE_META,
} from '@/hooks/useCompensationPlans';

interface Props {
  userId: string;
}

export function CompensationTab({ userId }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { data: plans, isLoading: plansLoading } = useCompensationPlans(false);
  const { data: assignments, isLoading: assignLoading } = useUserCompensationAssignments();
  const assignToPlan = useAssignUserToPlan();
  const unassign = useUnassignUserFromPlan();

  const isLoading = plansLoading || assignLoading;

  const currentAssignment = assignments?.find(a => a.user_id === userId);
  const currentPlan = currentAssignment ? plans?.find(p => p.id === currentAssignment.plan_id) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">COMPENSATION PLAN</CardTitle>
          </div>
          <CardDescription>Assign a compensation plan that defines how this team member is paid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {currentPlan ? (
                <div className="p-4 rounded-lg border border-border/60 bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm tracking-wide text-foreground">{currentPlan.name}</span>
                        <Badge variant="outline" className="text-[10px]">{PLAN_TYPE_META[currentPlan.plan_type].short}</Badge>
                      </div>
                      <p className={tokens.body.muted + ' text-xs mt-1'}>{PLAN_TYPE_META[currentPlan.plan_type].description}</p>
                      {currentAssignment && (
                        <p className="font-sans text-xs text-muted-foreground mt-1">
                          Effective from {currentAssignment.effective_from}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unassign.mutate(userId)}
                      disabled={unassign.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={tokens.body.muted + ' text-sm italic'}>No compensation plan assigned. Select one below.</p>
              )}

              <div>
                <label className="font-sans text-sm font-medium text-foreground mb-2 block">
                  {currentPlan ? 'Switch to a different plan' : 'Assign a plan'}
                </label>
                <Select
                  value={currentPlan?.id ?? ''}
                  onValueChange={(planId) => assignToPlan.mutate({ userId, planId })}
                  disabled={assignToPlan.isPending || !plans?.length}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder={plans?.length ? 'Select a plan…' : 'No plans configured yet'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(plans || []).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} <span className="text-muted-foreground text-xs ml-1">· {PLAN_TYPE_META[p.plan_type].short}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={() => navigate(dashPath('/admin/compensation'))} className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Manage all compensation plans
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-wide">PLAN HISTORY</CardTitle>
          <CardDescription>Historical record of compensation plan assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={tokens.body.muted + ' text-sm italic'}>
            Plan history is not yet tracked. Future plan changes will appear here as a timeline once history metadata is enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
