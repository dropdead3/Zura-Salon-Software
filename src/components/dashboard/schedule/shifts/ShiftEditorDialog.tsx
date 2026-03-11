import { useState, useMemo } from 'react';
import { format, addWeeks } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import {
  useCreateShift,
  useUpdateShift,
  useCreateRecurringShifts,
  checkShiftConflict,
  type StaffShift,
  type ShiftRoleContext,
  type RecurrencePattern,
} from '@/hooks/useStaffShifts';

const ROLE_OPTIONS: { value: ShiftRoleContext; label: string }[] = [
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'other', label: 'Other' },
];

const RECURRENCE_OPTIONS: { value: RecurrencePattern; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'custom', label: 'Custom days' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_SLOTS: string[] = [];
for (let h = 6; h < 22; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

interface ShiftEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMembers: { user_id: string; display_name: string | null; full_name: string | null }[];
  locationId?: string;
  existingShift?: StaffShift | null;
  defaultDate?: Date;
  existingShifts?: StaffShift[];
}

export function ShiftEditorDialog({
  open,
  onOpenChange,
  staffMembers,
  locationId,
  existingShift,
  defaultDate,
  existingShifts = [],
}: ShiftEditorDialogProps) {
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const createRecurring = useCreateRecurringShifts();

  const [userId, setUserId] = useState(existingShift?.user_id || '');
  const [shiftDate, setShiftDate] = useState<Date>(
    existingShift ? new Date(existingShift.shift_date + 'T12:00:00') : defaultDate || new Date()
  );
  const [startTime, setStartTime] = useState(existingShift?.start_time?.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(existingShift?.end_time?.slice(0, 5) || '17:00');
  const [roleContext, setRoleContext] = useState<ShiftRoleContext>(existingShift?.role_context || 'front_desk');
  const [notes, setNotes] = useState(existingShift?.notes || '');

  // Recurrence state (only for new shifts)
  const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
  const [untilDate, setUntilDate] = useState<Date>(addWeeks(defaultDate || new Date(), 4));
  const [customDays, setCustomDays] = useState<number[]>([]);

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // Conflict detection
  const conflict = useMemo(() => {
    if (!userId) return null;
    const dateStr = format(shiftDate, 'yyyy-MM-dd');
    return checkShiftConflict(existingShifts, userId, dateStr, startTime, endTime, existingShift?.id);
  }, [userId, shiftDate, startTime, endTime, existingShifts, existingShift?.id]);

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = () => {
    const dateStr = format(shiftDate, 'yyyy-MM-dd');

    if (existingShift) {
      updateShift.mutate({
        shiftId: existingShift.id,
        updates: {
          user_id: userId,
          shift_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          role_context: roleContext,
          notes: notes || null,
        },
      }, { onSuccess: () => onOpenChange(false) });
    } else if (recurrence !== 'none') {
      createRecurring.mutate({
        user_id: userId,
        location_id: locationId || null,
        shift_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        role_context: roleContext,
        notes: notes || null,
        pattern: recurrence,
        customDays: recurrence === 'custom' ? customDays : undefined,
        untilDate: format(untilDate, 'yyyy-MM-dd'),
      }, { onSuccess: () => onOpenChange(false) });
    } else {
      if (!userId) return;
      createShift.mutate({
        user_id: userId,
        location_id: locationId || null,
        shift_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        role_context: roleContext,
        notes: notes || null,
      }, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createShift.isPending || updateShift.isPending || createRecurring.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">
            {existingShift ? 'Edit Shift' : 'Create Shift'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Staff member */}
          <div>
            <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Staff Member</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="font-sans">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id} className="font-sans">
                    {formatDisplayName(m.full_name, m.display_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Role</label>
            <Select value={roleContext} onValueChange={(v) => setRoleContext(v as ShiftRoleContext)}>
              <SelectTrigger className="font-sans">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value} className="font-sans">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-sans', !shiftDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(shiftDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={shiftDate} onSelect={(d) => d && setShiftDate(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Start</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t} className="font-sans">{formatTime12(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-sans text-muted-foreground mb-1.5 block">End</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t} className="font-sans">{formatTime12(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conflict Warning */}
          {conflict && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs font-sans text-destructive">
                Overlapping shift exists: {formatTime12(conflict.start_time.slice(0, 5))}–{formatTime12(conflict.end_time.slice(0, 5))}
              </p>
            </div>
          )}

          {/* Recurrence (new shifts only) */}
          {!existingShift && (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Repeat</label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrencePattern)}>
                  <SelectTrigger className="font-sans">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value} className="font-sans">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom days picker */}
              {recurrence === 'custom' && (
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Days of week</label>
                  <div className="flex gap-1">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleCustomDay(idx)}
                        className={cn(
                          'h-8 w-9 rounded-md text-xs font-sans transition-colors border',
                          customDays.includes(idx)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Until date */}
              {recurrence !== 'none' && (
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Until</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-sans')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(untilDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={untilDate}
                        onSelect={(d) => d && setUntilDate(d)}
                        disabled={(d) => d <= shiftDate}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-sans text-muted-foreground mb-1.5 block">Notes</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="font-sans"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-sans">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!userId || isPending || (recurrence === 'custom' && customDays.length === 0)}
            className="font-sans"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {existingShift ? 'Save Changes' : recurrence !== 'none' ? 'Create Series' : 'Create Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
