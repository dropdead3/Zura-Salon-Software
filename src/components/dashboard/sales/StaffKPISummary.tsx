import { Users, UserCheck, RefreshCw, Receipt, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useClientEngagement } from '@/hooks/useClientEngagement';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

type EngagementView = 'visits' | 'retention' | 'rebooking';

interface StaffKPISummaryProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onTileClick?: (view: EngagementView) => void;
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5', tokens.kpi.change,
      isPositive ? 'text-green-500' : isNeutral ? 'text-muted-foreground' : 'text-red-500'
    )}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function StaffKPISummary({ dateFrom, dateTo, locationId, onTileClick }: StaffKPISummaryProps) {
  const { data, isLoading } = useClientEngagement(dateFrom, dateTo, locationId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(tokens.kpi.tile, 'space-y-2')}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const tiles: {
    icon: typeof Users;
    label: string;
    value: React.ReactNode;
    change: number | null;
    viewKey: EngagementView;
  }[] = [
    {
      icon: Users,
      label: 'Total Visits',
      value: data.visits.total.toLocaleString(),
      change: data.visits.percentChange,
      viewKey: 'visits',
    },
    {
      icon: UserCheck,
      label: 'Returning %',
      value: `${Math.round(data.retention.overallRate)}%`,
      change: data.retention.percentChange,
      viewKey: 'retention',
    },
    {
      icon: RefreshCw,
      label: 'Rebooking %',
      value: `${Math.round(data.rebooking.overallRate)}%`,
      change: data.rebooking.percentChange,
      viewKey: 'rebooking',
    },
    {
      icon: Receipt,
      label: 'Avg Ticket',
      value: <AnimatedBlurredAmount value={data.avgTicket.current} currency="USD" />,
      change: data.avgTicket.percentChange,
      viewKey: 'visits',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          onClick={() => onTileClick?.(tile.viewKey)}
          className={cn(
            tokens.kpi.tile,
            onTileClick && "cursor-pointer hover:border-primary/30 transition-colors"
          )}
        >
          <div className="flex items-center gap-1.5">
            <tile.icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={tokens.kpi.label}>
              {tile.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={tokens.kpi.value}>{tile.value}</span>
            <ChangeBadge value={tile.change} />
          </div>
        </div>
      ))}
    </div>
  );
}
