import { useState } from 'react';
import { useCreateRentChange } from '@/hooks/useScheduledRentChanges';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addMonths } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { CalendarIcon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface RentIncreaseDialogProps {
  contractId: string;
  currentRent: number;
  renterName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentIncreaseDialog({ 
  contractId, 
  currentRent, 
  renterName, 
  open, 
  onOpenChange 
}: RentIncreaseDialogProps) {
  const createRentChange = useCreateRentChange();
  const { formatDate } = useFormatDate();
  const { formatCurrency, currency } = useFormatCurrency();
  
  const [newRent, setNewRent] = useState<number>(currentRent);
  const [effectiveDate, setEffectiveDate] = useState<Date>(addMonths(new Date(), 1));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  const increaseAmount = newRent - currentRent;
  const increasePercent = currentRent > 0 ? ((increaseAmount / currentRent) * 100).toFixed(1) : 0;

  const handleSubmit = async () => {
    await createRentChange.mutateAsync({
      contract_id: contractId,
      current_rent_amount: currentRent,
      new_rent_amount: newRent,
      effective_date: format(effectiveDate, 'yyyy-MM-dd'),
      reason,
      notes,
    });
    
    // Send notification email if enabled
    if (sendNotification) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-rent-change`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              contract_id: contractId,
              current_rent: currentRent,
              new_rent: newRent,
              effective_date: format(effectiveDate, 'yyyy-MM-dd'),
              reason,
            }),
          }
        );
        
        if (!response.ok) {
          console.error('Failed to send rent change notification');
        }
      } catch (error) {
        console.error('Error sending rent change notification:', error);
      }
    }
    
    onOpenChange(false);
    
    // Reset form
    setNewRent(currentRent);
    setEffectiveDate(addMonths(new Date(), 1));
    setReason('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Schedule Rent Increase
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{renterName}</p>
            <p className="text-xs text-muted-foreground">
              Current rent: {formatCurrency(currentRent)}/month
            </p>
          </div>

          <div className="space-y-2">
            <Label>New Rent Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">{currency}</span>
              <Input
                type="number"
                step="0.01"
                className="pl-7"
                value={newRent}
                onChange={(e) => setNewRent(parseFloat(e.target.value) || 0)}
              />
            </div>
            {increaseAmount !== 0 && (
              <p className={cn(
                "text-xs",
                increaseAmount > 0 ? "text-green-600" : "text-red-600"
              )}>
                {increaseAmount > 0 ? '+' : ''}{formatCurrency(increaseAmount)} ({increasePercent}%)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !effectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDate ? formatDate(effectiveDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={(date) => date && setEffectiveDate(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              The new rent will apply starting from this date
            </p>
          </div>

          <div className="space-y-2">
            <Label>Reason for Increase</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Annual adjustment, Market rate increase"
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Send Notification</Label>
              <p className="text-xs text-muted-foreground">
                Notify the renter via email
              </p>
            </div>
            <Switch
              checked={sendNotification}
              onCheckedChange={setSendNotification}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createRentChange.isPending || newRent === currentRent}
          >
            Schedule Increase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
