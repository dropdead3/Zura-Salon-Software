import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, MousePointerClick, X, Gift, DollarSign, BarChart3 } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  usePromotionalPopupFunnel,
  MIN_IMPRESSIONS_FOR_RATES,
} from '@/hooks/usePromotionalPopupFunnel';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface PopupAnalyticsCardProps {
  offerCode: string | null | undefined;
  /** Defaults to 30. */
  windowDays?: number;
  /** When omitted, uses the org from `useSettingsOrgId`. */
  organizationId?: string;
  /** Optional eyebrow above the title (e.g. for the editor mount). */
  description?: string;
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
}

function FunnelStat({ label, value, icon: Icon, rate, rateLabel }: FunnelStatProps) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 rounded-lg border border-border/60 bg-muted/30">
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

  // Silence-is-valid: no code configured → render nothing.
  if (!code) return null;

  const showSkeleton = isLoading || !data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className={tokens.card.title}>
                Popup Performance
              </CardTitle>
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
              />
              <FunnelStat
                label="CTA Clicks"
                value={data.ctaClicks.toLocaleString()}
                icon={MousePointerClick}
                rate={formatPercent(data.ctr)}
                rateLabel="click rate"
              />
              <FunnelStat
                label="Dismissals"
                value={data.dismissals.toLocaleString()}
                icon={X}
              />
              <FunnelStat
                label="Redemptions"
                value={data.redemptions.toLocaleString()}
                icon={Gift}
                rate={formatPercent(data.redemptionRate)}
                rateLabel="of impressions"
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
              />
            </div>

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
