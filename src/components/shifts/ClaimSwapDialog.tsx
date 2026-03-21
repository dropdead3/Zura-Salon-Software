import { useState } from 'react';
import { format } from 'date-fns';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, Clock, MapPin, ArrowLeftRight, 
  ArrowDown, Gift, Loader2, CheckCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClaimSwap } from '@/hooks/useShiftSwaps';
import type { ShiftSwap } from '@/hooks/useShiftSwaps';

interface ClaimSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swap: ShiftSwap | null;
}

const swapTypeConfig = {
  swap: {
    icon: ArrowLeftRight,
    label: 'Swap',
    color: 'bg-blue-500/10 text-blue-600',
  },
  cover: {
    icon: ArrowDown,
    label: 'Cover',
    color: 'bg-purple-500/10 text-purple-600',
  },
  giveaway: {
    icon: Gift,
    label: 'Giveaway',
    color: 'bg-green-500/10 text-green-600',
  },
};

export function ClaimSwapDialog({ open, onOpenChange, swap }: ClaimSwapDialogProps) {
  const { formatDate } = useFormatDate();
  const [offerDate, setOfferDate] = useState<Date | undefined>(undefined);
  const [offerStartTime, setOfferStartTime] = useState('09:00');
  const [offerEndTime, setOfferEndTime] = useState('17:00');

  const claimSwap = useClaimSwap();

  if (!swap) return null;

  const typeConfig = swapTypeConfig[swap.swap_type];
  const TypeIcon = typeConfig.icon;
  const isSwapType = swap.swap_type === 'swap';

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return formatDate(date, 'h:mm a');
  };

  const handleSubmit = async () => {
    await claimSwap.mutateAsync({
      swapId: swap.id,
      claimerDate: isSwapType && offerDate ? format(offerDate, 'yyyy-MM-dd') : undefined,
      claimerStartTime: isSwapType ? offerStartTime : undefined,
      claimerEndTime: isSwapType ? offerEndTime : undefined,
    });

    // Reset form
    setOfferDate(undefined);
    setOfferStartTime('09:00');
    setOfferEndTime('17:00');
    onOpenChange(false);
  };

  const requesterName = swap.requester?.display_name || swap.requester?.full_name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Claim This Shift</DialogTitle>
          <DialogDescription>
            {isSwapType
              ? 'Offer one of your shifts in exchange'
              : 'Confirm you want to take this shift'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Original Shift Details */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">{requesterName}'s Shift</p>
              <Badge className={typeConfig.color}>
                <TypeIcon className="w-3 h-3 mr-1" />
                {typeConfig.label}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(new Date(swap.original_date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {formatTime(swap.original_start_time)} - {formatTime(swap.original_end_time)}
                </span>
              </div>
              {swap.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{swap.location.name}</span>
                </div>
              )}
            </div>

            {swap.reason && (
              <p className="text-sm text-muted-foreground mt-3 italic">
                "{swap.reason}"
              </p>
            )}
          </Card>

          {/* Swap: Offer your shift */}
          {isSwapType && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                  <Label className="text-base font-medium">Your Shift to Offer</Label>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !offerDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {offerDate ? formatDate(offerDate, 'EEEE, MMMM d, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={offerDate}
                        onSelect={setOfferDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offer-start">Start Time</Label>
                    <Input
                      id="offer-start"
                      type="time"
                      value={offerStartTime}
                      onChange={(e) => setOfferStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offer-end">End Time</Label>
                    <Input
                      id="offer-end"
                      type="time"
                      value={offerEndTime}
                      onChange={(e) => setOfferEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Cover/Giveaway: Confirmation */}
          {!isSwapType && (
            <Card className="p-4 bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Ready to claim</p>
                  <p className="text-xs text-muted-foreground">
                    You'll take {requesterName}'s shift on {formatDate(new Date(swap.original_date), 'MMM d')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Info note */}
          <p className="text-xs text-muted-foreground">
            Once you claim this shift, it will be sent to a manager for approval before it's finalized.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={claimSwap.isPending || (isSwapType && !offerDate)}
          >
            {claimSwap.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Claim Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
