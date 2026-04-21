import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Sliders, Settings2, Users } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import {
  useCompensationPlan,
  useUpdateCompensationPlan,
  PLAN_TYPE_META,
  type CompensationPlan,
} from '@/hooks/useCompensationPlans';
import { FlatCommissionEditor } from '@/components/dashboard/payroll/editors/FlatCommissionEditor';
import { BracketsEditor } from '@/components/dashboard/payroll/editors/BracketsEditor';
import { HourlyCommissionEditor } from '@/components/dashboard/payroll/editors/HourlyCommissionEditor';
import { CategoryRateMatrix } from '@/components/dashboard/payroll/editors/CategoryRateMatrix';
import { PoolBuilderEditor } from '@/components/dashboard/payroll/editors/PoolBuilderEditor';
import { RentalTermsEditor } from '@/components/dashboard/payroll/editors/RentalTermsEditor';
import { UniversalModifiers } from '@/components/dashboard/payroll/editors/UniversalModifiers';
import { CompensationSimulator } from '@/components/dashboard/payroll/CompensationSimulator';
import { PlanAssignmentTable } from '@/components/dashboard/payroll/PlanAssignmentTable';

export default function CompensationPlanEditor() {
  const { planId } = useParams<{ planId: string }>();
  const { data: plan, isLoading } = useCompensationPlan(planId);
  const update = useUpdateCompensationPlan();

  const [draft, setDraft] = useState<CompensationPlan | null>(null);
  useEffect(() => {
    if (plan) setDraft(plan);
  }, [plan]);

  const dirty = useMemo(() => {
    if (!plan || !draft) return false;
    return JSON.stringify({
      name: plan.name,
      description: plan.description,
      config: plan.config,
      commission_basis: plan.commission_basis,
      tip_handling: plan.tip_handling,
      refund_clawback: plan.refund_clawback,
      addon_treatment: plan.addon_treatment,
    }) !== JSON.stringify({
      name: draft.name,
      description: draft.description,
      config: draft.config,
      commission_basis: draft.commission_basis,
      tip_handling: draft.tip_handling,
      refund_clawback: draft.refund_clawback,
      addon_treatment: draft.addon_treatment,
    });
  }, [plan, draft]);

  const handleSave = () => {
    if (!draft) return;
    update.mutate({
      id: draft.id,
      patch: {
        name: draft.name,
        description: draft.description,
        config: draft.config,
        commission_basis: draft.commission_basis,
        tip_handling: draft.tip_handling,
        refund_clawback: draft.refund_clawback,
        addon_treatment: draft.addon_treatment,
      },
    });
  };

  if (isLoading || !draft) {
    return (
      <DashboardLayout>
        <div className={tokens.layout.pageContainer + ' max-w-[1600px] mx-auto'}>
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const meta = PLAN_TYPE_META[draft.plan_type];

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer + ' max-w-[1600px] mx-auto'}>
        <DashboardPageHeader
          title={draft.name}
          description={`${meta.label} · ${meta.short}`}
          backTo="/dashboard/admin/compensation"
          actions={
            <div className="flex items-center gap-2">
              {!draft.is_active && <Badge variant="outline">Inactive</Badge>}
              <Button
                onClick={handleSave}
                disabled={!dirty || update.isPending}
                className={tokens.button.page}
              >
                <Save className="w-4 h-4 mr-2" />
                {update.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
              </Button>
            </div>
          }
        />

        <Tabs defaultValue="rates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rates">
              <Sliders className="w-4 h-4 mr-2" />
              Rates & rules
            </TabsTrigger>
            <TabsTrigger value="modifiers">
              <Settings2 className="w-4 h-4 mr-2" />
              Modifiers
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rates">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className={tokens.card.title}>Plan details</CardTitle>
                    <CardDescription className="font-sans">{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Plan name</Label>
                      <Input
                        id="name"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desc">Description</Label>
                      <Textarea
                        id="desc"
                        value={draft.description ?? ''}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                        rows={2}
                        className="mt-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className={tokens.card.title}>Pay rates</CardTitle>
                    <CardDescription className="font-sans">
                      Configure how this plan calculates commission.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlanTypeEditor
                      plan={draft}
                      onChange={(config) => setDraft({ ...draft, config })}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <CompensationSimulator plan={draft} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="modifiers">
            <Card>
              <CardHeader>
                <CardTitle className={tokens.card.title}>Universal modifiers</CardTitle>
                <CardDescription className="font-sans">
                  Apply to every plan type. These affect what revenue is commissionable and how tips/refunds are handled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UniversalModifiers
                  basis={draft.commission_basis}
                  tipHandling={draft.tip_handling}
                  refundClawback={draft.refund_clawback}
                  addonTreatment={draft.addon_treatment}
                  onChange={(patch) => setDraft({ ...draft, ...patch })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <PlanAssignmentTable plan={draft} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PlanTypeEditor({
  plan,
  onChange,
}: {
  plan: CompensationPlan;
  onChange: (config: Record<string, any>) => void;
}) {
  switch (plan.plan_type) {
    case 'flat_commission':
    case 'level_based':
      return (
        <FlatCommissionEditor
          config={plan.config}
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    case 'sliding_period':
      return (
        <BracketsEditor
          config={plan.config}
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    case 'sliding_trailing':
      return (
        <BracketsEditor
          config={plan.config}
          onChange={(c) => onChange({ ...plan.config, ...c })}
          showTrailingWindow
        />
      );
    case 'hourly_vs_commission':
      return (
        <HourlyCommissionEditor
          config={plan.config}
          variant="vs"
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    case 'hourly_plus_commission':
      return (
        <HourlyCommissionEditor
          config={plan.config}
          variant="plus"
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    case 'team_pooled':
      return (
        <PoolBuilderEditor
          config={plan.config}
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    case 'category_based':
      return (
        <CategoryRateMatrix
          config={plan.config}
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    case 'booth_rental':
      return (
        <RentalTermsEditor
          config={plan.config}
          onChange={(c) => onChange({ ...plan.config, ...c })}
        />
      );
    default:
      return (
        <p className="text-sm text-muted-foreground font-sans">
          No editor available for this plan type.
        </p>
      );
  }
}
