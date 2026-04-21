import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tokens } from '@/lib/design-tokens';
import type { CompensationPlan } from '@/hooks/useCompensationPlans';

interface Props {
  plan: CompensationPlan;
}

/**
 * Live simulator — given hypothetical sales/hours, projects what each plan would pay.
 * Stays in sync with the editor (re-renders on plan.config change).
 */
export function CompensationSimulator({ plan }: Props) {
  const [serviceRevenue, setServiceRevenue] = useState(4000);
  const [retailRevenue, setRetailRevenue] = useState(500);
  const [hoursWorked, setHoursWorked] = useState(40);

  const result = useMemo(
    () => simulate(plan, { serviceRevenue, retailRevenue, hoursWorked }),
    [plan, serviceRevenue, retailRevenue, hoursWorked],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <span className="text-primary text-sm font-medium">$</span>
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Pay simulator</CardTitle>
            <CardDescription className="font-sans">
              See what one stylist would earn under this plan.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="sim-svc">Service revenue ($)</Label>
            <Input
              id="sim-svc"
              type="number"
              value={serviceRevenue}
              onChange={(e) => setServiceRevenue(Number(e.target.value) || 0)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="sim-retail">Retail revenue ($)</Label>
            <Input
              id="sim-retail"
              type="number"
              value={retailRevenue}
              onChange={(e) => setRetailRevenue(Number(e.target.value) || 0)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="sim-hours">Hours worked</Label>
            <Input
              id="sim-hours"
              type="number"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(Number(e.target.value) || 0)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <ResultTile label="Service comp" value={result.serviceComp} />
          <ResultTile label="Retail comp" value={result.retailComp} />
          <ResultTile label="Total payout" value={result.total} highlight />
        </div>

        {result.notes.length > 0 && (
          <ul className="text-xs text-muted-foreground font-sans space-y-1 pt-1">
            {result.notes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ResultTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border p-3 ' +
        (highlight ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/30')
      }
    >
      <div className={tokens.kpi.label}>{label}</div>
      <div className={tokens.kpi.value + ' mt-1'}>${value.toFixed(2)}</div>
    </div>
  );
}

function simulate(
  plan: CompensationPlan,
  ctx: { serviceRevenue: number; retailRevenue: number; hoursWorked: number },
): { serviceComp: number; retailComp: number; total: number; notes: string[] } {
  const { config } = plan;
  const notes: string[] = [];
  let serviceComp = 0;
  let retailComp = (config.retail_rate ?? 0) * ctx.retailRevenue;

  switch (plan.plan_type) {
    case 'flat_commission':
    case 'level_based':
      serviceComp = (config.service_rate ?? 0) * ctx.serviceRevenue;
      break;
    case 'sliding_period':
    case 'sliding_trailing': {
      const brackets = config.brackets ?? [];
      let remaining = ctx.serviceRevenue;
      let cursor = 0;
      brackets.forEach((b: any) => {
        const cap = b.max ?? Infinity;
        const slice = Math.max(0, Math.min(cap, ctx.serviceRevenue) - cursor);
        if (slice > 0 && remaining > 0) {
          const taken = Math.min(slice, remaining);
          serviceComp += taken * (b.rate ?? 0);
          remaining -= taken;
          cursor += taken;
        }
      });
      if (plan.plan_type === 'sliding_trailing') {
        notes.push(`Bracket selected from ${config.window_weeks ?? 4}-week trailing avg.`);
      }
      break;
    }
    case 'hourly_vs_commission': {
      const hourly = (config.hourly_rate ?? 0) * ctx.hoursWorked;
      const commission = (config.service_rate ?? 0) * ctx.serviceRevenue;
      serviceComp = Math.max(hourly, commission);
      notes.push(
        `Hourly base: $${hourly.toFixed(2)} vs commission: $${commission.toFixed(2)} — paid the higher.`,
      );
      break;
    }
    case 'hourly_plus_commission': {
      const hourly = (config.hourly_rate ?? 0) * ctx.hoursWorked;
      const commission = (config.service_rate ?? 0) * ctx.serviceRevenue;
      serviceComp = hourly + commission;
      notes.push(`Hourly base $${hourly.toFixed(2)} + commission $${commission.toFixed(2)}.`);
      break;
    }
    case 'team_pooled':
      serviceComp = (config.service_rate ?? 0) * ctx.serviceRevenue;
      notes.push('Pool total — actual per-member payout depends on split method and members.');
      break;
    case 'category_based': {
      const rates: Record<string, number> = config.rates_by_category ?? {};
      const avgRate =
        Object.values(rates).reduce((s: number, r: any) => s + Number(r), 0) /
        Math.max(1, Object.keys(rates).length);
      serviceComp = avgRate * ctx.serviceRevenue;
      notes.push('Estimate uses avg category rate. Per-service breakdown applied at payroll time.');
      break;
    }
    case 'booth_rental': {
      const rent = config.weekly_rent ?? 0;
      const houseShare = (config.commission_above_rent ?? 0) * Math.max(0, ctx.serviceRevenue - rent);
      serviceComp = ctx.serviceRevenue - rent - houseShare;
      retailComp = ctx.retailRevenue;
      notes.push(`Weekly rent $${rent} subtracted. House takes ${((config.commission_above_rent ?? 0) * 100).toFixed(0)}% above rent.`);
      break;
    }
  }

  if (plan.commission_basis === 'net_of_discount') {
    notes.push('Net of discount — actual revenue may be lower than gross POS ticket.');
  }
  if (plan.commission_basis === 'net_of_product_cost') {
    notes.push('Net of back-bar/chemical cost — chemical charges deducted before commission.');
  }

  return { serviceComp, retailComp, total: serviceComp + retailComp, notes };
}
