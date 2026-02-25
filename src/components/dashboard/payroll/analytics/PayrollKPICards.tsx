import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Percent,
  Clock,
  Building2,
  Wallet
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PayrollKPIs } from '@/hooks/usePayrollAnalytics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BentoGrid } from '@/components/ui/bento-grid';

interface PayrollKPICardsProps {
  kpis: PayrollKPIs;
  isLoading: boolean;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

interface KPICardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  iconClassName?: string;
  isLoading?: boolean;
  tooltipDescription?: string;
}

function KPICard({ title, value, subtitle, trend, icon: Icon, iconClassName, isLoading, tooltipDescription }: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              {tooltipDescription && <MetricInfoTooltip description={tooltipDescription} />}
            </div>
            <div className="text-2xl font-medium mt-1">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-xs mt-1',
                trend >= 0 ? 'text-success-foreground' : 'text-destructive'
              )}>
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{formatPercent(trend)}</span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <div className={cn(
            'p-2 rounded-lg bg-primary/10',
            iconClassName
          )}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PayrollKPICards({ kpis, isLoading }: PayrollKPICardsProps) {
  const { currency } = useFormatCurrency();
  return (
    <BentoGrid maxPerRow={4} gap="gap-4">
      <KPICard
        title="Next Payroll Forecast"
        tooltipDescription="Estimated gross payroll for the upcoming pay period based on current revenue pace and configured compensation rates."
        value={
          <AnimatedNumber
            value={kpis.nextPayrollForecast}
            formatOptions={{ style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }}
            className="tabular-nums"
          />
        }
        trend={kpis.forecastChange}
        icon={DollarSign}
        isLoading={isLoading}
      />
      <KPICard
        title="YTD Payroll Total"
        tooltipDescription="Total gross payroll disbursed year-to-date from completed payroll runs."
        value={
          <AnimatedNumber
            value={kpis.ytdPayrollTotal}
            formatOptions={{ style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }}
            className="tabular-nums"
          />
        }
        subtitle="total gross pay"
        icon={Wallet}
        isLoading={isLoading}
      />
      <KPICard
        title="Labor Cost"
        tooltipDescription="Total payroll as a percentage of total revenue. Lower is more efficient; industry benchmark is typically 40-50%."
        value={<AnimatedNumber value={kpis.laborCostRatio} decimals={1} suffix="%" className="tabular-nums" />}
        subtitle="of revenue"
        icon={Percent}
        isLoading={isLoading}
      />
      <KPICard
        title="Commission Ratio"
        tooltipDescription="Commission paid as a percentage of total gross pay. Reflects how much of compensation is performance-based."
        value={<AnimatedNumber value={kpis.commissionRatio} decimals={1} suffix="%" className="tabular-nums" />}
        subtitle="of gross pay"
        icon={TrendingUp}
        isLoading={isLoading}
      />
      <KPICard
        title="Employer Tax Burden"
        tooltipDescription="Estimated employer-side payroll taxes for the current period including FICA, FUTA, and state contributions."
        value={
          <AnimatedNumber
            value={kpis.employerTaxBurden}
            formatOptions={{ style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }}
            className="tabular-nums"
          />
        }
        subtitle="estimated taxes"
        icon={Building2}
        isLoading={isLoading}
      />
      <KPICard
        title="Active Employees"
        tooltipDescription="Total number of team members currently on payroll with active employment status."
        value={<AnimatedNumber value={kpis.activeEmployeeCount} className="tabular-nums" />}
        subtitle="on payroll"
        icon={Users}
        isLoading={isLoading}
      />
      <KPICard
        title="Overtime Hours"
        tooltipDescription="Total overtime hours logged across all hourly employees in the current pay period."
        value={<AnimatedNumber value={kpis.overtimeHours} suffix=" hrs" className="tabular-nums" />}
        subtitle="this period"
        icon={Clock}
        isLoading={isLoading}
      />
      <KPICard
        title="Tips Collected"
        tooltipDescription="Total tips collected across all team members for the current pay period."
        value={
          <AnimatedNumber
            value={kpis.tipsCollected}
            formatOptions={{ style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }}
            className="tabular-nums"
          />
        }
        subtitle="this period"
        icon={DollarSign}
        iconClassName="bg-emerald-500/10"
        isLoading={isLoading}
      />
    </BentoGrid>
  );
}
