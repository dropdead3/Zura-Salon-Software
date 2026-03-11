import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import { addDays, subDays, isSameDay, format as formatDateFns } from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useState } from 'react';

interface Stylist {
  phorest_staff_id: string;
  user_id: string;
  employee_profiles: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  } | null;
}

interface StylistStepProps {
  stylists: Stylist[];
  selectedStylist: string;
  onStylistChange: (stylistId: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  onContinue: () => void;
  canContinue: boolean;
  qualificationInfo?: {
    totalQualified: number;
    hasData: boolean;
  };
}

// Generate time slots from 8am to 8pm
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}).filter(t => {
  const [h] = t.split(':');
  return parseInt(h) < 20;
});

export function StylistStep({
  stylists,
  selectedStylist,
  onStylistChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  onContinue,
  canContinue,
  qualificationInfo,
}: StylistStepProps) {
  const { formatDate } = useFormatDate();
  const [showCalendar, setShowCalendar] = useState(false);
  const { todayStr, todayDate, isToday: isOrgToday } = useOrgNow();

  // Generate next 7 days for quick selection (org-timezone-aware)
  const quickDates = Array.from({ length: 7 }, (_, i) => addDays(todayDate, i));

  const formatTime12h = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Stylist Selection */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Available Stylists
              {qualificationInfo?.hasData && (
                <span className="text-xs font-normal text-muted-foreground/70 ml-2">
                  ({qualificationInfo.totalQualified} qualified)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {stylists.map((stylist) => {
                const name = formatDisplayName(stylist.employee_profiles?.full_name || '', stylist.employee_profiles?.display_name);
                const isSelected = selectedStylist === stylist.user_id;
                return (
                  <button
                    key={stylist.user_id}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-lg transition-all',
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-muted/70'
                    )}
                    onClick={() => onStylistChange(stylist.user_id)}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={stylist.employee_profiles?.photo_url || undefined} />
                        <AvatarFallback className="bg-muted text-xs">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium mt-2 text-center line-clamp-1">
                      {name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Select Date
              </h3>
              <Button
                variant="ghost"
                size={tokens.button.inline}
                className="h-7 text-xs text-primary"
                onClick={() => setShowCalendar(!showCalendar)}
              >
                {showCalendar ? 'Quick dates' : 'View calendar'}
              </Button>
            </div>

            {showCalendar ? (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-lg border"
              />
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {quickDates.map((date) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  return (
                    <button
                      key={date.toISOString()}
                      className={cn(
                        'flex flex-col items-center min-w-[56px] p-2 rounded-lg transition-all shrink-0',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted/70'
                      )}
                      onClick={() => onDateChange(date)}
                    >
                      <span className={cn(
                        'text-[10px] uppercase',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>
                        {isToday ? 'Today' : formatDate(date, 'EEE')}
                      </span>
                      <span className="text-lg font-medium">{formatDate(date, 'd')}</span>
                      <span className={cn(
                        'text-[10px]',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>
                        {formatDate(date, 'MMM')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time Selection */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Select Time
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    className={cn(
                      'py-2.5 px-2 rounded-lg text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted text-foreground'
                    )}
                    onClick={() => onTimeChange(time)}
                  >
                    {formatTime12h(time)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card">
        <Button
          className="w-full h-11"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
