/**
 * DockReweighSummary — Post-reweigh result card showing net usage, waste, and cost.
 * Displayed after a bowl has been reweighed.
 */

import { Check, ArrowDown, Beaker, DollarSign, Scale } from 'lucide-react';
import { roundWeight, roundCost, calculateNetUsage } from '@/lib/backroom/mix-calculations';

interface DockReweighSummaryProps {
  dispensedTotal: number;
  leftoverWeight: number;
  estimatedCost: number;
  unit?: string;
}

export function DockReweighSummary({
  dispensedTotal,
  leftoverWeight,
  estimatedCost,
  unit = 'g',
}: DockReweighSummaryProps) {
  const netUsage = calculateNetUsage(dispensedTotal, leftoverWeight);
  const usagePct = dispensedTotal > 0 ? (netUsage / dispensedTotal) * 100 : 0;
  const wastePct = dispensedTotal > 0 ? (leftoverWeight / dispensedTotal) * 100 : 0;
  const netCost = dispensedTotal > 0
    ? roundCost(estimatedCost * (netUsage / dispensedTotal))
    : 0;

  return (
    <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <span className="font-display text-xs tracking-wide uppercase text-emerald-400">
          Reweigh Complete
        </span>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={Beaker}
          label="Dispensed"
          value={`${roundWeight(dispensedTotal)}${unit}`}
          muted
        />
        <MetricTile
          icon={ArrowDown}
          label="Leftover"
          value={`${roundWeight(leftoverWeight)}${unit}`}
          sub={`${roundWeight(wastePct)}% unused`}
        />
        <MetricTile
          icon={Scale}
          label="Net Usage"
          value={`${roundWeight(netUsage)}${unit}`}
          sub={`${roundWeight(usagePct)}% applied`}
          highlight
        />
        <MetricTile
          icon={DollarSign}
          label="Net Cost"
          value={`$${netCost.toFixed(2)}`}
        />
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  muted,
  highlight,
}: {
  icon: typeof Check;
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border)/0.1)] p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
        <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`font-display text-sm tracking-tight ${highlight ? 'text-violet-400' : muted ? 'text-[hsl(var(--platform-foreground-muted))]' : 'text-[hsl(var(--platform-foreground))]'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)] mt-0.5">{sub}</p>
      )}
    </div>
  );
}