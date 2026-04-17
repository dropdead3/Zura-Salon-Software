/**
 * WasteCategoryBreakdownCard — Donut chart + table showing waste by category.
 * Surfaced in the Analytics sub-tab of the Command Center.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trash2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { WASTE_CATEGORY_LABELS } from '@/hooks/color-bar/useWasteEvents';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface WasteCategoryBreakdownCardProps {
  wasteByCategory: Record<string, number>;
  totalWasteQty: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  leftover_bowl_waste: 'hsl(var(--primary))',
  overmix_waste: 'hsl(var(--accent))',
  spill_waste: 'hsl(220 70% 55%)',
  expired_product_discard: 'hsl(30 80% 55%)',
  contamination_discard: 'hsl(0 65% 55%)',
  wrong_mix: 'hsl(280 60% 55%)',
  client_refusal: 'hsl(170 60% 45%)',
};

export function WasteCategoryBreakdownCard({ wasteByCategory, totalWasteQty }: WasteCategoryBreakdownCardProps) {
  const chartData = useMemo(() => {
    return Object.entries(wasteByCategory)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => ({
        name: (WASTE_CATEGORY_LABELS as Record<string, string>)[key] ?? key,
        value: Math.round(qty * 10) / 10,
        key,
        pct: totalWasteQty > 0 ? Math.round((qty / totalWasteQty) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [wasteByCategory, totalWasteQty]);

  // Visibility Contract: no waste categories with non-zero quantities.
  if (chartData.length === 0) {
    reportVisibilitySuppression('waste-category-breakdown', 'no-data', {
      categoryCount: 0,
      totalWasteQty,
    });
    return null;
  }

  return (
    <Card className={cn(tokens.card.wrapper)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Trash2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Waste by Category</CardTitle>
                <MetricInfoTooltip description="Breakdown of waste by category type. Helps identify the primary sources of product loss." />
              </div>
              <CardDescription className="text-xs">
                {totalWasteQty.toFixed(1)}g total across {chartData.length} categories
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Donut chart */}
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={56}
                  paddingAngle={0}
                  stroke="hsl(var(--border) / 0.4)"
                  strokeWidth={1}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] ?? 'hsl(var(--muted))'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}g`, '']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend table */}
          <div className="flex-1 space-y-1.5">
            {chartData.map((entry) => (
              <div key={entry.key} className="flex items-center gap-2 text-xs font-sans">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[entry.key] ?? 'hsl(var(--muted))' }}
                />
                <span className="flex-1 text-foreground truncate">{entry.name}</span>
                <span className="tabular-nums text-muted-foreground">{entry.value}g</span>
                <span className="tabular-nums text-muted-foreground/60 w-10 text-right">{entry.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
