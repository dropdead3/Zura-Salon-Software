import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, Scissors, AlertTriangle, Settings, TrendingUp, Calendar } from 'lucide-react';
import { useHiringCapacity, LocationCapacity } from '@/hooks/useHiringCapacity';
import { useHiringForecast } from '@/hooks/useHiringForecast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';


interface HiringCapacityCardProps {
  className?: string;
}

function getCapacityColor(current: number, target: number): string {
  if (target === 0) return 'bg-muted';
  const percentage = (current / target) * 100;
  if (percentage >= 100) return 'bg-primary';
  if (percentage >= 75) return 'bg-chart-4'; // amber equivalent
  return 'bg-destructive';
}

function getCapacityTextColor(current: number, target: number): string {
  if (target === 0) return 'text-muted-foreground';
  const percentage = (current / target) * 100;
  if (percentage >= 100) return 'text-primary';
  if (percentage >= 75) return 'text-chart-4';
  return 'text-destructive';
}

function getPriorityBadgeClass(level: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'critical':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-chart-5 text-foreground dark:text-background';
    case 'medium':
      return 'bg-chart-4 text-foreground dark:text-background';
    case 'low':
      return 'bg-primary/10 text-primary';
  }
}

function LocationRow({ location }: { location: LocationCapacity }) {
  const hasCapacityConfig = location.stylistCapacity !== null;
  
  if (!hasCapacityConfig) {
    return (
      <div className="py-3 border-b border-border/50 last:border-0">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">{location.name}</span>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Not Configured
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Set capacity targets in Location Settings
        </p>
      </div>
    );
  }

  const stylistPercentage = location.stylistCapacity 
    ? Math.min(100, (location.currentStylists / location.stylistCapacity) * 100) 
    : 0;
  const assistantPercentage = location.targetAssistants > 0
    ? Math.min(100, (location.currentAssistants / location.targetAssistants) * 100)
    : 100;

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{location.name}</span>
          {location.priorityScore > 0 && (
            <Badge className={cn("text-xs", getPriorityBadgeClass(location.priorityLevel))}>
              {location.priorityScore} Priority
            </Badge>
          )}
        </div>
        {location.totalNeeded > 0 ? (
          <Badge variant="destructive" className="text-xs">
            {location.totalNeeded} needed
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            Fully Staffed
          </Badge>
        )}
      </div>

      {/* Stylists Progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Scissors className="h-3 w-3" />
            Stylists
          </span>
          <span className={cn("font-medium tabular-nums", getCapacityTextColor(location.currentStylists, location.stylistCapacity || 0))}>
            {location.currentStylists} / {location.stylistCapacity}
            {location.stylistsNeeded > 0 && (
              <span className="text-destructive ml-1">({location.stylistsNeeded} needed)</span>
            )}
          </span>
        </div>
        <Progress 
          value={stylistPercentage} 
          className="h-2"
          indicatorClassName={getCapacityColor(location.currentStylists, location.stylistCapacity || 0)}
        />
      </div>

      {/* Assistants Progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            Assistants
          </span>
          <span className={cn("font-medium tabular-nums", getCapacityTextColor(location.currentAssistants, location.targetAssistants))}>
            {location.currentAssistants} / {location.targetAssistants}
            {location.assistantsNeeded > 0 && (
              <span className="text-destructive ml-1">({location.assistantsNeeded} needed)</span>
            )}
          </span>
        </div>
        <Progress 
          value={assistantPercentage} 
          className="h-2"
          indicatorClassName={getCapacityColor(location.currentAssistants, location.targetAssistants)}
        />
      </div>
    </div>
  );
}

export function HiringCapacityCard({ className }: HiringCapacityCardProps) {
  const navigate = useNavigate();
  const {
    locations,
    totalStylistsNeeded,
    totalAssistantsNeeded,
    totalHiresNeeded,
    totalCurrentStylists,
    totalStylistCapacity,
    totalCurrentAssistants,
    totalTargetAssistants,
    isLoading,
  } = useHiringCapacity();

  const { data: forecast, isLoading: isForecastLoading } = useHiringForecast();

  if (isLoading) {
    return (
      <Card className={cn(tokens.card.wrapper, className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <ChartSkeleton lines={4} className="h-[120px]" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyCapacity = locations.some(loc => loc.stylistCapacity !== null);

  const handleConfigure = () => {
    navigate('/dashboard/admin/settings', { 
      state: { navTimestamp: Date.now(), category: 'locations' } 
    });
  };

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">HIRING CAPACITY</CardTitle>
                <MetricInfoTooltip description="Compares current headcount against configured stylist and assistant capacity targets per location. Locations are sorted by hiring priority." />
              </div>
              <CardDescription>Current staffing levels vs configured capacity</CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleConfigure}
            className={tokens.button.cardAction}
          >
            <Settings className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {hasAnyCapacity ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-medium tabular-nums text-destructive">
                  {totalStylistsNeeded}
                </div>
                <div className="text-xs text-muted-foreground">Stylists Needed</div>
                <div className="text-xs text-muted-foreground tabular-nums mt-1">
                  {totalCurrentStylists} / {totalStylistCapacity}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-medium tabular-nums text-destructive">
                  {totalAssistantsNeeded}
                </div>
                <div className="text-xs text-muted-foreground">Assistants Needed</div>
                <div className="text-xs text-muted-foreground tabular-nums mt-1">
                  {totalCurrentAssistants} / {totalTargetAssistants}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <div className={cn(
                  "text-2xl font-medium tabular-nums",
                  totalHiresNeeded > 0 ? "text-destructive" : "text-primary"
                )}>
                  {totalHiresNeeded}
                </div>
                <div className="text-xs text-muted-foreground">Total Hires</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {totalHiresNeeded === 0 ? "Fully staffed!" : "To reach capacity"}
                </div>
              </div>
            </div>

            {/* Location Breakdown */}
            <div className="space-y-0">
              <h4 className={cn(tokens.heading.subsection, "mb-2")}>By Location (Sorted by Priority)</h4>
              {locations.map(location => (
                <LocationRow key={location.id} location={location} />
              ))}
            </div>

            {/* 90-Day Forecast Section */}
            {!isForecastLoading && forecast && (
              <div className="border-t pt-4 mt-4">
                <h4 className={cn(tokens.heading.subsection, "mb-3 flex items-center gap-2")}>
                  <TrendingUp className="h-4 w-4 text-primary" />
                  90-Day Hiring Forecast
                </h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded bg-chart-4/10">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="h-3 w-3 text-chart-4" />
                      <span className="text-lg font-medium tabular-nums text-chart-4">{forecast.totalPlannedDepartures}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Planned Departures</div>
                  </div>
                  <div className="text-center p-2 rounded bg-primary/10">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-lg font-medium tabular-nums text-primary">{forecast.totalGrowthBasedNeed}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Growth-Based Need</div>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <span className="text-lg font-medium tabular-nums text-foreground">{forecast.totalForecastedHires}</span>
                    <div className="text-xs text-muted-foreground">Total Forecast</div>
                  </div>
                </div>

                {forecast.averageGrowthRate !== 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Avg. appointment growth: <span className="tabular-nums">{forecast.averageGrowthRate > 0 ? '+' : ''}{forecast.averageGrowthRate}%</span>
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-chart-4 mb-3" />
            <h4 className="font-medium mb-1">No Capacity Configured</h4>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Set stylist capacity and assistant ratios in Location Settings to track hiring needs.
            </p>
            <Button variant="outline" onClick={handleConfigure}>
              Configure Capacity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
