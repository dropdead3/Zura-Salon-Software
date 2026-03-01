import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { DayForecast, AppointmentSummary } from '@/hooks/useWeekAheadRevenue';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Clock, User, Scissors, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface DayAppointmentsSheetProps {
  day: DayForecast | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  booked: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Unconfirmed' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
  checked_in: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Checked In' },
  completed: { bg: 'bg-chart-2/20', text: 'text-chart-2', label: 'Completed' },
  paid: { bg: 'bg-primary/20', text: 'text-primary', label: 'Paid' },
};

function formatTime12h(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function AppointmentCard({ appointment, onClick }: { appointment: AppointmentSummary; onClick?: () => void }) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.booked;
  
  return (
    <Card 
      className={cn("p-3 space-y-2 transition-colors", onClick && "cursor-pointer hover:bg-muted/50 group")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-medium">
            {formatTime12h(appointment.start_time)}
            {appointment.end_time && ` - ${formatTime12h(appointment.end_time)}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {onClick && (
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-primary transition-colors" />
          )}
          <Badge 
            variant="secondary" 
            className={cn('text-xs', statusConfig.bg, statusConfig.text)}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium text-sm">
            {appointment.client_name || 'Walk-in'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Scissors className="w-3.5 h-3.5" />
          <span className="text-sm">
            {appointment.service_name || 'Service'}
          </span>
        </div>
        
        {appointment.stylist_name && (
          <p className="text-xs text-muted-foreground pl-5">
            with {appointment.stylist_name}
          </p>
        )}
      </div>
      
      {appointment.total_price != null && appointment.total_price > 0 && (
        <div className="text-right">
          <span className="font-display text-sm text-primary tabular-nums">
            <BlurredAmount>{formatCurrencyWhole(appointment.total_price)}</BlurredAmount>
          </span>
        </div>
      )}
    </Card>
  );
}

export function DayAppointmentsSheet({ day, open, onOpenChange }: DayAppointmentsSheetProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const navigate = useNavigate();
  if (!day) return null;

  const handleAppointmentClick = (apt: AppointmentSummary) => {
    onOpenChange(false);
    navigate('/dashboard/schedule', { 
      state: { focusDate: day.date, focusAppointmentId: apt.id } 
    });
  };

  const confirmedCount = day.appointments.filter(a => a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'completed' || a.status === 'paid').length;
  const unconfirmedCount = day.appointments.filter(a => a.status === 'booked').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display">
            {formatDate(parseISO(day.date), 'EEEE, MMMM d')}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span>{day.appointmentCount} appointment{day.appointmentCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span className="font-display">
              <BlurredAmount>{fmtWhole(day.revenue)}</BlurredAmount> projected
            </span>
          </SheetDescription>
          
          <div className="flex gap-2 pt-2">
            <Badge variant="secondary" className="bg-chart-2/20 text-chart-2">
              {confirmedCount} Confirmed
            </Badge>
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {unconfirmedCount} Unconfirmed
            </Badge>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-3 pr-4">
            {day.appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No appointments scheduled
              </p>
            ) : (
              day.appointments.map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} onClick={() => handleAppointmentClick(apt)} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
