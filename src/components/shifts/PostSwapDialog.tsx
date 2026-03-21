import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationSelect } from '@/components/ui/location-select';
import { ArrowLeftRight, ArrowDown, Gift, CalendarIcon, Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useCreateSwap } from '@/hooks/useShiftSwaps';

interface PostSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostSwapDialog({ open, onOpenChange }: PostSwapDialogProps) {
  const { formatDate } = useFormatDate();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [locationId, setLocationId] = useState<string>('');
  const [swapType, setSwapType] = useState<'swap' | 'cover' | 'giveaway'>('cover');
  const [reason, setReason] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(3);

  const createSwap = useCreateSwap();

  const handleSubmit = async () => {
    if (!date) return;

    await createSwap.mutateAsync({
      original_date: format(date, 'yyyy-MM-dd'),
      original_start_time: startTime,
      original_end_time: endTime,
      location_id: locationId || undefined,
      swap_type: swapType,
      reason: reason || undefined,
      expires_at: expiresInDays
        ? addDays(new Date(), expiresInDays).toISOString()
        : undefined,
    });

    // Reset form
    setDate(undefined);
    setStartTime('09:00');
    setEndTime('17:00');
    setLocationId('');
    setSwapType('cover');
    setReason('');
    setExpiresInDays(3);
    onOpenChange(false);
  };

  const swapTypes = [
    {
      value: 'swap' as const,
      icon: ArrowLeftRight,
      label: 'Swap',
      description: 'Trade shifts with someone',
    },
    {
      value: 'cover' as const,
      icon: ArrowDown,
      label: 'Cover',
      description: 'Need someone to cover my shift',
    },
    {
      value: 'giveaway' as const,
      icon: Gift,
      label: 'Giveaway',
      description: 'Give away this shift completely',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Post a Shift</DialogTitle>
          <DialogDescription>
            Post a shift to swap, get covered, or give away
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Swap Type Selection */}
          <div className="space-y-2">
            <Label>What do you need?</Label>
            <RadioGroup
              value={swapType}
              onValueChange={(v) => setSwapType(v as typeof swapType)}
              className="grid grid-cols-3 gap-2"
            >
              {swapTypes.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    swapType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={type.value} className="sr-only" />
                  <type.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{type.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Shift Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date, 'EEEE, MMMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <LocationSelect
              value={locationId}
              onValueChange={setLocationId}
              includeAll={false}
              placeholder="Select location"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Let your team know why you need this covered..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label>Auto-expire after</Label>
            <div className="flex gap-2">
              {[1, 3, 7].map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant={expiresInDays === days ? 'default' : 'outline'}
                  size={tokens.button.card}
                  onClick={() => setExpiresInDays(days)}
                >
                  {days} day{days > 1 ? 's' : ''}
                </Button>
              ))}
              <Button
                type="button"
                variant={expiresInDays === undefined ? 'default' : 'outline'}
                size={tokens.button.card}
                onClick={() => setExpiresInDays(undefined)}
              >
                Never
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!date || createSwap.isPending}
          >
            {createSwap.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
