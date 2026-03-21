import { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';

interface ScheduleUtilizationBarProps {
  date: Date;
  appointments: PhorestAppointment[];
  stylistCount: number;
  hoursStart?: number;
  hoursEnd?: number;
  averageServicePrice?: number;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function ScheduleUtilizationBar({
  date,
  appointments,
  stylistCount,
  hoursStart = 9,
  hoursEnd = 18,
  averageServicePrice = 85,
}: ScheduleUtilizationBarProps) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const metrics = useMemo(() => {
    const dayAppointments = appointments.filter(
      (apt) =>
        apt.appointment_date === dateStr &&
        !['cancelled', 'no_show'].includes(apt.status)
    );

    // Total available minutes across all stylists
    const availableMinutes = (hoursEnd - hoursStart) * 60 * Math.max(stylistCount, 1);

    // Total booked minutes
    const bookedMinutes = dayAppointments.reduce((sum, apt) => {
      const duration = parseTimeToMinutes(apt.end_time) - parseTimeToMinutes(apt.start_time);
      return sum + Math.max(duration, 0);
    }, 0);

    const fillRate = availableMinutes > 0 ? Math.round((bookedMinutes / availableMinutes) * 100) : 0;

    // Count gaps > 30 min per stylist
    const byStaff = new Map<string, PhorestAppointment[]>();
    dayAppointments.forEach((apt) => {
      const key = apt.stylist_user_id || 'unassigned';
      if (!byStaff.has(key)) byStaff.set(key, []);
      byStaff.get(key)!.push(apt);
    });

    let gapCount = 0;
    byStaff.forEach((apts) => {
      const sorted = [...apts].sort(
        (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time)
      );
      for (let i = 0; i < sorted.length - 1; i++) {
        const gapMin =
          parseTimeToMinutes(sorted[i + 1].start_time) -
          parseTimeToMinutes(sorted[i].end_time);
        if (gapMin >= 30) gapCount++;
      }
    });

    // Revenue potential from open slots (30 min increments)
    const openMinutes = Math.max(availableMinutes - bookedMinutes, 0);
    const openSlots = Math.floor(openMinutes / 30);
    const revenuePotential = openSlots * (averageServicePrice / 2); // rough half-service estimate

    return { fillRate, gapCount, revenuePotential, bookedMinutes, availableMinutes };
  }, [appointments, dateStr, stylistCount, hoursStart, hoursEnd, averageServicePrice]);

  return (
    <div className="bg-muted/40 border border-border/50 rounded-lg px-4 py-2.5 flex items-center gap-6">
      {/* Fill Rate */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 max-w-[180px]">
          <Progress value={metrics.fillRate} className="h-2" />
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className={cn(tokens.stat.large, 'text-lg')}>{metrics.fillRate}%</span>
          <span className={tokens.body.muted}>fill</span>
        </div>
      </div>

      {/* Gap Count */}
      <div className="flex items-center gap-1.5">
        <AlertCircle className={cn('h-3.5 w-3.5', metrics.gapCount > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
        <span className={cn(tokens.stat.large, 'text-lg')}>{metrics.gapCount}</span>
        <span className={tokens.body.muted}>gap{metrics.gapCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Revenue Potential */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(tokens.stat.large, 'text-lg')}>
          ${Math.round(metrics.revenuePotential).toLocaleString()}
        </span>
        <span className={tokens.body.muted}>potential</span>
      </div>
    </div>
  );
}
