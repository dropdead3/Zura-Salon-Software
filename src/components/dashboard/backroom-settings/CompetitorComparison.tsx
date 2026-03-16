import { cn } from '@/lib/utils';
import { CheckCircle2, MinusCircle, XCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';

/* ─── Status Indicators ─── */
type Support = 'full' | 'partial' | 'none';

function StatusIcon({ status }: { status: Support }) {
  if (status === 'full') return <CheckCircle2 className="w-4 h-4 text-success shrink-0" />;
  if (status === 'partial') return <MinusCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
  return <XCircle className="w-4 h-4 text-destructive/70 shrink-0" />;
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

/* ─── Feature Tooltips ─── */
const featureTooltips: Record<string, string> = {
  'Ghost loss detection': 'Identifies product that disappears between inventory counts — shrinkage that isn\'t tied to any logged service or known waste.',
  'Service blueprints': 'Predefined step-by-step workflows for each service type (mix, prep, process, rinse) so every stylist follows the same process.',
  'Assistant prep workflows': 'Structured task queues that let assistants see what needs to be mixed and prepped before each appointment.',
  'Predictive reorder alerts': 'Automatically flags products approaching reorder levels based on usage velocity, so you never run out mid-week.',
  'Demand forecasting': 'Projects future product needs based on upcoming appointments and historical consumption patterns.',
  'Cost-per-service profitability': 'Calculates the true product cost for each service performed, revealing which services actually make money.',
  'Supply fee recovery': 'Automatically calculates a per-service supply charge you can pass to clients, recovering product costs transparently.',
  'Full platform integration': 'Backroom data flows into scheduling, payroll, and analytics — no exports or third-party syncing required.',
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

const pricingComparison: Record<'zura' | 'vish' | 'salonScale', { pricing: string; note: string }> = {
  zura: { pricing: '$20/location + $0.50/appt', note: 'Per appointment with color service' },
  vish: { pricing: '£30–240/mo', note: 'Per stylist + £165/scale' },
  salonScale: { pricing: '$49–199/mo', note: 'Per stylist, scale extra' },
};

/* ─── Column headers ─── */
const columns = [
  { key: 'zura' as const, label: 'Zura Backroom' },
  { key: 'vish' as const, label: 'Vish' },
  { key: 'salonScale' as const, label: 'SalonScale' },
];

export function CompetitorComparison() {
  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-8 md:space-y-10">
      <h2 className="font-display text-2xl md:text-3xl font-medium tracking-wide text-center text-foreground">
        How Zura Backroom Compares
      </h2>

      <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Scrollable wrapper for mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              {/* Column Headers */}
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left px-6 py-4 w-[40%]">
                    <span className="font-sans text-sm text-muted-foreground">Feature</span>
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className={cn(
                      'text-center px-6 py-4 w-[20%]',
                      col.key === 'zura' && 'bg-primary/[0.03]',
                    )}>
                      <span className={cn(
                        'font-sans text-sm',
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
                  <React.Fragment key={`cat-${catIdx}`}>
                    {/* Category header */}
                    <tr className="bg-muted/20">
                      <td colSpan={4} className="px-6 py-3">
                        <span className="font-display text-[10px] tracking-wider text-muted-foreground">
                          {category.category}
                        </span>
                      </td>
                    </tr>

                    {/* Feature rows */}
                    {category.rows.map((row, rowIdx) => (
                      <tr
                        key={`row-${catIdx}-${rowIdx}`}
                        className="border-b border-border/20 last:border-0 transition-colors duration-150 hover:bg-muted/10"
                      >
                        <td className="px-6 py-4">
                          <span className="font-sans text-sm text-foreground inline-flex items-center gap-1.5">
                            {row.feature}
                            {featureTooltips[row.feature] && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[240px] text-xs font-sans">
                                  {featureTooltips[row.feature]}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </td>
                        {columns.map((col) => (
                          <td key={col.key} className={cn(
                            'text-center px-6 py-4',
                            col.key === 'zura' && 'bg-primary/[0.03]',
                          )}>
                            <div className="flex justify-center">
                              <StatusIcon status={row[col.key]} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Pricing row */}
                <tr className="bg-muted/20">
                      <td colSpan={4} className="px-6 py-3">
                    <span className="font-display text-[10px] tracking-wider text-muted-foreground">
                      Pricing
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border/20 last:border-0">
                  <td className="px-6 py-4">
                    <span className="font-sans text-sm text-foreground">Monthly cost</span>
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className={cn(
                      'text-center px-6 py-4',
                      col.key === 'zura' && 'bg-primary/[0.03]',
                    )}>
                      <div className="space-y-1">
                        <p className={cn(
                          'font-sans text-sm',
                          col.key === 'zura' ? 'text-primary font-medium' : 'text-foreground'
                        )}>
                          {pricingComparison[col.key].pricing}
                        </p>
                        <p className="font-sans text-xs text-muted-foreground">
                          {pricingComparison[col.key].note}
                        </p>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="px-6 py-5 border-t border-border/30">
            <p className="font-sans text-sm text-muted-foreground text-center leading-relaxed max-w-lg mx-auto">
              Zura Backroom is the only system that connects chemical tracking to scheduling,
              profitability analytics, and operational intelligence — inside one unified platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
