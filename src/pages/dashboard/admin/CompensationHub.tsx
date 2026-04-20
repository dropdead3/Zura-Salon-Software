import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, Briefcase, CheckCircle2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import {
  useCompensationPlans,
  useUserCompensationAssignments,
  PLAN_TYPE_META,
  type CompensationPlan,
  type CompensationPlanType,
} from '@/hooks/useCompensationPlans';
import { CreateCompensationPlanDialog } from '@/components/dashboard/payroll/CreateCompensationPlanDialog';

export default function CompensationHub() {
  const { data: plans, isLoading } = useCompensationPlans(true);
  const { data: assignments } = useUserCompensationAssignments();
  const [createOpen, setCreateOpen] = useState(false);

  const assignmentCountByPlan = new Map<string, number>();
  (assignments || []).forEach((a) => {
    assignmentCountByPlan.set(a.plan_id, (assignmentCountByPlan.get(a.plan_id) || 0) + 1);
  });

  const totalStaffOnPlans = assignments?.length ?? 0;
  const activePlanCount = (plans || []).filter((p) => p.is_active).length;

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer + ' max-w-[1600px] mx-auto'}>
        <DashboardPageHeader
          title="Compensation Plans"
          description="Pay structure for your team. One plan per pay model — assign staff to the plan that matches how they're paid."
          backTo="/dashboard/admin/team-hub"
          actions={
            <Button onClick={() => setCreateOpen(true)} className={tokens.button.page}>
              <Plus className="w-4 h-4 mr-2" />
              New plan
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatTile
            icon={<Briefcase className="w-5 h-5 text-primary" />}
            label="Active plans"
            value={activePlanCount}
          />
          <StatTile
            icon={<Users className="w-5 h-5 text-primary" />}
            label="Staff on a plan"
            value={totalStaffOnPlans}
          />
          <StatTile
            icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
            label="Plan types in use"
            value={new Set((plans || []).map((p) => p.plan_type)).size}
          />
        </div>

        {/* Plans list */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton + ' h-44'} />
            ))}
          </div>
        ) : !plans || plans.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                assignedCount={assignmentCountByPlan.get(plan.id) || 0}
              />
            ))}
          </div>
        )}

        <CreateCompensationPlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </DashboardLayout>
  );
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="relative">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={tokens.card.iconBox}>{icon}</div>
          <div className={tokens.kpi.label}>{label}</div>
        </div>
        <div className={tokens.kpi.value}>{value}</div>
      </CardContent>
    </Card>
  );
}

// ─── Plan card ───────────────────────────────────────────────────────────────

function PlanCard({ plan, assignedCount }: { plan: CompensationPlan; assignedCount: number }) {
  const meta = PLAN_TYPE_META[plan.plan_type];

  return (
    <Card className={!plan.is_active ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle className={tokens.card.title}>{plan.name}</CardTitle>
              {plan.is_default && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
              {!plan.is_active && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <CardDescription className="font-sans text-sm">
              {meta.label} · {meta.short}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground font-sans mb-4 line-clamp-2">
          {plan.description || meta.description}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {assignedCount} {assignedCount === 1 ? 'person' : 'people'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <BasisChip label={plan.commission_basis.replace(/_/g, ' ')} />
            <BasisChip label={`tips ${plan.tip_handling.replace(/_/g, ' ')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BasisChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-sans text-muted-foreground">
      {label}
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className={tokens.empty.container + ' py-16'}>
        <Briefcase className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No compensation plans yet</h3>
        <p className={tokens.empty.description}>
          A compensation plan defines how your team gets paid. Create one to get started.
        </p>
        <Button onClick={onCreate} className={tokens.button.hero + ' mt-4'}>
          <Plus className="w-4 h-4 mr-2" />
          Create first plan
        </Button>
      </CardContent>
    </Card>
  );
}
