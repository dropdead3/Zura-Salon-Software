import { formatCurrency } from '@/lib/format';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';

interface Props {
  opportunities: ZuraCapitalOpportunity[];
  activeProjectCount: number;
  totalDeployed: number;
}

function c(cents: number) { return cents / 100; }

export function CapitalQueueSummaryStrip({ opportunities, activeProjectCount, totalDeployed }: Props) {
  const eligible = opportunities.filter(o => o.zuraEligible);
  const totalLift = eligible.reduce((sum, o) => sum + o.predictedLiftExpectedCents, 0);

  const kpis = [
    { label: 'Active Opportunities', value: String(eligible.length) },
    { label: 'Active Projects', value: String(activeProjectCount) },
    { label: 'Total Predicted Lift', value: `+${formatCurrency(c(totalLift), { noCents: true })}`, blurred: true },
    { label: 'Capital Deployed', value: formatCurrency(c(totalDeployed), { noCents: true }), blurred: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="p-3 rounded-lg bg-muted/30 border border-border/40">
          <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider block mb-0.5">{k.label}</span>
          <span className="font-display text-lg tracking-wide">
            {(k as any).blurred ? <BlurredAmount>{k.value}</BlurredAmount> : k.value}
          </span>
        </div>
      ))}
    </div>
  );
}
