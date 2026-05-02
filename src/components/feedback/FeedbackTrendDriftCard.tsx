import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';
import { useFeedbackTrendDrift } from '@/hooks/useFeedbackTrendDrift';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function DriftPill({ label, delta, unit }: { label: string; delta: number | null; unit: string }) {
  if (delta === null) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <div className={cn(tokens.label, 'text-muted-foreground')}>{label}</div>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Minus className="h-3.5 w-3.5" /> Not enough data
        </div>
      </div>
    );
  }

  const positive = delta > 0.05;
  const negative = delta < -0.05;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const tone = positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : negative
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-muted-foreground';

  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className={cn(tokens.label, 'text-muted-foreground')}>{label}</div>
      <div className={cn('mt-1 flex items-center gap-1.5 text-sm font-medium', tone)}>
        <Icon className="h-3.5 w-3.5" />
        {delta > 0 ? '+' : ''}{delta.toFixed(2)} {unit}
      </div>
    </div>
  );
}

export function FeedbackTrendDriftCard() {
  const { data, isLoading } = useFeedbackTrendDrift();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={tokens.card.iconBox}>
              <LineChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Trend Drift</CardTitle>
              <CardDescription>30 / 90 / 365-day satisfaction movement</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : !data || data.insufficientData ? (
          <div className={tokens.empty.container}>
            <LineChart className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>Not enough signal yet</h3>
            <p className={tokens.empty.description}>
              At least 5 responses in a window are required before drift is shown.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.windows.map((w) => (
                <div key={w.window} className="rounded-lg border border-border/60 bg-card px-3 py-3">
                  <div className={cn(tokens.label, 'text-muted-foreground')}>Last {w.window}d</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-medium">
                      {w.avgRating !== null ? w.avgRating.toFixed(2) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">avg rating</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    NPS {w.avgNps !== null ? w.avgNps.toFixed(1) : '—'} · {w.count} responses
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DriftPill label="Rating · 30d vs 90d" delta={data.ratingDrift30v90} unit="pts" />
              <DriftPill label="NPS · 30d vs 90d" delta={data.npsDrift30v90} unit="pts" />
              <DriftPill label="Rating · 90d vs 365d" delta={data.ratingDrift90v365} unit="pts" />
              <DriftPill label="NPS · 90d vs 365d" delta={data.npsDrift90v365} unit="pts" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
