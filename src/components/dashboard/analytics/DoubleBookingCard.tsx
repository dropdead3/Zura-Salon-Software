import { Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { useDoubleBookingStats } from '@/hooks/useDoubleBookingStats';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

interface DoubleBookingCardProps {
  locationId?: string;
  dateRange?: 'tomorrow' | '7days' | '30days' | '90days';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function getDateRange(range: string): { from: string; to: string } {
  const today = new Date();
  const days = range === '7days' ? 7 : range === '90days' ? 90 : 30;
  return {
    from: format(subDays(today, days), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
  };
}

function getCellColor(minutes: number, max: number) {
  if (minutes === 0) return 'bg-muted/30';
  const intensity = minutes / max;
  if (intensity > 0.75) return 'bg-primary text-primary-foreground';
  if (intensity > 0.5) return 'bg-primary/70 text-primary-foreground';
  if (intensity > 0.25) return 'bg-primary/40';
  return 'bg-primary/15';
}

export function DoubleBookingCard({ locationId, dateRange = '30days' }: DoubleBookingCardProps) {
  const { from, to } = getDateRange(dateRange);
  const { data, isLoading } = useDoubleBookingStats(from, to, locationId);

  const staffStats = data?.staffStats ?? [];
  const heatmapCells = data?.heatmapCells ?? [];
  const maxOverlap = data?.maxOverlap ?? 1;

  const getOverlap = (day: number, hour: number) =>
    heatmapCells.find(c => c.day === day && c.hour === hour)?.overlapMinutes ?? 0;

  const hasData = staffStats.length > 0;

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
        ) : !hasData ? (
          <div className={tokens.empty.container}>
            <Layers className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No double-bookings detected</h3>
            <p className={tokens.empty.description}>No overlapping appointments found in this period</p>
          </div>
        ) : (
          <Tabs defaultValue="stylist">
            <FilterTabsList>
              <FilterTabsTrigger value="stylist">By Stylist</FilterTabsTrigger>
              <FilterTabsTrigger value="heatmap">Heatmap</FilterTabsTrigger>
            </FilterTabsList>

            <TabsContent value="stylist">
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
                  {staffStats.map((row) => (
                    <TableRow key={row.stylistUserId}>
                      <TableCell className="font-sans text-sm">{row.staffName}</TableCell>
                      <TableCell className="font-sans text-sm">{formatMinutesToDuration(row.totalDoubleBookedMinutes)}</TableCell>
                      <TableCell className="font-sans text-sm">{row.percentOfSchedule}%</TableCell>
                      <TableCell className="font-sans text-sm">{row.doubleBookedSessions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="heatmap">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Header row */}
                  <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}>
                    <div />
                    {HOURS.map(h => (
                      <div key={h} className="text-center text-[10px] text-muted-foreground font-sans pb-1">{h}:00</div>
                    ))}
                  </div>
                  {/* Data rows */}
                  {DAY_NAMES.map((name, d) => (
                    <div key={d} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}>
                      <div className="flex items-center text-xs font-medium">{name}</div>
                      {HOURS.map(h => {
                        const mins = getOverlap(d, h);
                        return (
                          <div
                            key={h}
                            className={cn('rounded h-8 flex items-center justify-center text-[10px] transition-colors', getCellColor(mins, maxOverlap))}
                            title={`${name} ${h}:00 — ${mins} min overlap`}
                          >
                            {mins > 0 ? mins : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-0.5">
                  <div className="w-4 h-4 rounded bg-muted/30 border" />
                  <div className="w-4 h-4 rounded bg-primary/15" />
                  <div className="w-4 h-4 rounded bg-primary/40" />
                  <div className="w-4 h-4 rounded bg-primary/70" />
                  <div className="w-4 h-4 rounded bg-primary" />
                </div>
                <span>More</span>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
