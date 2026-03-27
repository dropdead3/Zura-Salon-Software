/**
 * ColorBarSavingsSection — "Your Savings" dashboard showing ROI
 * with transparent formula explanations, period toggle, subscription
 * comparison, smart empty states, and cumulative savings banner.
 */

import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useColorBarSavings, type SavingsCategory } from '@/hooks/color-bar/useColorBarSavings';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  TrendingDown,
  Ghost,
  Receipt,
  DollarSign,
  ChevronDown,
  Info,
  Coins,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

const CATEGORY_META: Record<string, { icon: typeof TrendingDown; color: string; bgColor: string }> = {
  waste: { icon: TrendingDown, color: 'text-primary', bgColor: 'bg-primary/15' },
  ghost: { icon: Ghost, color: 'text-amber-500', bgColor: 'bg-amber-500/15' },
  supply: { icon: Receipt, color: 'text-emerald-500', bgColor: 'bg-emerald-500/15' },
};

function CategoryCard({
  cat,
  formatCurrency,
}: {
  cat: SavingsCategory;
  formatCurrency: (n: number) => string;
}) {
  const meta = CATEGORY_META[cat.key] ?? CATEGORY_META.waste;
  const Icon = meta.icon;
  const isZero = cat.amount === 0;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', meta.bgColor)}>
            <Icon className={cn('w-5 h-5', meta.color)} />
          </div>
          <div className="min-w-0">
            <p className={tokens.kpi.label}>{cat.label}</p>
            {isZero ? (
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-sans leading-snug">
                  {cat.zeroMessage}
                </p>
              </div>
            ) : (
              <p className={cn(tokens.stat.large, meta.color)}>
                {formatCurrency(cat.amount)}
              </p>
            )}
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans group w-full">
            <Info className="w-3.5 h-3.5" />
            <span>How is this calculated?</span>
            <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              {cat.explanation}
            </p>
            <div className="rounded-md bg-muted/50 border border-border/40 px-3 py-2">
              <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wider mb-0.5">
                Formula
              </p>
              <p className="text-xs font-sans text-foreground">{cat.formula}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function ColorBarSavingsSection() {
  const [selectedDays, setSelectedDays] = useState(30);
  const { data, isLoading, allTime, allTimeLoading } = useColorBarSavings(selectedDays);
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return <DashboardLoader size="md" className="h-[40vh]" />;
  }

  // Not enough data state
  if (!data?.hasEnoughData) {
    const count = data?.snapshotCount ?? 0;
    const progress = Math.round((count / 7) * 100);

    return (
      <div className="space-y-6">
        <div>
          <h2 className={tokens.heading.page}>Your Savings</h2>
          <p className={cn(tokens.body.muted, 'mt-1')}>
            See exactly how Zura Backroom saves you money.
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className={cn(tokens.card.iconBox, 'mx-auto')}>
              <Coins className={tokens.card.icon} />
            </div>
            <h3 className={tokens.heading.card}>Calculating Your Savings…</h3>
            <p className={tokens.body.muted}>
              We need at least 7 days of usage data to calculate your savings.
              {count > 0 && ` You have ${count} day${count !== 1 ? 's' : ''} so far.`}
            </p>
            <div className="max-w-xs mx-auto space-y-1.5">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground font-sans">{count} of 7 days</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const savingsExceedsCost = data.subscriptionCost > 0 && data.totalSavings >= data.subscriptionCost;
  const roiPct =
    data.subscriptionCost > 0
      ? Math.round((data.totalSavings / data.subscriptionCost) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header with Period Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className={tokens.heading.page}>Your Savings</h2>
          <p className={cn(tokens.body.muted, 'mt-1')}>
            Based on {data.snapshotCount} days of your real usage data.
          </p>
        </div>
        <div className="flex gap-1 bg-muted rounded-full p-1">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              variant={selectedDays === p.days ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full px-4 text-xs font-sans',
                selectedDays !== p.days && 'text-muted-foreground',
              )}
              onClick={() => setSelectedDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Cumulative Savings Banner */}
      {allTime && !allTimeLoading && allTime.totalSavings > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-sans text-foreground">
              <span className="font-medium">Total savings since you joined:</span>{' '}
              <span className="text-primary font-display tracking-wide">
                {formatCurrency(allTime.totalSavings)}
              </span>
              <span className="text-muted-foreground">
                {' '}across {allTime.daysCovered} days of data
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hero Card */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1 space-y-1">
              <p className={tokens.kpi.label}>Estimated Savings</p>
              <p className={cn(tokens.stat.xlarge, 'text-primary')}>
                <AnimatedNumber
                  value={data.totalSavings}
                  prefix={formatCurrency(0).replace(/[\d.,]/g, '')}
                  decimals={2}
                />
              </p>
              <p className="text-xs text-muted-foreground font-sans mt-2">
                Last {selectedDays} days • Across all savings categories
              </p>
            </div>

            {/* Cost per service insight */}
            <div className="sm:text-right space-y-1">
              <p className={tokens.kpi.label}>Avg Cost per Service</p>
              <p className={cn(tokens.stat.large, 'text-foreground')}>
                {formatCurrency(data.avgCostPerService)}
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                Actual waste rate: {data.actualWastePct}%
              </p>
            </div>
          </div>

          {/* Savings vs Subscription Cost Bar */}
          {data.subscriptionCost > 0 && (
            <div className="mt-6 pt-5 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-sans text-foreground">
                    Savings vs Subscription
                  </span>
                </div>
                <span
                  className={cn(
                    'text-sm font-display tracking-wide',
                    savingsExceedsCost ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {roiPct}% return
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans text-muted-foreground">
                  <span>Savings: {formatCurrency(data.totalSavings)}</span>
                  <span>Cost: {formatCurrency(data.subscriptionCost)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (data.totalSavings /
                          Math.max(data.totalSavings, data.subscriptionCost)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <p className={cn('text-xs font-sans', savingsExceedsCost ? 'text-primary' : 'text-muted-foreground')}>
                {savingsExceedsCost
                  ? `Net benefit: ${formatCurrency(data.netBenefit)}/mo — your backroom pays for itself.`
                  : `Net cost: ${formatCurrency(Math.abs(data.netBenefit))}/mo — savings are building as you track more data.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        {data.categories.map((cat) => (
          <CategoryCard key={cat.key} cat={cat} formatCurrency={formatCurrency} />
        ))}
      </div>

      {/* How We Calculate Footer */}
      <Card>
        <CardContent className="p-5">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
              <div className={cn(tokens.card.iconBox, 'w-8 h-8')}>
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <span className={cn(tokens.label.default, 'text-foreground flex-1')}>
                How We Calculate Your Savings
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              <div className="space-y-2 text-sm text-muted-foreground font-sans leading-relaxed">
                <p>
                  <span className="font-medium text-foreground">Industry Baseline:</span>{' '}
                  We compare your waste rate against an industry average of 12% product waste. This
                  figure comes from published salon operations research and represents the typical
                  amount of color and chemical product discarded without being billed.
                </p>
                <p>
                  <span className="font-medium text-foreground">Your Data:</span>{' '}
                  All calculations use your actual backroom data — mix sessions, reweigh
                  measurements, inventory movements, and checkout charges. We average across the
                  selected period for stability.
                </p>
                <p>
                  <span className="font-medium text-foreground">Conservative Estimates:</span>{' '}
                  If your waste rate is already at or below the baseline, waste reduction savings
                  show as $0. We only count verified savings, never projections.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
