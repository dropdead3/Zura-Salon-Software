import { useEffect, useMemo, useState } from 'react';
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
  ReferenceLine,
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
import type { SavedPromoScheduleEntry, PromoGoal } from '@/hooks/usePromotionalPopup';
import { forecastDaysToCap } from '@/lib/promo-goal-velocity';
import { usePromotionalPopupRedemptions } from '@/hooks/usePromotionalPopupRedemptions';

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
  /** Optional cap-hit ETA marker — vertical reference line projected forward
   *  from today's date by N days. When set, the chart's X-axis extends past
   *  the historical 14-day window so the marker has somewhere to render. */
  capHitEta?: { daysFromToday: number; label: string } | null;
}

function TrendChart({ data, highlightedKey, onHoverKey, capHitEta }: TrendChartProps) {
  const total = data.reduce(
    (sum, d) => sum + d.impressions + d.ctaClicks + d.redemptions,
    0,
  );
  if (total === 0) return null;

  const dim = (key: TrendKey) =>
    highlightedKey && highlightedKey !== key ? 0.25 : 1;

  // Extend the X-axis with empty future buckets when an ETA marker exists,
  // so the vertical line lands inside the chart rather than flush against
  // the right edge. Capped at 21 days — beyond that, forecast confidence
  // drops below useful and the chart compresses too much.
  const FORWARD_BUCKET_CAP = 21;
  const forwardBuckets = capHitEta
    ? Math.min(FORWARD_BUCKET_CAP, Math.max(1, capHitEta.daysFromToday + 1))
    : 0;
  const chartData = (() => {
    if (forwardBuckets === 0) return data;
    const last = data[data.length - 1];
    const lastDate = last ? new Date(last.date) : new Date();
    const future: PromotionalPopupTrendPoint[] = [];
    for (let i = 1; i <= forwardBuckets; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      future.push({
        date: d.toISOString().slice(0, 10),
        impressions: 0,
        ctaClicks: 0,
        dismissals: 0,
        redemptions: 0,
        revenue: 0,
      });
    }
    return [...data, ...future];
  })();

  // X-axis date string for the ETA marker (matches the `date` data key).
  const etaDate = capHitEta
    ? (() => {
        const last = data[data.length - 1];
        const base = last ? new Date(last.date) : new Date();
        base.setDate(base.getDate() + capHitEta.daysFromToday);
        return base.toISOString().slice(0, 10);
      })()
    : null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={tokens.kpi.label}>
          14-Day Trend{capHitEta ? ' · projection' : ''}
        </span>
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
          {capHitEta ? (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-0.5 bg-amber-500" />
              Cap-hit ETA
            </span>
          ) : null}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={chartData}
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
          {etaDate && capHitEta ? (
            <ReferenceLine
              x={etaDate}
              stroke="hsl(38 92% 50%)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{
                value: capHitEta.label,
                position: 'top',
                fill: 'hsl(38 92% 50%)',
                fontSize: 10,
                fontFamily: 'inherit',
              }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Side-by-side comparison of two rotation funnels under the same offer code.
 * Renders an impressions overlay chart (the cleanest single-axis comparison
 * — CTR/redemption rates would need their own scale) plus a 4-row delta
 * table. Sample-size warnings carry the "honest silence" doctrine: when
 * either side is below the materiality threshold, the comparison labels the
 * gap as "not yet comparable" rather than rendering misleading deltas.
 */
function ComparePanel({
  aLabel,
  bLabel,
  aData,
  bData,
}: {
  aLabel: string;
  bLabel: string;
  aData: import('@/hooks/usePromotionalPopupFunnel').PromotionalPopupFunnel;
  bData: import('@/hooks/usePromotionalPopupFunnel').PromotionalPopupFunnel;
}) {
  // Merge trend points by date for an overlay chart. Both funnels return
  // 14 points by date string so the merge is a straight zip on `date`.
  const overlay = useMemo(() => {
    const byDate = new Map<string, { date: string; a: number; b: number }>();
    for (const p of aData.trend) byDate.set(p.date, { date: p.date, a: p.impressions, b: 0 });
    for (const p of bData.trend) {
      const ex = byDate.get(p.date);
      if (ex) ex.b = p.impressions;
      else byDate.set(p.date, { date: p.date, a: 0, b: p.impressions });
    }
    return Array.from(byDate.values()).sort((x, y) => x.date.localeCompare(y.date));
  }, [aData.trend, bData.trend]);

  const rows: Array<{ metric: string; a: string; b: string; comparable: boolean }> = [
    {
      metric: 'Impressions',
      a: aData.impressions.toLocaleString(),
      b: bData.impressions.toLocaleString(),
      comparable: true,
    },
    {
      metric: 'CTA Clicks',
      a: aData.ctaClicks.toLocaleString(),
      b: bData.ctaClicks.toLocaleString(),
      comparable: true,
    },
    {
      metric: 'Click rate',
      a: aData.ctr === null ? 'not yet comparable' : `${(aData.ctr * 100).toFixed(1)}%`,
      b: bData.ctr === null ? 'not yet comparable' : `${(bData.ctr * 100).toFixed(1)}%`,
      comparable: aData.ctr !== null && bData.ctr !== null,
    },
    {
      metric: 'Redemptions',
      a: aData.redemptions.toLocaleString(),
      b: bData.redemptions.toLocaleString(),
      comparable: true,
    },
  ];

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className={tokens.kpi.label}>Side-by-side</span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            {aLabel}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-foreground" />
            {bLabel}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={overlay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: string) => v.slice(5)}
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
          />
          <Area
            type="monotone"
            dataKey="a"
            name={aLabel}
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="b"
            name={bLabel}
            stroke="hsl(var(--foreground))"
            fill="hsl(var(--foreground))"
            fillOpacity={0.1}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-muted-foreground font-display tracking-wide uppercase text-[10px]">
          Metric
        </div>
        <div className="text-foreground font-display tracking-wide uppercase text-[10px]">
          {aLabel}
        </div>
        <div className="text-foreground font-display tracking-wide uppercase text-[10px]">
          {bLabel}
        </div>
        {rows.map((r) => (
          <div key={r.metric} className="contents">
            <div className="text-muted-foreground">{r.metric}</div>
            <div className={r.comparable ? 'text-foreground' : 'text-muted-foreground italic'}>
              {r.a}
            </div>
            <div className={r.comparable ? 'text-foreground' : 'text-muted-foreground italic'}>
              {r.b}
            </div>
          </div>
        ))}
      </div>
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
  /** Externally-controlled focused rotation (from calendar-strip click in the
   *  schedule card). When set, narrows the funnel to that rotation's window
   *  and lights up the selector tile. Two-way: clicking a rotation pill in
   *  this card also calls `onFocusRotation`. */
  focusedRotationId?: string | null;
  onFocusRotation?: (id: string | null) => void;
  /** Optional active goal — when present AND a cap is set AND velocity exists,
   *  the trend chart overlays a vertical "Cap-hit ETA" reference line. Closes
   *  the loop visually so operators see suppression coming, not just after. */
  goal?: PromoGoal | null;
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
        'flex flex-col gap-1 px-3 py-2.5 rounded-lg border bg-muted/30 transition-colors min-w-0',
        highlighted
          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
          : 'border-border/60',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className={cn(tokens.kpi.label, 'truncate')}>{label}</span>
      </div>
      <div className={cn(tokens.kpi.value, 'truncate')}>{value}</div>
      {rate !== undefined ? (
        <div className="text-[11px] text-muted-foreground truncate">
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
  schedule,
  focusedRotationId = null,
  onFocusRotation,
  goal = null,
}: PopupAnalyticsCardProps) {
  const code = (offerCode ?? '').trim();

  const { data: library } = usePromoLibrary();
  const savedById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of library?.saved ?? []) m.set(s.id, s.name);
    return m;
  }, [library?.saved]);

  // Valid, sortable rotation list — gates the selector + compare UI.
  const rotationOptions = useMemo(() => {
    const list = (schedule ?? []).filter(
      (e) =>
        Number.isFinite(Date.parse(e.startsAt)) &&
        Number.isFinite(Date.parse(e.endsAt)) &&
        Date.parse(e.endsAt) > Date.parse(e.startsAt),
    );
    return [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [schedule]);
  const showRotationSelector = rotationOptions.length >= 2;

  // Primary rotation comes from focusedRotationId when controlled, else local.
  const [localRotationId, setLocalRotationId] = useState<string>('all');
  const rotationId = focusedRotationId ?? localRotationId;
  const setRotationId = (id: string) => {
    setLocalRotationId(id);
    onFocusRotation?.(id === 'all' ? null : id);
  };

  // Compare mode — operator picks a second rotation to overlay.
  const [compareRotationId, setCompareRotationId] = useState<string | null>(null);
  // Reset comparison if either rotation disappears or primary drops to "all".
  useEffect(() => {
    if (compareRotationId && !rotationOptions.find((r) => r.id === compareRotationId)) {
      setCompareRotationId(null);
    }
    if (rotationId === 'all') {
      setCompareRotationId(null);
    }
  }, [compareRotationId, rotationId, rotationOptions]);

  const activeRotation =
    rotationId !== 'all'
      ? rotationOptions.find((e) => e.id === rotationId) ?? null
      : null;
  const compareRotation = compareRotationId
    ? rotationOptions.find((e) => e.id === compareRotationId) ?? null
    : null;

  const { data, isLoading } = usePromotionalPopupFunnel({
    offerCode: code,
    windowDays,
    explicitOrgId: organizationId,
    rotationWindow: activeRotation
      ? {
          id: activeRotation.id,
          startsAt: activeRotation.startsAt,
          endsAt: activeRotation.endsAt,
        }
      : null,
  });

  // Compare-mode second funnel — only fires when a second rotation is picked.
  const { data: compareData } = usePromotionalPopupFunnel({
    offerCode: code,
    windowDays,
    explicitOrgId: organizationId,
    rotationWindow: compareRotation
      ? {
          id: compareRotation.id,
          startsAt: compareRotation.startsAt,
          endsAt: compareRotation.endsAt,
        }
      : null,
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

  // ── Cap-hit ETA marker ──
  // Reuses the redemption hook + `forecastDaysToCap` so the projection here
  // is identical to the one in `PromoGoalCard`. Silent when no goal/cap, no
  // velocity, or already past the cap (other surfaces own those states).
  // Only fires for the unfiltered "all rotations" view — projecting onto a
  // narrow rotation window would be misleading.
  const { data: redemptionStats } = usePromotionalPopupRedemptions(code);
  const capHitEta = useMemo(() => {
    if (!goal?.capRedemptions) return null;
    if (focusedRotationId) return null;
    const forecast = forecastDaysToCap({
      cap: goal.capRedemptions,
      redemptions: redemptionStats?.count ?? 0,
      series: redemptionStats?.series ?? [],
    });
    if (forecast.kind !== 'on-pace') return null;
    return {
      daysFromToday: forecast.daysUntilCap,
      label: `Cap in ~${forecast.daysUntilCap}d`,
    };
  }, [goal?.capRedemptions, focusedRotationId, redemptionStats]);

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
                  (activeRotation
                    ? `${savedById.get(activeRotation.savedPromoId) ?? 'Rotation'} window · ${code}`
                    : `Conversion funnel for ${code} · last ${windowDays} days`)}
              </CardDescription>
            </div>
          </div>
          {showRotationSelector ? (
            <div className="shrink-0 flex items-center gap-2">
              <Select value={rotationId} onValueChange={setRotationId}>
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue placeholder="All rotations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All rotations · last {windowDays}d
                  </SelectItem>
                  {rotationOptions.map((e) => {
                    const name = savedById.get(e.savedPromoId) ?? '(deleted)';
                    const start = new Date(e.startsAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });
                    const end = new Date(e.endsAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        {name} · {start}–{end}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {activeRotation ? (
                <Select
                  value={compareRotationId ?? 'none'}
                  onValueChange={(v) => setCompareRotationId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="h-9 w-[180px] text-xs">
                    <SelectValue placeholder="Compare…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Compare with…</SelectItem>
                    {rotationOptions
                      .filter((e) => e.id !== activeRotation.id)
                      .map((e) => {
                        const name = savedById.get(e.savedPromoId) ?? '(deleted)';
                        return (
                          <SelectItem key={e.id} value={e.id}>
                            vs. {name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSkeleton ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg border border-border/60 bg-muted/20 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
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
              capHitEta={capHitEta}
            />

            {compareRotation && compareData && activeRotation ? (
              <ComparePanel
                aLabel={savedById.get(activeRotation.savedPromoId) ?? 'Rotation A'}
                bLabel={savedById.get(compareRotation.savedPromoId) ?? 'Rotation B'}
                aData={data}
                bData={compareData}
              />
            ) : null}
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
