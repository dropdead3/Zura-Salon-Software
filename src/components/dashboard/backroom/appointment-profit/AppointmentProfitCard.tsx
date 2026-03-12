/**
 * AppointmentProfitCard — Inline card showing per-appointment profit breakdown.
 */

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, Beaker, Clock, Trash2 } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { EnrichedAppointmentProfit, MarginHealth } from '@/lib/backroom/appointment-profit-engine';

const healthConfig: Record<MarginHealth, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'text-green-600 bg-green-500/10' },
  moderate: { label: 'Moderate', className: 'text-amber-600 bg-amber-500/10' },
  low: { label: 'Low', className: 'text-orange-600 bg-orange-500/10' },
  negative: { label: 'Negative', className: 'text-destructive bg-destructive/10' },
};

interface AppointmentProfitCardProps {
  data: EnrichedAppointmentProfit;
  className?: string;
}

export function AppointmentProfitCard({ data, className }: AppointmentProfitCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const health = healthConfig[data.health];

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <DollarSign className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>
                {data.serviceName ?? 'Service'}
              </CardTitle>
              <p className={tokens.body.muted}>Profit Breakdown</p>
            </div>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', health.className)}>
            {data.marginPct}% — {health.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <ProfitRow
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            label="Service Revenue"
            value={formatCurrency(data.serviceRevenue)}
            variant="revenue"
          />
          <ProfitRow
            icon={<Beaker className="h-4 w-4 text-muted-foreground" />}
            label="Chemical Cost"
            value={`-${formatCurrency(data.chemicalCost)}`}
            variant="cost"
            note={!data.hasMixData ? 'No mix data' : undefined}
          />
          <ProfitRow
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            label="Labor Estimate"
            value={`-${formatCurrency(data.laborEstimate)}`}
            variant="cost"
            note={!data.laborConfigured ? 'Not configured' : undefined}
          />
          <ProfitRow
            icon={<Trash2 className="h-4 w-4 text-muted-foreground" />}
            label="Waste"
            value={formatCurrency(data.wasteCost)}
            variant="neutral"
          />

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className={tokens.body.emphasis}>Contribution Margin</span>
            <span className={cn(tokens.stat.large, data.contributionMargin < 0 && 'text-destructive')}>
              {formatCurrency(data.contributionMargin)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfitRow({
  icon,
  label,
  value,
  variant,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant: 'revenue' | 'cost' | 'neutral';
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className={tokens.body.default}>{label}</span>
        {note && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {note}
          </span>
        )}
      </div>
      <span className={cn(
        tokens.body.emphasis,
        variant === 'cost' && 'text-muted-foreground',
      )}>
        {value}
      </span>
    </div>
  );
}
