import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PREFERRED_SUPPLIER_LABEL, MARGIN_THRESHOLDS } from '@/config/vertical-integration/integration-config';

interface BrandMarginComparisonProps {
  comparisons: {
    serviceName: string;
    preferredMarginPct: number;
    alternativeMarginPct: number;
    deltaPp: number;
  }[];
}

export function BrandMarginComparison({ comparisons }: BrandMarginComparisonProps) {
  if (comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Brand Margin Analysis</CardTitle>
          <CardDescription>No performance data available yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Brand Margin Analysis</CardTitle>
              <CardDescription>
                {PREFERRED_SUPPLIER_LABEL} vs alternative brands by service
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {comparisons.map((c) => {
            const DeltaIcon =
              c.deltaPp > MARGIN_THRESHOLDS.minDeltaToRecommend
                ? TrendingUp
                : c.deltaPp < -MARGIN_THRESHOLDS.minDeltaToRecommend
                  ? TrendingDown
                  : Minus;

            return (
              <div
                key={c.serviceName}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
              >
                <div>
                  <p className={cn(tokens.body.base, 'font-medium')}>{c.serviceName}</p>
                  <p className={tokens.label.muted}>
                    {PREFERRED_SUPPLIER_LABEL}: {c.preferredMarginPct}% · Alt:{' '}
                    {c.alternativeMarginPct}%
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <DeltaIcon
                    className={cn(
                      'w-4 h-4',
                      c.deltaPp > 0
                        ? 'text-emerald-500'
                        : c.deltaPp < 0
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'font-display text-sm tracking-wide',
                      c.deltaPp > 0
                        ? 'text-emerald-500'
                        : c.deltaPp < 0
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    )}
                  >
                    {c.deltaPp > 0 ? '+' : ''}
                    {c.deltaPp}PP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
