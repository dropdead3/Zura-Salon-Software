import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CreditCard } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { PaymentMethodTipMetrics } from '@/hooks/useTipsDrilldown';

interface TipPaymentMethodBreakdownProps {
  byPaymentMethod: Record<string, PaymentMethodTipMetrics>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground) / 0.5)',
];

export function TipPaymentMethodBreakdown({ byPaymentMethod }: TipPaymentMethodBreakdownProps) {
  const { formatCurrencyWhole } = useFormatCurrency();

  const entries = useMemo(() => {
    return Object.entries(byPaymentMethod)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalTips - a.totalTips);
  }, [byPaymentMethod]);

  const totalTips = entries.reduce((s, e) => s + e.totalTips, 0);
  const allUnknown = entries.length === 0 || (entries.length === 1 && entries[0].name === 'Unknown');

  if (allUnknown) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/20 border border-border/30">
        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Payment method data not yet available — will populate after next sync
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs tracking-wide uppercase text-muted-foreground font-medium">
          Tips by Payment Method
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entries}
                dataKey="totalTips"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={16}
                outerRadius={30}
                paddingAngle={0}
                stroke="hsl(var(--border) / 0.4)"
                strokeWidth={1}
              >
                {entries.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrencyWhole(Math.round(value))}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {entries.map((entry, index) => {
            const pct = totalTips > 0 ? (entry.totalTips / totalTips) * 100 : 0;
            return (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-foreground min-w-[60px]">{entry.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  <BlurredAmount>{formatCurrencyWhole(Math.round(entry.totalTips))}</BlurredAmount>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
