import { CalendarPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleTypeSelectorProps {
  onSelectClientBooking: () => void;
  onSelectMeeting: () => void;
}

/**
 * For dual-role users (admin + service provider): 
 * Asks which type of scheduling they want to do before opening the appropriate wizard.
 */
export function ScheduleTypeSelector({ onSelectClientBooking, onSelectMeeting }: ScheduleTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground font-sans text-center">
        What would you like to schedule?
      </p>
      <div className="grid gap-3">
        <button
          onClick={onSelectClientBooking}
          className={cn(
            'flex items-center gap-4 p-4 rounded-xl border border-border',
            'hover:border-primary/30 hover:bg-muted/50 transition-all text-left'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <CalendarPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-sans text-foreground">Client Appointment</p>
            <p className="text-xs font-sans text-muted-foreground">Book a service for a client</p>
          </div>
        </button>

        <button
          onClick={onSelectMeeting}
          className={cn(
            'flex items-center gap-4 p-4 rounded-xl border border-border',
            'hover:border-primary/30 hover:bg-muted/50 transition-all text-left'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-sans text-foreground">Internal Meeting</p>
            <p className="text-xs font-sans text-muted-foreground">1-on-1, interview, team meeting</p>
          </div>
        </button>
      </div>
    </div>
  );
}
