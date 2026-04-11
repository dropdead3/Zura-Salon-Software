import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { useSEOIndustryIntelligence } from '@/hooks/useSEOIndustryIntelligence';
import {
  DIRECTION_CONFIG,
  CONFIDENCE_CONFIG,
  SIGNAL_TYPE_LABELS,
  BENCHMARK_METRIC_LABELS,
  type TrendDirection,
  type TrendConfidence,
  type BenchmarkMetricKey,
} from '@/config/seo-engine/seo-industry-config';
import { Globe, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function SEOIndustryFeed({ organizationId }: Props) {
  const { whatsWorking, marketAlerts, benchmarks, isLoading } = useSEOIndustryIntelligence(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Industry Intelligence</CardTitle>
              <CardDescription>Network-wide trends and benchmarking</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasSignals = whatsWorking.length > 0 || marketAlerts.length > 0 || benchmarks.length > 0;

  if (!hasSignals) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Industry Intelligence</CardTitle>
              <CardDescription>Network-wide trends and benchmarking</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={tokens.empty.container}>
            <Globe className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No signals yet</h3>
            <p className={tokens.empty.description}>
              Industry intelligence signals are computed weekly as network data grows.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Industry Intelligence</CardTitle>
            <CardDescription>Network-wide trends and benchmarking</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* What's Working Now */}
        {whatsWorking.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-display tracking-wide uppercase">What&apos;s Working Now</span>
            </div>
            <div className="space-y-2">
              {whatsWorking.map((trend, idx) => {
                const dirConf = DIRECTION_CONFIG[trend.direction as TrendDirection];
                const confConf = CONFIDENCE_CONFIG[trend.confidence as TrendConfidence];
                return (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <span className={`text-sm mt-0.5 ${dirConf.color}`}>{dirConf.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans">
                        {(trend as any).insightText || (
                          <>
                            <span className="font-medium">{trend.category}</span>
                            {' '}{trend.direction === 'rising' ? '+' : ''}{trend.deltaPct}% {trend.metricKey.replace(/_/g, ' ')}
                            {trend.city && <span className="text-muted-foreground"> in {trend.city}</span>}
                          </>
                        )}
                      </p>
                      <span className={`text-xs ${confConf.color}`}>{confConf.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {SIGNAL_TYPE_LABELS[trend.signalType]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Your Position (benchmarks) */}
        {benchmarks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-display tracking-wide uppercase">Network Benchmarks</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {benchmarks.slice(0, 6).map((b, idx) => {
                const label = BENCHMARK_METRIC_LABELS[b.metricKey as BenchmarkMetricKey] || b.metricKey;
                return (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground font-sans">{label} — {b.category}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-display tracking-wide">{b.p50.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">median</span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>P25: {b.p25.toFixed(1)}</span>
                      <span>P75: {b.p75.toFixed(1)}</span>
                      <span>P90: {b.p90.toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{b.cohortSize} salons</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Market Alerts */}
        {marketAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-display tracking-wide uppercase">Market Alerts</span>
            </div>
            {marketAlerts.slice(0, 3).map((alert, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="text-sm font-sans">
                  {(alert as any).insightText || (
                    <>
                      {alert.category} demand rising +{alert.deltaPct}%
                      {alert.city && <> in {alert.city}</>}
                      {' — '}competition hasn&apos;t adjusted yet
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
