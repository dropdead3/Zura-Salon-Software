import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Droplets,
  Award,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useIndividualStaffReport } from '@/hooks/useIndividualStaffReport';
import { useStaffComplianceSummary } from '@/hooks/color-bar/useStaffComplianceSummary';
import { format, subDays } from 'date-fns';
import { EmptyDataBanner } from '@/components/ui/EmptyDataBanner';

interface MeetingPerformanceSummaryProps {
  staffUserId: string;
}

// ── Trend helper ──
function TrendBadge({ current, prior, suffix = '' }: { current: number; prior: number; suffix?: string }) {
  if (prior === 0 && current === 0) return null;
  const pctChange = prior > 0 ? ((current - prior) / prior) * 100 : (current > 0 ? 100 : 0);
  const threshold = 3;
  const isUp = pctChange > threshold;
  const isDown = pctChange < -threshold;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? 'text-emerald-600' : isDown ? 'text-rose-500' : 'text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center gap-0.5', tokens.kpi.change, color)}>
      <Icon className="w-3 h-3" />
      {Math.abs(Math.round(pctChange))}{suffix}
    </span>
  );
}

function VsTeam({ value, teamAvg, unit = '' }: { value: number; teamAvg: number; unit?: string }) {
  if (teamAvg === 0) return null;
  const diff = value - teamAvg;
  const color = diff >= 0 ? 'text-emerald-600' : 'text-rose-500';
  const sign = diff >= 0 ? '+' : '';
  const formatted = unit === '$' ? `${sign}$${Math.abs(Math.round(diff)).toLocaleString()}` : `${sign}${Math.round(diff)}${unit}`;
  return (
    <span className={cn('text-[10px]', color)}>
      vs team: {formatted}
    </span>
  );
}

// ── KPI tile ──
function KpiTile({
  label,
  description,
  children,
  teamAvg,
  teamUnit,
  value,
  trend,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  teamAvg?: number;
  teamUnit?: string;
  value?: number;
  trend?: React.ReactNode;
}) {
  return (
    <div className={cn(tokens.kpi.tile, 'relative')}>
      <MetricInfoTooltip description={description} className={tokens.kpi.infoIcon} />
      <span className={tokens.kpi.label}>{label}</span>
      <div className={tokens.kpi.value}>{children}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {trend}
        {teamAvg !== undefined && value !== undefined && (
          <VsTeam value={value} teamAvg={teamAvg} unit={teamUnit} />
        )}
      </div>
    </div>
  );
}

function ExpStatusBadge({ status }: { status: 'strong' | 'watch' | 'needs-attention' }) {
  const map = {
    strong: { label: 'Strong', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    watch: { label: 'Watch', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    'needs-attention': { label: 'Needs Attention', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  };
  const s = map[status];
  return <Badge variant="outline" className={cn('text-[10px]', s.cls)}>{s.label}</Badge>;
}

export function MeetingPerformanceSummary({ staffUserId }: MeetingPerformanceSummaryProps) {
  const dateTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const dateFrom = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);

  const { data, isLoading } = useIndividualStaffReport(staffUserId, dateFrom, dateTo);
  const { data: complianceData } = useStaffComplianceSummary(staffUserId, dateFrom, dateTo);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className={tokens.loading.spinner} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Check if all data is empty/zero
  const isAllEmpty = data.revenue.total === 0 && data.productivity.totalAppointments === 0;

  const { revenue, productivity, clientMetrics, retail, experienceScore, topServices, commission, teamAverages, colorBarCompliance } = data;
  const tipRate = experienceScore.tipRate;
  const avgTipDollar = productivity.completed > 0 ? (revenue.total * (tipRate / 100)) / productivity.completed : 0;
  const revenuePerDay = revenue.total / Math.max(1, 30);

  const hasColorBar = colorBarCompliance.totalColorAppointments > 0 || (complianceData?.totalColorAppointments ?? 0) > 0;

  // Use enhanced compliance data if available, fall back to basic
  const comp = complianceData ?? {
    complianceRate: colorBarCompliance.complianceRate,
    totalColorAppointments: colorBarCompliance.totalColorAppointments,
    tracked: colorBarCompliance.tracked,
    missed: colorBarCompliance.missed,
    reweighRate: colorBarCompliance.reweighRate,
    wastePct: 0,
    wasteCost: 0,
    wasteQty: 0,
    overageAttachmentRate: 0,
    overageChargeTotal: 0,
  };

  // Coaching callouts
  const callouts: string[] = [];
  if (hasColorBar && comp.complianceRate < 90) {
    callouts.push('Reweigh compliance is below 90% — review Color Bar tracking habits.');
  }
  if (hasColorBar && comp.wastePct > 15) {
    callouts.push(`Waste rate at ${comp.wastePct}% exceeds the 15% threshold.`);
  }
  if (tipRate < 10 && productivity.completed >= 5) {
    callouts.push('Tip rate is below 10%. Consider reviewing client experience touchpoints.');
  }
  if (retail.attachmentRate < 20 && productivity.completed >= 5) {
    callouts.push('Retail attachment under 20%. Explore product recommendation opportunities.');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <BarChart3 className={tokens.card.icon} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>PERFORMANCE SNAPSHOT</CardTitle>
              <MetricInfoTooltip description="Trailing 30-day performance metrics compared to team averages and prior period trends." />
            </div>
            <CardDescription>Last 30 days</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isAllEmpty && (
          <EmptyDataBanner dateRangeKey="30d" />
        )}

        {/* Section A: Revenue & Productivity */}
        <div>
          <h4 className={cn(tokens.heading.subsection, 'mb-3')}>Revenue & Productivity</h4>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label="Total Revenue"
              description="Total revenue from all appointments in the last 30 days, broken down by services, retail, and tips."
              value={revenue.total}
              teamAvg={teamAverages.revenue}
              teamUnit="$"
              trend={<TrendBadge current={revenue.total} prior={revenue.priorTotal} suffix="%" />}
            >
              <AnimatedBlurredAmount value={revenue.total} currency="USD" decimals={0} />
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="text-xs text-muted-foreground">
                  Services: <AnimatedBlurredAmount value={revenue.service} currency="USD" decimals={0} className="inline text-xs" />
                </span>
                <span className="text-xs text-muted-foreground">
                  Retail: <AnimatedBlurredAmount value={revenue.product} currency="USD" decimals={0} className="inline text-xs" />
                </span>
                <span className="text-xs text-muted-foreground">
                  Tips: <AnimatedBlurredAmount value={revenue.tips} currency="USD" decimals={0} className="inline text-xs" />
                </span>
              </div>
            </KpiTile>

            <KpiTile
              label="Avg Ticket"
              description="Average revenue per client visit."
              value={revenue.avgTicket}
              teamAvg={teamAverages.avgTicket}
              teamUnit="$"
            >
              <AnimatedBlurredAmount value={revenue.avgTicket} currency="USD" decimals={0} />
            </KpiTile>

            <KpiTile
              label="Appointments"
              description="Total completed appointments in this period."
              value={productivity.completed}
              teamAvg={teamAverages.appointments}
            >
              {productivity.completed}
            </KpiTile>

            <KpiTile
              label="Rev / Day"
              description="Average daily revenue over the 30-day period."
            >
              <AnimatedBlurredAmount value={revenuePerDay} currency="USD" decimals={0} />
            </KpiTile>
          </div>
        </div>

        {/* Section B: Client Experience */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className={tokens.heading.subsection}>Client Experience</h4>
            <ExpStatusBadge status={experienceScore.status} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label="Tip Rate"
              description="Total tips as a percentage of total revenue."
              value={tipRate}
            >
              {tipRate.toFixed(1)}%
            </KpiTile>

            <KpiTile
              label="Avg Tip"
              description="Average tip amount per completed appointment."
            >
              <AnimatedBlurredAmount value={avgTipDollar} currency="USD" decimals={2} />
            </KpiTile>

            <KpiTile
              label="Rebook Rate"
              description="Percentage of clients who rebooked at checkout."
              value={clientMetrics.rebookingRate}
              teamAvg={teamAverages.rebookingRate}
              teamUnit="%"
              trend={<TrendBadge current={clientMetrics.rebookingRate} prior={data.multiPeriodTrend.rebooking[1]} suffix="%" />}
            >
              {clientMetrics.rebookingRate.toFixed(0)}%
            </KpiTile>

            <KpiTile
              label="Retention"
              description="Percentage of returning clients from the prior period."
              value={clientMetrics.retentionRate}
              teamAvg={teamAverages.retentionRate}
              teamUnit="%"
              trend={<TrendBadge current={clientMetrics.retentionRate} prior={data.multiPeriodTrend.retention[1]} suffix="%" />}
            >
              {clientMetrics.retentionRate.toFixed(0)}%
            </KpiTile>

            <KpiTile
              label="Retail Attach"
              description="Percentage of service visits where at least one retail product was sold."
              value={retail.attachmentRate}
            >
              {retail.attachmentRate}%
            </KpiTile>

            <KpiTile
              label="Experience Score"
              description="Composite score based on rebooking, tip rate, retention, and retail attachment — weighted and normalized."
              value={experienceScore.composite}
              teamAvg={teamAverages.experienceScore}
            >
              {experienceScore.composite}
            </KpiTile>
          </div>
        </div>

        {/* Section C: Color Bar Operations (collapsible) */}
        {hasColorBar && (
          <Collapsible defaultOpen>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-muted-foreground" />
              <h4 className={tokens.heading.subsection}>Color Bar Operations</h4>
              <CollapsibleTrigger asChild>
                <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-2 gap-3">
                <KpiTile
                  label="Reweigh Rate"
                  description="Percentage of color appointments where bowls were reweighed after service."
                >
                  {comp.complianceRate}%
                </KpiTile>

                <KpiTile
                  label="Waste Rate"
                  description="Percentage of dispensed product that was wasted (not applied to the client)."
                >
                  {comp.wastePct}%
                </KpiTile>

                <KpiTile
                  label="Waste Cost"
                  description="Estimated dollar cost of wasted product in this period."
                >
                  <AnimatedBlurredAmount value={comp.wasteCost} currency="USD" decimals={2} />
                </KpiTile>

                <KpiTile
                  label="Overage Attach"
                  description="Percentage of color appointments with an overage charge applied."
                >
                  {comp.overageAttachmentRate}%
                </KpiTile>

                <KpiTile
                  label="Overage Charges"
                  description="Total overage charges collected from clients in this period."
                >
                  <AnimatedBlurredAmount value={comp.overageChargeTotal} currency="USD" decimals={2} />
                </KpiTile>

                <KpiTile
                  label="Tracked / Missed"
                  description="Number of color appointments tracked through the Color Bar vs missed."
                >
                  <span className="text-emerald-600">{comp.tracked}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className={comp.missed > 0 ? 'text-rose-500' : 'text-muted-foreground'}>{comp.missed}</span>
                </KpiTile>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Section D: Top Services & Commission */}
        <Collapsible>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-muted-foreground" />
            <h4 className={tokens.heading.subsection}>Top Services & Commission</h4>
            <CollapsibleTrigger asChild>
              <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="space-y-3">
              {topServices.slice(0, 3).length > 0 && (
                <div className="space-y-1.5">
                  {topServices.slice(0, 3).map((svc, i) => (
                    <div key={svc.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1">
                        {i + 1}. {svc.name}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground">{svc.count}×</span>
                        <AnimatedBlurredAmount value={svc.revenue} currency="USD" decimals={0} className="font-medium" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <KpiTile
                  label="Commission Tier"
                  description="Current commission structure applied to this stylist."
                >
                  <span className="text-sm truncate">{commission.tierName || 'Unassigned'}</span>
                </KpiTile>
                <KpiTile
                  label="Total Commission"
                  description="Estimated total commission earned in this period based on current rates."
                >
                  <AnimatedBlurredAmount value={commission.totalCommission} currency="USD" decimals={0} />
                </KpiTile>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Coaching Callouts */}
        {callouts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <h4 className={tokens.heading.subsection}>Coaching Focus Areas</h4>
            </div>
            {callouts.map((c, i) => (
              <p key={i} className="text-sm text-muted-foreground pl-6">
                ⚠️ {c}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
