import { useState, useMemo } from 'react';
import { addDays, addMonths, format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Repeat, CalendarDays } from 'lucide-react';

export type RecurrenceFrequency =
  | 'weekly'
  | 'every_2_weeks'
  | 'every_4_weeks'
  | 'every_6_weeks'
  | 'every_8_weeks'
  | 'monthly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  occurrences: number;
}

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  startDate: Date;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string; days: number | 'month' }[] = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'every_2_weeks', label: 'Every 2 weeks', days: 14 },
  { value: 'every_4_weeks', label: 'Every 4 weeks', days: 28 },
  { value: 'every_6_weeks', label: 'Every 6 weeks', days: 42 },
  { value: 'every_8_weeks', label: 'Every 8 weeks', days: 56 },
  { value: 'monthly', label: 'Monthly', days: 'month' },
];

function calculateEndDate(startDate: Date, frequency: RecurrenceFrequency, occurrences: number): Date {
  const option = FREQUENCY_OPTIONS.find(o => o.value === frequency)!;
  if (option.days === 'month') {
    return addMonths(startDate, occurrences - 1);
  }
  return addDays(startDate, (option.days as number) * (occurrences - 1));
}

export function RecurrenceSelector({ value, onChange, startDate }: RecurrenceSelectorProps) {
  const enabled = value !== null;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange({ frequency: 'every_4_weeks', occurrences: 6 });
    } else {
      onChange(null);
    }
  };

  const endDate = useMemo(() => {
    if (!value) return null;
    return calculateEndDate(startDate, value.frequency, value.occurrences);
  }, [value, startDate]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="recurrence-toggle" className="text-sm font-medium cursor-pointer">
            Repeat this appointment
          </Label>
        </div>
        <Switch
          id="recurrence-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && value && (
        <div className="space-y-3 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Frequency */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Frequency</Label>
            <Select
              value={value.frequency}
              onValueChange={(f) => onChange({ ...value, frequency: f as RecurrenceFrequency })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Occurrences */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Number of appointments</Label>
            <Input
              type="number"
              min={2}
              max={26}
              value={value.occurrences}
              onChange={(e) => {
                const v = Math.min(26, Math.max(2, parseInt(e.target.value) || 2));
                onChange({ ...value, occurrences: v });
              }}
              className="h-9"
            />
          </div>

          {/* Preview */}
          {endDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>
                Creates {value.occurrences} appointments through {format(endDate, 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
