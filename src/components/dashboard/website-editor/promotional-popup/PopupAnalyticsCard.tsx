import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, MousePointerClick, X, Gift, DollarSign, BarChart3 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  usePromotionalPopupFunnel,
  MIN_IMPRESSIONS_FOR_RATES,
  type PromotionalPopupTrendPoint,
} from '@/hooks/usePromotionalPopupFunnel';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePromoLibrary } from '@/hooks/usePromoLibrary';
import type { SavedPromoScheduleEntry } from '@/hooks/usePromotionalPopup';

type TrendKey = 'impressions' | 'ctaClicks' | 'dismissals' | 'redemptions' | 'revenue';

function formatTrackingFootnote(
  firstImpressionAt: string | null,
  firstResponseAt: string | null,
): string {
  if (!firstImpressionAt) {
    return 'Impression tracking is armed but has not yet recorded a popup render. The funnel will populate once the popup is shown to a visitor.';
  }
  const since = new Date(firstImpressionAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (firstResponseAt && new Date(firstResponseAt) < new Date(firstImpressionAt)) {
    return `Funnel rates reflect activity since ${since}, when impression tracking went live. Earlier CTA clicks exist in the response log but cannot be matched to an impression — this is expected, not a data bug.`;
  }
  return `Since ${since}, when impression tracking went live for this organization.`;
}

function Sparkline({
  points,
  highlighted,
}: {
  points: number[];
  highlighted: boolean;
}) {
  const max = Math.max(...points, 1);
  const total = points.reduce((s, p) => s + p, 0);
  if (total === 0) {
    // Honest empty: flat baseline so operators see the chart shape, not a
    // missing element.
    return (
      <svg viewBox="0 0 56 14" className="w-full h-3.5 mt-1" aria-hidden="true">
        <line
          x1="0"
          y1="13"
          x2="56"
          y2="13"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
    );
  }
  const w = 56;
  const h = 14;
  const stepX = w / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - (p / max) * (h - 1);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-3.5 mt-1" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={highlighted ? 1.6 : 1.1}
        strokeOpacity={highlighted ? 1 : 0.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TrendChartProps {
  data: PromotionalPopupTrendPoint[];
  highlightedKey: TrendKey | null;
  onHoverKey: (key: TrendKey | null) => void;
}

function TrendChart({ data, highlightedKey, onHoverKey }: TrendChartProps) {
  const total = data.reduce(
    (sum, d) => sum + d.impressions + d.ctaClicks + d.redemptions,
    0,
  );
  if (total === 0) return null;

  const dim = (key: TrendKey) =>
    highlightedKey && highlightedKey !== key ? 0.25 : 1;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={tokens.kpi.label}>14-Day Trend</span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
            Impressions
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            CTA clicks
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-foreground" />
            Redemptions
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          onMouseMove={(state) => {
            // Recharts forwards `tooltipPayload[0].dataKey` on hover; map back
            // to our shared TrendKey so the tile lights up in sync.
            const key = (state?.activePayload?.[0]?.dataKey ?? null) as TrendKey | null;
            if (key && ['impressions', 'ctaClicks', 'redemptions'].includes(key)) {
              onHoverKey(key);
            }
          }}
          onMouseLeave={() => onHoverKey(null)}
        >
          <defs>
            <linearGradient id="popupImpressionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="popupClicksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="popupRedemptionsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value: string) => value.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Area
            type="monotone"
            dataKey="impressions"
            stroke="hsl(var(--primary))"
            strokeOpacity={0.7 * dim('impressions')}
            fillOpacity={dim('impressions')}
            strokeWidth={1.5}
            fill="url(#popupImpressionsFill)"
            name="Impressions"
          />
          <Area
            type="monotone"
            dataKey="ctaClicks"
            stroke="hsl(var(--primary))"
            strokeOpacity={dim('ctaClicks')}
            fillOpacity={dim('ctaClicks')}
            strokeWidth={1.5}
            fill="url(#popupClicksFill)"
            name="CTA clicks"
          />
          <Area
            type="monotone"
            dataKey="redemptions"
            stroke="hsl(var(--foreground))"
            strokeOpacity={dim('redemptions')}
            fillOpacity={dim('redemptions')}
            strokeWidth={1.5}
            fill="url(#popupRedemptionsFill)"
            name="Redemptions"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PopupAnalyticsCardProps {
  offerCode: string | null | undefined;
  /** Defaults to 30. */
  windowDays?: number;
  /** When omitted, uses the org from `useSettingsOrgId`. */
  organizationId?: string;
  /** Optional eyebrow above the title (e.g. for the editor mount). */
  description?: string;
  /** When provided, enables a per-rotation breakdown selector. The funnel
   *  underneath is the SAME `offerCode` (the wrapper's offer code is the
   *  attribution key — see `applyScheduledSnapshot`); selecting a rotation
   *  narrows the temporal window to that rotation's [startsAt, endsAt]. */
  schedule?: SavedPromoScheduleEntry[];
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

interface FunnelStatProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  rate?: string | null;
  rateLabel?: string;
  /** Trend points for the sparkline fallback (always rendered when chart is hidden). */
  sparklinePoints: number[];
  /** Whether the chart is hovering this metric (cross-highlight). */
  highlighted: boolean;
  /** Whether the area chart is currently shown (true → suppress sparkline noise). */
  chartVisible: boolean;
  trendKey: TrendKey;
  onHover: (key: TrendKey | null) => void;
}

function FunnelStat({
  label,
  value,
  icon: Icon,
  rate,
  rateLabel,
  sparklinePoints,
  highlighted,
  chartVisible,
  trendKey,
  onHover,
}: FunnelStatProps) {
  return (
    <div
      onMouseEnter={() => onHover(trendKey)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'flex flex-col gap-1.5 px-4 py-3 rounded-lg border bg-muted/30 transition-colors',
        highlighted
          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
          : 'border-border/60',
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className={tokens.kpi.label}>{label}</span>
      </div>
      <div className={tokens.kpi.value}>{value}</div>
      {rate !== undefined ? (
        <div className="text-xs text-muted-foreground">
          {rate ?? '—'}
          {rateLabel ? <span className="ml-1">{rateLabel}</span> : null}
        </div>
      ) : null}
      {!chartVisible ? (
        <Sparkline points={sparklinePoints} highlighted={highlighted} />
      ) : null}
    </div>
  );
}

/**
 * Popup conversion funnel card. Joins impressions → CTA clicks → redemptions
 * → attributed revenue for a single promotional popup offer code.
 *
 * Honest empty state: when there is no offer code or no impressions yet, the
 * card returns null (silence is valid output — see visibility-contracts canon).
 *
 * Materiality threshold: rate metrics (CTR, redemption rate) only render once
 * impressions ≥ `MIN_IMPRESSIONS_FOR_RATES` so we never report a 100% CTR
 * built off three impressions.
 */
export function PopupAnalyticsCard({
  offerCode,
  windowDays = 30,
  organizationId,
  description,
}: PopupAnalyticsCardProps) {
  const code = (offerCode ?? '').trim();
  const { data, isLoading } = usePromotionalPopupFunnel({
    offerCode: code,
    windowDays,
    explicitOrgId: organizationId,
  });

  // Shared hover index — chart hover lights up tile, tile hover dims chart.
  const [hoveredKey, setHoveredKey] = useState<TrendKey | null>(null);

  // Pre-extract sparkline series so each tile gets a stable reference.
  const series = useMemo(() => {
    const trend = data?.trend ?? [];
    return {
      impressions: trend.map((p) => p.impressions),
      ctaClicks: trend.map((p) => p.ctaClicks),
      dismissals: trend.map((p) => p.dismissals),
      redemptions: trend.map((p) => p.redemptions),
      revenue: trend.map((p) => p.revenue),
    };
  }, [data?.trend]);

  // Silence-is-valid: no code configured → render nothing.
  if (!code) return null;

  const showSkeleton = isLoading || !data;

  // Chart only renders when there's *some* signal; otherwise rely on tile sparklines.
  const chartTotal = (data?.trend ?? []).reduce(
    (sum, d) => sum + d.impressions + d.ctaClicks + d.redemptions,
    0,
  );
  const chartVisible = chartTotal > 0;

  const tooltipNote = data
    ? formatTrackingFootnote(data.firstImpressionAt, data.firstResponseAt)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>
                  Popup Performance
                </CardTitle>
                {tooltipNote ? (
                  <MetricInfoTooltip
                    title="Tracking window"
                    description={tooltipNote}
                  />
                ) : null}
              </div>
              <CardDescription>
                {description ??
                  `Conversion funnel for ${code} · last ${windowDays} days`}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSkeleton ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg border border-border/60 bg-muted/20 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <FunnelStat
                label="Impressions"
                value={data.impressions.toLocaleString()}
                icon={Eye}
                sparklinePoints={series.impressions}
                trendKey="impressions"
                highlighted={hoveredKey === 'impressions'}
                chartVisible={chartVisible}
                onHover={setHoveredKey}
              />
              <FunnelStat
                label="CTA Clicks"
                value={data.ctaClicks.toLocaleString()}
                icon={MousePointerClick}
                rate={formatPercent(data.ctr)}
                rateLabel="click rate"
                sparklinePoints={series.ctaClicks}
                trendKey="ctaClicks"
                highlighted={hoveredKey === 'ctaClicks'}
                chartVisible={chartVisible}
                onHover={setHoveredKey}
              />
              <FunnelStat
                label="Dismissals"
                value={data.dismissals.toLocaleString()}
                icon={X}
                sparklinePoints={series.dismissals}
                trendKey="dismissals"
                highlighted={hoveredKey === 'dismissals'}
                chartVisible={chartVisible}
                onHover={setHoveredKey}
              />
              <FunnelStat
                label="Redemptions"
                value={data.redemptions.toLocaleString()}
                icon={Gift}
                rate={formatPercent(data.redemptionRate)}
                rateLabel="of impressions"
                sparklinePoints={series.redemptions}
                trendKey="redemptions"
                highlighted={hoveredKey === 'redemptions'}
                chartVisible={chartVisible}
                onHover={setHoveredKey}
              />
              <FunnelStat
                label="Revenue"
                value={
                  data.revenueAttributed > 0 ? (
                    <BlurredAmount>{formatCurrency(data.revenueAttributed)}</BlurredAmount>
                  ) : (
                    '—'
                  )
                }
                icon={DollarSign}
                rate={data.bookingRate !== null ? formatPercent(data.bookingRate) : undefined}
                rateLabel={data.bookingRate !== null ? 'CTA → booking' : undefined}
                sparklinePoints={series.revenue}
                trendKey="revenue"
                highlighted={hoveredKey === 'revenue'}
                chartVisible={chartVisible}
                onHover={setHoveredKey}
              />
            </div>

            <TrendChart
              data={data.trend}
              highlightedKey={hoveredKey}
              onHoverKey={setHoveredKey}
            />

            {!data.hasSufficientData ? (
              <p className="text-xs text-muted-foreground">
                Click-through and redemption rates appear after{' '}
                {MIN_IMPRESSIONS_FOR_RATES.toLocaleString()} impressions
                {data.impressions > 0
                  ? ` (${data.impressions.toLocaleString()} so far).`
                  : '.'}{' '}
                Until then, raw counts only.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
