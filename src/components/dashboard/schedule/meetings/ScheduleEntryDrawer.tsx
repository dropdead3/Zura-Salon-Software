import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, CalendarIcon } from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ScheduleTypeSelector } from './ScheduleTypeSelector';
import { getNextAvailableSlot, formatTime12h } from '@/lib/schedule-utils';
import { useOrgNow } from '@/hooks/useOrgNow';

type EventType = 'booking' | 'meeting' | 'timeblock';
type Step = 'type' | 'when';

interface ScheduleEntryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTime?: string;
  onSelectClientBooking: (date: Date, time: string) => void;
  onSelectMeeting: (date: Date, time: string) => void;
  onSelectTimeblock: (date: Date, time: string) => void;
}

// Build 15-min interval slots within business hours (9:00 AM – 7:00 PM)
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h < 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

/**
 * Unified right-side entry drawer for "Add Event".
 *
 * Two-step flow:
 *  1. Type — Client booking / Meeting / Timeblock tile picker.
 *  2. When — Date + time picker, defaulted to next available 15-min slot.
 *
 * If `selectedTime` is provided (slot was clicked from the calendar), the
 * "When" step is skipped to preserve the fast slot→type→wizard flow.
 */
export function ScheduleEntryDrawer({
  open,
  onOpenChange,
  selectedTime,
  onSelectClientBooking,
  onSelectMeeting,
  onSelectTimeblock,
}: ScheduleEntryDrawerProps) {
  const { todayDate } = useOrgNow();

  // Smart default: next 15-min slot, clamped to business hours.
  const initialDefault = useMemo(() => getNextAvailableSlot(new Date()), [open]);

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [whenDate, setWhenDate] = useState<Date>(initialDefault.date);
  const [whenTime, setWhenTime] = useState<string>(initialDefault.time);

  // Reset when drawer opens; recompute next-available slot from current `now`.
  useEffect(() => {
    if (open) {
      const fresh = getNextAvailableSlot(new Date());
      setStep('type');
      setSelectedType(null);
      setWhenDate(fresh.date);
      setWhenTime(fresh.time);
    }
  }, [open]);

  const handleTypePick = (type: EventType) => {
    // Smart skip: context already has time → route immediately.
    if (selectedTime) {
      const date = todayDate;
      const time = selectedTime;
      if (type === 'booking') onSelectClientBooking(date, time);
      else if (type === 'meeting') onSelectMeeting(date, time);
      else onSelectTimeblock(date, time);
      return;
    }
    setSelectedType(type);
    setStep('when');
  };

  const handleContinue = () => {
    if (!selectedType) return;
    if (selectedType === 'booking') onSelectClientBooking(whenDate, whenTime);
    else if (selectedType === 'meeting') onSelectMeeting(whenDate, whenTime);
    else onSelectTimeblock(whenDate, whenTime);
  };

  const handleBack = () => {
    setStep('type');
    setSelectedType(null);
  };

  const typeLabel =
    selectedType === 'booking' ? 'Client Appointment'
    : selectedType === 'meeting' ? 'Internal Meeting'
    : selectedType === 'timeblock' ? 'Timeblock / Break'
    : '';

  // Disable past dates (compare midnights)
  const isPastDate = (d: Date) => {
    const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const cmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return cmp < today;
  };

  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="28rem"
      side="right"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'when' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full -ml-2"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="font-display text-base tracking-wide text-foreground uppercase">
              {step === 'type' ? 'Add Event' : 'When?'}
            </h2>
          </div>

          {/* Step progress pills */}
          <div className="flex gap-1.5 mt-3">
            <div className={cn('h-1 flex-1 rounded-full transition-colors', 'bg-primary')} />
            <div
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                step === 'when' ? 'bg-primary' : 'bg-muted',
              )}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'type' ? (
            <ScheduleTypeSelector
              selectedTime={selectedTime}
              onSelectClientBooking={() => handleTypePick('booking')}
              onSelectMeeting={() => handleTypePick('meeting')}
              onSelectTimeblock={() => handleTypePick('timeblock')}
            />
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground font-sans text-center">
                Schedule <span className="text-foreground">{typeLabel}</span> for…
              </p>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-sans text-muted-foreground uppercase tracking-wide">
                  Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-sans font-normal h-11',
                        !whenDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {whenDate ? format(whenDate, 'EEEE, MMM d, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={whenDate}
                      onSelect={(d) => d && setWhenDate(d)}
                      disabled={isPastDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <label className="text-xs font-sans text-muted-foreground uppercase tracking-wide">
                  Time
                </label>
                <Select value={whenTime} onValueChange={setWhenTime}>
                  <SelectTrigger className="w-full h-11 font-sans">
                    <SelectValue>{formatTime12h(whenTime)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t} className="font-sans">
                        {formatTime12h(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs font-sans text-muted-foreground">
                  Defaulted to next open 15-minute slot.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'when' && (
          <div className="px-6 py-4 border-t border-border/40 shrink-0 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={handleBack} className="font-sans">
              Back
            </Button>
            <Button onClick={handleContinue} className="font-sans">
              Continue
            </Button>
          </div>
        )}
      </div>
    </PremiumFloatingPanel>
  );
}
