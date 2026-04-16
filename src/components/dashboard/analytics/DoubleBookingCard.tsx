import { Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoubleBookingStats } from '@/hooks/useDoubleBookingStats';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { tokens } from '@/lib/design-tokens';
import { format, subDays } from 'date-fns';

interface DoubleBookingCardProps {
  locationId?: string;
  dateRange?: 'tomorrow' | '7days' | '30days' | '90days';
}

function getDateRange(range: string): { from: string; to: string } {
  const today = new Date();
  const days = range === '7days' ? 7 : range === '90days' ? 90 : 30;
  return {
    from: format(subDays(today, days), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  };
}

export function DoubleBookingCard({ locationId, dateRange = '30days' }: DoubleBookingCardProps) {
  const { from, to } = getDateRange(dateRange);
  const { data, isLoading } = useDoubleBookingStats(from, to, locationId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className={tokens.heading.card}>DOUBLE-BOOKING ANALYSIS</CardTitle>
            <MetricInfoTooltip description="Shows the total overlapping appointment time per stylist. Calculated by detecting time intervals where a stylist has two or more appointments running simultaneously." />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className={tokens.empty.container}>
            <Layers className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No double-bookings detected</h3>
            <p className={tokens.empty.description}>No overlapping appointments found in this period</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
                <TableHead className={tokens.table.columnHeader}>Double-Booked Time</TableHead>
                <TableHead className={tokens.table.columnHeader}>% of Schedule</TableHead>
                <TableHead className={tokens.table.columnHeader}>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.stylistUserId}>
                  <TableCell className="font-sans text-sm">{row.staffName}</TableCell>
                  <TableCell className="font-sans text-sm">{formatMinutesToDuration(row.totalDoubleBookedMinutes)}</TableCell>
                  <TableCell className="font-sans text-sm">{row.percentOfSchedule}%</TableCell>
                  <TableCell className="font-sans text-sm">{row.doubleBookedSessions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
