import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getPresetPeriods } from '@/hooks/useComparisonData';

interface Period {
  dateFrom: string;
  dateTo: string;
}

interface PeriodSelectorProps {
  periodA: Period;
  periodB: Period;
  onPeriodsChange: (periodA: Period, periodB: Period) => void;
  mode: 'time' | 'location' | 'category' | 'yoy';
}

const presets = [
  { value: 'thisMonth-lastMonth', label: 'Month vs Prior' },
  { value: 'thisWeek-lastWeek', label: 'Week vs Prior' },
  { value: 'thisYear-lastYear', label: 'Year vs Prior' },
  { value: 'q1-q1LastYear', label: 'Q1 YoY' },
  { value: 'custom', label: 'Custom' },
];

export function PeriodSelector({ periodA, periodB, onPeriodsChange, mode }: PeriodSelectorProps) {
  const { formatDate } = useFormatDate();
  const [preset, setPreset] = useState('thisMonth-lastMonth');
  const isCustom = preset === 'custom';

  useEffect(() => {
    if (preset !== 'custom') {
      const periods = getPresetPeriods(preset);
      onPeriodsChange(periods.periodA, periods.periodB);
    }
  }, [preset]);

  // For YoY mode, lock to year comparison
  useEffect(() => {
    if (mode === 'yoy') {
      setPreset('thisYear-lastYear');
    }
  }, [mode]);

  const handleDateChange = (period: 'A' | 'B', field: 'dateFrom' | 'dateTo', date: Date | undefined) => {
    if (!date) return;
    const formatted = format(date, 'yyyy-MM-dd');
    if (period === 'A') {
      onPeriodsChange({ ...periodA, [field]: formatted }, periodB);
    } else {
      onPeriodsChange(periodA, { ...periodB, [field]: formatted });
    }
  };

  const showSinglePeriod = mode === 'location';
  const fmtA = periodA.dateFrom ? `${formatDate(new Date(periodA.dateFrom), 'MMM d')} – ${formatDate(new Date(periodA.dateTo), 'MMM d, yyyy')}` : '';
  const fmtB = periodB.dateFrom ? `${formatDate(new Date(periodB.dateFrom), 'MMM d')} – ${formatDate(new Date(periodB.dateTo), 'MMM d, yyyy')}` : '';

  return (
    <div className="space-y-3">
      {/* Preset pills */}
      {!showSinglePeriod && (
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                preset === p.value
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Period summary or custom pickers */}
      {isCustom || showSinglePeriod ? (
        <div className={cn(
          'flex items-center gap-2',
          showSinglePeriod ? 'max-w-md' : ''
        )}>
          {/* Period A */}
          <div className="flex-1 rounded-lg border-l-2 border-l-primary border border-border/50 bg-muted/20 p-3">
            <p className="text-[10px] font-medium text-primary uppercase tracking-wide mb-2">
              {showSinglePeriod ? 'Period' : 'Period A'}
            </p>
            <div className="flex gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.inline} className="flex-1 justify-start text-left font-normal h-8 text-xs">
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {periodA.dateFrom ? formatDate(new Date(periodA.dateFrom), 'MMM d, yyyy') : 'Start'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodA.dateFrom ? new Date(periodA.dateFrom) : undefined}
                    onSelect={(date) => handleDateChange('A', 'dateFrom', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground self-center text-xs">–</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.inline} className="flex-1 justify-start text-left font-normal h-8 text-xs">
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {periodA.dateTo ? formatDate(new Date(periodA.dateTo), 'MMM d, yyyy') : 'End'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodA.dateTo ? new Date(periodA.dateTo) : undefined}
                    onSelect={(date) => handleDateChange('A', 'dateTo', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* VS badge + Period B */}
          {!showSinglePeriod && (
            <>
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <div className="w-px h-3 bg-border" />
                <div className="bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">
                  VS
                </div>
                <div className="w-px h-3 bg-border" />
              </div>

              <div className="flex-1 rounded-lg border-l-2 border-l-muted-foreground/30 border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Period B</p>
                <div className="flex gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size={tokens.button.inline} className="flex-1 justify-start text-left font-normal h-8 text-xs">
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {periodB.dateFrom ? formatDate(new Date(periodB.dateFrom), 'MMM d, yyyy') : 'Start'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={periodB.dateFrom ? new Date(periodB.dateFrom) : undefined}
                        onSelect={(date) => handleDateChange('B', 'dateFrom', date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground self-center text-xs">–</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size={tokens.button.inline} className="flex-1 justify-start text-left font-normal h-8 text-xs">
                        <CalendarIcon className="mr-1.5 h-3 w-3" />
                        {periodB.dateTo ? formatDate(new Date(periodB.dateTo), 'MMM d, yyyy') : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={periodB.dateTo ? new Date(periodB.dateTo) : undefined}
                        onSelect={(date) => handleDateChange('B', 'dateTo', date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Compact summary when using a preset */
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg border-l-2 border-l-primary border border-border/50 bg-muted/20 px-3 py-2">
            <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs">{fmtA}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2 rounded-lg border-l-2 border-l-muted-foreground/30 border border-border/50 bg-muted/20 px-3 py-2">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs">{fmtB}</span>
          </div>
        </div>
      )}
    </div>
  );
}
