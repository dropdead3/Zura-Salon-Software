/**
 * ServiceProfitabilityCard — Owner-facing wrapper around ProfitByServiceTable.
 * Fetches appointment profit data and renders the service comparison view.
 */

import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentProfitSummary } from '@/hooks/backroom/useAppointmentProfit';
import { ProfitByServiceTable } from '@/components/dashboard/backroom/appointment-profit/ProfitByServiceTable';

interface ServiceProfitabilityCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  className?: string;
}

export function ServiceProfitabilityCard({ dateFrom, dateTo, locationId, className }: ServiceProfitabilityCardProps) {
  const { data: summary, isLoading } = useAppointmentProfitSummary(dateFrom, dateTo, locationId);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
      </div>
    );
  }

  return (
    <ProfitByServiceTable
      data={summary?.serviceRankings ?? []}
      className={className}
    />
  );
}
