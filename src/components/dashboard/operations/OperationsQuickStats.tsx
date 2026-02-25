import { Card } from '@/components/ui/card';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { useTodaysQueue } from '@/hooks/useTodaysQueue';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BentoGrid } from '@/components/ui/bento-grid';

interface OperationsQuickStatsProps {
  locationId?: string;
  hideRevenue?: boolean;
  filterContext?: FilterContext;
}

export function OperationsQuickStats({ locationId, hideRevenue, filterContext }: OperationsQuickStatsProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: queueData, isLoading } = useTodaysQueue(locationId);

  const stats = [
    {
      label: 'Waiting',
      value: queueData?.stats.waitingCount ?? 0,
      icon: Users,
      bgColor: 'bg-warning/10',
      iconColor: 'text-warning-foreground',
      description: 'Confirmed, ready to check in',
    },
    {
      label: 'In Service',
      value: queueData?.stats.inServiceCount ?? 0,
      icon: Clock,
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
      description: 'Currently checked in',
    },
    {
      label: 'Completed',
      value: queueData?.stats.completedCount ?? 0,
      icon: CheckCircle2,
      bgColor: 'bg-success/10',
      iconColor: 'text-success-foreground',
      description: 'Paid and finished',
    },
    {
      label: 'No-Shows',
      value: queueData?.stats.noShowCount ?? 0,
      icon: AlertTriangle,
      bgColor: 'bg-destructive/10',
      iconColor: 'text-destructive',
      description: 'Missed appointments',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base tracking-wide">TODAY'S OPERATIONS</h2>
        {filterContext && (
          <AnalyticsFilterBadge 
            locationId={filterContext.locationId} 
            dateRange={filterContext.dateRange} 
          />
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bgColor} flex items-center justify-center rounded`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-display">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-sans">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
        
        {/* Revenue Card - Hidden for Front Desk */}
        {!hideRevenue && (
          <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/10 flex items-center justify-center rounded">
                <DollarSign className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display text-success-foreground">
                  {formatCurrencyWhole(queueData?.stats.totalRevenue ?? 0)}
                </p>
                <p className="text-xs text-success-foreground/80 font-sans">Today's Revenue</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
