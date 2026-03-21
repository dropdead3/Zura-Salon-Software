import { useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaySchedule } from '@/hooks/usePaySchedule';
import { tokens } from '@/lib/design-tokens';

interface PayPeriodStepProps {
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
  checkDate: string | null;
  onPayPeriodStartChange: (date: string | null) => void;
  onPayPeriodEndChange: (date: string | null) => void;
  onCheckDateChange: (date: string | null) => void;
}

export function PayPeriodStep({
  payPeriodStart,
  payPeriodEnd,
  checkDate,
  onPayPeriodStartChange,
  onPayPeriodEndChange,
  onCheckDateChange,
}: PayPeriodStepProps) {
  const { formatDate } = useFormatDate();
  const today = new Date();
  const { currentPeriod, nextPayDay } = usePaySchedule();

  // Dynamic preset based on configured pay schedule
  const paySchedulePreset = useMemo(() => {
    return {
      label: 'Current Pay Period',
      getRange: () => ({
        start: currentPeriod.periodStart,
        end: currentPeriod.periodEnd,
      }),
      checkDate: currentPeriod.nextPayDay,
    };
  }, [currentPeriod]);

  // Quick presets
  const presets = [
    {
      label: 'Last 2 Weeks',
      getRange: () => ({
        start: subDays(today, 14),
        end: subDays(today, 1),
      }),
    },
    {
      label: 'Last Week',
      getRange: () => ({
        start: subDays(today, 7),
        end: subDays(today, 1),
      }),
    },
    {
      label: 'This Month',
      getRange: () => ({
        start: startOfMonth(today),
        end: subDays(today, 1),
      }),
    },
    {
      label: 'Last Month',
      getRange: () => {
        const lastMonth = subDays(startOfMonth(today), 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        };
      },
    },
  ];

  const applyPaySchedulePreset = () => {
    const { start, end } = paySchedulePreset.getRange();
    onPayPeriodStartChange(format(start, 'yyyy-MM-dd'));
    onPayPeriodEndChange(format(end, 'yyyy-MM-dd'));
    onCheckDateChange(format(paySchedulePreset.checkDate, 'yyyy-MM-dd'));
  };

  const applyPreset = (preset: (typeof presets)[0]) => {
    const { start, end } = preset.getRange();
    onPayPeriodStartChange(format(start, 'yyyy-MM-dd'));
    onPayPeriodEndChange(format(end, 'yyyy-MM-dd'));
    // Default check date to 5 business days after period end
    const defaultCheckDate = addDays(end, 5);
    onCheckDateChange(format(defaultCheckDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Select Pay Period</h3>
        <p className="text-sm text-muted-foreground">
          Choose the dates for this payroll run. The check date is when employees will be paid.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {/* Pay Schedule Preset - Primary */}
        <Button
          variant="default"
          size={tokens.button.card}
          onClick={applyPaySchedulePreset}
        >
          <CalendarCheck className="h-3 w-3 mr-1" />
          Current Pay Period
        </Button>
        
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size={tokens.button.card}
            onClick={() => applyPreset(preset)}
          >
            <Clock className="h-3 w-3 mr-1" />
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Date Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pay Period Start */}
        <div className="space-y-2">
          <Label>Pay Period Start</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !payPeriodStart && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {payPeriodStart
                  ? formatDate(new Date(payPeriodStart), 'PPP')
                  : 'Select start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={payPeriodStart ? new Date(payPeriodStart) : undefined}
                onSelect={(date) =>
                  onPayPeriodStartChange(date ? format(date, 'yyyy-MM-dd') : null)
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Pay Period End */}
        <div className="space-y-2">
          <Label>Pay Period End</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !payPeriodEnd && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {payPeriodEnd
                  ? formatDate(new Date(payPeriodEnd), 'PPP')
                  : 'Select end date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={payPeriodEnd ? new Date(payPeriodEnd) : undefined}
                onSelect={(date) =>
                  onPayPeriodEndChange(date ? format(date, 'yyyy-MM-dd') : null)
                }
                disabled={(date) =>
                  payPeriodStart ? date < new Date(payPeriodStart) : false
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check Date */}
        <div className="space-y-2">
          <Label>Check Date (Pay Day)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !checkDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkDate
                  ? formatDate(new Date(checkDate), 'PPP')
                  : 'Select check date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkDate ? new Date(checkDate) : undefined}
                onSelect={(date) =>
                  onCheckDateChange(date ? format(date, 'yyyy-MM-dd') : null)
                }
                disabled={(date) =>
                  payPeriodEnd ? date <= new Date(payPeriodEnd) : false
                }
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary */}
      {payPeriodStart && payPeriodEnd && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Pay Period Summary</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Period:</span>{' '}
              {formatDate(new Date(payPeriodStart), 'MMM d')} -{' '}
              {formatDate(new Date(payPeriodEnd), 'MMM d, yyyy')}
            </p>
            <p>
              <span className="font-medium text-foreground">Duration:</span>{' '}
              {Math.ceil(
                (new Date(payPeriodEnd).getTime() -
                  new Date(payPeriodStart).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}{' '}
              days
            </p>
            {checkDate && (
              <p>
                <span className="font-medium text-foreground">Pay Date:</span>{' '}
                {formatDate(new Date(checkDate), 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
