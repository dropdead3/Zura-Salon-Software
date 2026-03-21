import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarClock, CalendarIcon, Loader2 } from 'lucide-react';
import { usePaySchedule, PayScheduleType } from '@/hooks/usePaySchedule';
import { cn } from '@/lib/utils';

const SCHEDULE_TYPE_LABELS: Record<PayScheduleType, string> = {
  semi_monthly: 'Semi-Monthly',
  bi_weekly: 'Bi-Weekly',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export function PayScheduleCard() {
  const { formatDate } = useFormatDate();
  const { 
    settings, 
    isLoading, 
    updateSettings, 
    isUpdating,
    nextPayDay,
    currentPeriod,
    effectiveSettings,
  } = usePaySchedule();
  
  // Local state for form
  const [scheduleType, setScheduleType] = useState<PayScheduleType>('semi_monthly');
  const [semiMonthlyFirst, setSemiMonthlyFirst] = useState(1);
  const [semiMonthlySecond, setSemiMonthlySecond] = useState(15);
  const [biWeeklyDay, setBiWeeklyDay] = useState(5);
  const [biWeeklyAnchor, setBiWeeklyAnchor] = useState<Date | undefined>();
  const [weeklyDay, setWeeklyDay] = useState(5);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [daysUntilCheck, setDaysUntilCheck] = useState(5);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sync settings to form when loaded
  useEffect(() => {
    if (effectiveSettings) {
      setScheduleType(effectiveSettings.pay_schedule_type);
      setSemiMonthlyFirst(effectiveSettings.semi_monthly_first_day);
      setSemiMonthlySecond(effectiveSettings.semi_monthly_second_day);
      setBiWeeklyDay(effectiveSettings.bi_weekly_day_of_week);
      setBiWeeklyAnchor(
        effectiveSettings.bi_weekly_start_date 
          ? new Date(effectiveSettings.bi_weekly_start_date) 
          : undefined
      );
      setWeeklyDay(effectiveSettings.weekly_day_of_week);
      setMonthlyDay(effectiveSettings.monthly_pay_day);
      setDaysUntilCheck(effectiveSettings.days_until_check);
      setHasChanges(false);
    }
  }, [effectiveSettings]);
  
  const handleSave = () => {
    updateSettings({
      pay_schedule_type: scheduleType,
      semi_monthly_first_day: semiMonthlyFirst,
      semi_monthly_second_day: semiMonthlySecond,
      bi_weekly_day_of_week: biWeeklyDay,
      bi_weekly_start_date: biWeeklyAnchor ? format(biWeeklyAnchor, 'yyyy-MM-dd') : null,
      weekly_day_of_week: weeklyDay,
      monthly_pay_day: monthlyDay,
      days_until_check: daysUntilCheck,
    });
  };
  
  const markChanged = () => setHasChanges(true);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Pay Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Pay Schedule
        </CardTitle>
        <CardDescription>
          Configure how often employees are paid. This affects payroll calculations and analytics filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Type */}
        <div className="space-y-2">
          <Label>Schedule Type</Label>
          <Select 
            value={scheduleType} 
            onValueChange={(v) => { setScheduleType(v as PayScheduleType); markChanged(); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SCHEDULE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Semi-Monthly Options */}
        {scheduleType === 'semi_monthly' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Pay Day</Label>
              <Select 
                value={String(semiMonthlyFirst)} 
                onValueChange={(v) => { setSemiMonthlyFirst(Number(v)); markChanged(); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OF_MONTH_OPTIONS.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}{getOrdinalSuffix(day)} of the month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Second Pay Day</Label>
              <Select 
                value={String(semiMonthlySecond)} 
                onValueChange={(v) => { setSemiMonthlySecond(Number(v)); markChanged(); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OF_MONTH_OPTIONS.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}{getOrdinalSuffix(day)} of the month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {/* Bi-Weekly Options */}
        {scheduleType === 'bi_weekly' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pay Day</Label>
              <Select 
                value={String(biWeeklyDay)} 
                onValueChange={(v) => { setBiWeeklyDay(Number(v)); markChanged(); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OF_WEEK_LABELS.map((label, index) => (
                    <SelectItem key={index} value={String(index)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anchor Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !biWeeklyAnchor && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {biWeeklyAnchor 
                      ? formatDate(biWeeklyAnchor, 'PPP') 
                      : 'Select a pay week Friday'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={biWeeklyAnchor}
                    onSelect={(date) => { setBiWeeklyAnchor(date); markChanged(); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Pick any Friday that falls on a pay week
              </p>
            </div>
          </div>
        )}
        
        {/* Weekly Options */}
        {scheduleType === 'weekly' && (
          <div className="space-y-2">
            <Label>Pay Day</Label>
            <Select 
              value={String(weeklyDay)} 
              onValueChange={(v) => { setWeeklyDay(Number(v)); markChanged(); }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_WEEK_LABELS.map((label, index) => (
                  <SelectItem key={index} value={String(index)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Monthly Options */}
        {scheduleType === 'monthly' && (
          <div className="space-y-2">
            <Label>Pay Day</Label>
            <Select 
              value={String(monthlyDay)} 
              onValueChange={(v) => { setMonthlyDay(Number(v)); markChanged(); }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_MONTH_OPTIONS.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}{getOrdinalSuffix(day)} of the month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Days Until Check */}
        <div className="space-y-2">
          <Label>Days Until Check</Label>
          <Select 
            value={String(daysUntilCheck)} 
            onValueChange={(v) => { setDaysUntilCheck(Number(v)); markChanged(); }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5, 6, 7, 10, 14].map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {days} day{days !== 1 ? 's' : ''} after period end
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How many days after the pay period ends until checks are issued
          </p>
        </div>
        
        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Schedule Summary</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Next Pay Day:</span>{' '}
              {formatDate(nextPayDay, 'EEEE, MMMM d, yyyy')}
            </p>
            <p>
              <span className="font-medium text-foreground">Current Period:</span>{' '}
              {formatDate(currentPeriod.periodStart, 'MMM d')} – {formatDate(currentPeriod.periodEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        
        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
