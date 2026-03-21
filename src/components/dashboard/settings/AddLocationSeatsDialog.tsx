import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Minus, Plus, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAddLocationSeats, type BusinessCapacity } from '@/hooks/useBusinessCapacity';
import { cn } from '@/lib/utils';

interface AddLocationSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capacity: BusinessCapacity & { organizationId: string | null | undefined; billingId: string | undefined };
}

export function AddLocationSeatsDialog({
  open,
  onOpenChange,
  capacity,
}: AddLocationSeatsDialogProps) {
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();
  const { addSeats, organizationId } = useAddLocationSeats();

  const addSeatsMutation = useMutation({
    mutationFn: () => addSeats(seatsToAdd),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['organization-billing', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-usage', organizationId] });
      toast.success(`Location seat${seatsToAdd > 1 ? 's' : ''} added!`, {
        description: `You now have ${result.newSeats + (capacity.locations.total - capacity.additionalLocationsPurchased)} available location seats.`,
      });
      onOpenChange(false);
      setSeatsToAdd(1);
      setAgreed(false);
    },
    onError: (error) => {
      toast.error('Failed to add location seats', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const currentAddOnCost = capacity.additionalLocationsPurchased * capacity.perLocationFee;
  const newAddOnCost = (capacity.additionalLocationsPurchased + seatsToAdd) * capacity.perLocationFee;
  const costIncrease = seatsToAdd * capacity.perLocationFee;
  const currentTotalCost = capacity.basePlanPrice + currentAddOnCost;
  const newTotalCost = capacity.basePlanPrice + newAddOnCost;

  const baseLocations = capacity.locations.total - capacity.additionalLocationsPurchased;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add Location Seats</DialogTitle>
              <DialogDescription>
                Expand your capacity with additional location seats
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Plan Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium">{capacity.planName || 'Standard'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Included locations</span>
              <span>{baseLocations}</span>
            </div>
            {capacity.additionalLocationsPurchased > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Additional seats</span>
                <span>
                  {capacity.additionalLocationsPurchased} × {formatCurrency(capacity.perLocationFee)}/mo = {formatCurrency(currentAddOnCost)}/mo
                </span>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <Label>How many seats to add?</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSeatsToAdd(Math.max(1, seatsToAdd - 1))}
                disabled={seatsToAdd <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-3xl font-medium w-16 text-center">{seatsToAdd}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSeatsToAdd(seatsToAdd + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {formatCurrency(capacity.perLocationFee)} per seat per month
            </p>
          </div>

          {/* New Cost Breakdown */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              New Monthly Cost
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base plan</span>
                <span>{formatCurrency(capacity.basePlanPrice)}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Location add-ons</span>
                <span className="flex items-center gap-2">
                  {formatCurrency(newAddOnCost)}/mo
                  {costIncrease > 0 && (
                    <span className="text-xs text-primary">
                      (+{formatCurrency(costIncrease)})
                    </span>
                  )}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(newTotalCost)}/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="agree" className="text-sm font-normal cursor-pointer">
                I agree to the updated billing terms. My monthly cost will increase by{' '}
                <span className="font-medium">{formatCurrency(costIncrease)}</span>.
              </Label>
            </div>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              The additional cost will be prorated for the current billing period and reflected in your next invoice.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addSeatsMutation.mutate()}
            disabled={!agreed || addSeatsMutation.isPending}
          >
            {addSeatsMutation.isPending ? 'Adding...' : `Confirm & Add ${seatsToAdd} Seat${seatsToAdd > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
