import { CalendarDays, Info } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayrollAnalytics } from '@/hooks/usePayrollAnalytics';
import { usePayrollForecasting } from '@/hooks/usePayrollForecasting';
import { useTierDistribution } from '@/hooks/useTierDistribution';
import { PayrollKPICards } from './analytics/PayrollKPICards';
import { CompensationBreakdownChart } from './analytics/CompensationBreakdownChart';
import { TeamCompensationTable } from './analytics/TeamCompensationTable';
import { TierProgressionCard } from './analytics/TierProgressionCard';

export function PayrollOverview() {
  const { formatDate } = useFormatDate();
  const { kpis, compensationBreakdown, isLoading: isLoadingAnalytics } = usePayrollAnalytics();
  const { projection, isLoading: isLoadingForecast, currentPeriod } = usePayrollForecasting();
  const { progressionOpportunities, impactAnalysis, isLoading: isLoadingTiers } = useTierDistribution();

  const isLoading = isLoadingAnalytics || isLoadingForecast;

  return (
    <div className="space-y-6">
      {/* Period Context */}
      {currentPeriod && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Current Period:</span>
            <span className="font-medium">
              {formatDate(currentPeriod.periodStart, 'MMM d')} - {formatDate(currentPeriod.periodEnd, 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Next Pay Day:</span>
            <Badge variant="secondary">
              {formatDate(currentPeriod.nextPayDay, 'MMM d, yyyy')}
            </Badge>
          </div>
          {projection && (
            <Badge 
              variant={
                projection.confidenceLevel === 'high' ? 'default' :
                projection.confidenceLevel === 'medium' ? 'secondary' : 'outline'
              }
              className="text-xs"
            >
              {projection.confidenceLevel.charAt(0).toUpperCase() + projection.confidenceLevel.slice(1)} Confidence
              ({projection.daysOfData} days of data)
            </Badge>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <PayrollKPICards kpis={kpis} isLoading={isLoading} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compensation Breakdown - takes 1 column */}
        <CompensationBreakdownChart 
          breakdown={compensationBreakdown} 
          isLoading={isLoading} 
        />

        {/* Tier Progression - takes 2 columns */}
        <div className="lg:col-span-2">
          <TierProgressionCard
            opportunities={progressionOpportunities}
            impactAnalysis={impactAnalysis}
            isLoading={isLoadingTiers}
          />
        </div>
      </div>

      {/* Team Compensation Table */}
      {projection && (
        <TeamCompensationTable
          employees={projection.byEmployee}
          isLoading={isLoadingForecast}
          periodLabel={projection.periodLabel}
        />
      )}

      {!projection && !isLoadingForecast && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configure your pay schedule in Settings to enable payroll forecasting and see team projections.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
