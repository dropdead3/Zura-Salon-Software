import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/* ─── Status Indicators ─── */
type Support = 'full' | 'partial' | 'none';

function StatusIcon({ status }: { status: Support }) {
  if (status === 'full') return <CheckCircle2 className="w-4 h-4 text-success shrink-0" />;
  if (status === 'partial') return <MinusCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
  return <XCircle className="w-4 h-4 text-muted-foreground/30 shrink-0" />;
}

/* ─── Comparison Data (verified from public sources) ─── */
type FeatureRow = {
  feature: string;
  zura: Support;
  vish: Support;
  salonScale: Support;
};

type FeatureCategory = {
  category: string;
  rows: FeatureRow[];
};

const comparisonData: FeatureCategory[] = [
  {
    category: 'Core Tracking',
    rows: [
      { feature: 'Per-gram formula tracking', zura: 'full', vish: 'full', salonScale: 'full' },
      { feature: 'Formula storage and recall', zura: 'full', vish: 'full', salonScale: 'full' },
      { feature: 'Waste tracking', zura: 'full', vish: 'full', salonScale: 'full' },
      { feature: 'Ghost loss detection', zura: 'full', vish: 'none', salonScale: 'none' },
    ],
  },
  {
    category: 'Workflow and Operations',
    rows: [
      { feature: 'Assistant prep workflows', zura: 'full', vish: 'none', salonScale: 'none' },
      { feature: 'Service blueprints', zura: 'full', vish: 'none', salonScale: 'none' },
      { feature: 'Predictive reorder alerts', zura: 'full', vish: 'none', salonScale: 'none' },
      { feature: 'Demand forecasting', zura: 'full', vish: 'none', salonScale: 'none' },
    ],
  },
  {
    category: 'Business Intelligence',
    rows: [
      { feature: 'Cost-per-service profitability', zura: 'full', vish: 'none', salonScale: 'partial' },
      { feature: 'Supply fee recovery', zura: 'full', vish: 'none', salonScale: 'none' },
      { feature: 'Multi-location intelligence', zura: 'full', vish: 'partial', salonScale: 'none' },
      { feature: 'Full platform integration', zura: 'full', vish: 'none', salonScale: 'none' },
    ],
  },
];

const pricingComparison = [
  { name: 'Zura Backroom', pricing: '$20/location + $0.50/service', note: 'Usage-based' },
  { name: 'Vish', pricing: '£30–240/mo by stylist count', note: '+ £165/scale' },
  { name: 'SalonScale', pricing: '$49–199/mo by stylist count', note: 'Scale extra on monthly' },
];

/* ─── Column headers ─── */
const columns = [
  { key: 'zura' as const, label: 'Zura Backroom' },
  { key: 'vish' as const, label: 'Vish' },
  { key: 'salonScale' as const, label: 'SalonScale' },
];

export function CompetitorComparison() {
  return (
    <div className="space-y-4">
      <p className={cn(tokens.heading.section, 'text-center text-muted-foreground')}>
        How Zura Backroom Compares
      </p>

      <Card className="bg-card/60 border-border/40 overflow-hidden">
        <CardContent className="p-0">
          {/* Scrollable wrapper for mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              {/* Column Headers */}
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left p-4 pb-3 w-[40%]">
                    <span className="font-sans text-xs text-muted-foreground">Feature</span>
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className="text-center p-4 pb-3 w-[20%]">
                      <span className={cn(
                        'font-sans text-xs',
                        col.key === 'zura' ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}>
                        {col.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {comparisonData.map((category, catIdx) => (
                  <>
                    {/* Category header */}
                    <tr key={`cat-${catIdx}`} className="bg-muted/20">
                      <td
                        colSpan={4}
                        className="px-4 py-2"
                      >
                        <span className={cn(tokens.heading.subsection, 'text-[10px]')}>
                          {category.category}
                        </span>
                      </td>
                    </tr>

                    {/* Feature rows */}
                    {category.rows.map((row, rowIdx) => (
                      <tr
                        key={`row-${catIdx}-${rowIdx}`}
                        className="border-b border-border/20 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <span className="font-sans text-sm text-foreground">{row.feature}</span>
                        </td>
                        {columns.map((col) => (
                          <td key={col.key} className="text-center px-4 py-3">
                            <div className="flex justify-center">
                              <StatusIcon status={row[col.key]} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}

                {/* Pricing row */}
                <tr className="bg-muted/20">
                  <td colSpan={4} className="px-4 py-2">
                    <span className={cn(tokens.heading.subsection, 'text-[10px]')}>
                      Pricing
                    </span>
                  </td>
                </tr>
                {pricingComparison.map((item, idx) => (
                  <tr
                    key={`price-${idx}`}
                    className={cn(
                      'border-b border-border/20 last:border-0',
                      idx === 0 && 'bg-primary/5'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={cn(
                        'font-sans text-sm',
                        idx === 0 ? 'text-primary font-medium' : 'text-foreground'
                      )}>
                        {item.name}
                      </span>
                    </td>
                    <td colSpan={3} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-sm text-foreground">{item.pricing}</span>
                        <span className="font-sans text-xs text-muted-foreground">{item.note}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="px-4 py-4 border-t border-border/30">
            <p className="font-sans text-xs text-muted-foreground text-center leading-relaxed max-w-lg mx-auto">
              Zura Backroom is the only system that connects chemical tracking to scheduling,
              profitability analytics, and operational intelligence — inside one unified platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
