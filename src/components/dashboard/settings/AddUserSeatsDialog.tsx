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
import { Minus, Plus, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAddUserSeats, type BusinessCapacity } from '@/hooks/useBusinessCapacity';

interface AddUserSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capacity: BusinessCapacity & { organizationId: string | null | undefined; billingId: string | undefined };
}

export function AddUserSeatsDialog({
  open,
  onOpenChange,
  capacity,
}: AddUserSeatsDialogProps) {
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();
  const { addSeats, organizationId } = useAddUserSeats();

  const addSeatsMutation = useMutation({
    mutationFn: () => addSeats(seatsToAdd),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['organization-billing', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-usage', organizationId] });
      toast.success(`User seat${seatsToAdd > 1 ? 's' : ''} added!`, {
        description: `You now have ${result.newSeats + (capacity.users.total - capacity.additionalUsersPurchased)} available user seats.`,
      });
      onOpenChange(false);
      setSeatsToAdd(1);
      setAgreed(false);
    },
    onError: (error) => {
      toast.error('Failed to add user seats', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currentAddOnCost = capacity.additionalUsersPurchased * capacity.perUserFee;
  const newAddOnCost = (capacity.additionalUsersPurchased + seatsToAdd) * capacity.perUserFee;
  const costIncrease = seatsToAdd * capacity.perUserFee;
  const currentTotalCost = capacity.basePlanPrice + currentAddOnCost + (capacity.additionalLocationsPurchased * capacity.perLocationFee);
  const newTotalCost = currentTotalCost + costIncrease;

  const baseUsers = capacity.users.total - capacity.additionalUsersPurchased;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add User Seats</DialogTitle>
              <DialogDescription>
                Expand your team capacity with additional user seats
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Plan Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium">{capacity.planName || 'Standard')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Included users</span>
              <span>{baseUsers}</span>
            </div>
            {capacity.additionalUsersPurchased > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Additional seats</span>
                <span>
                  {capacity.additionalUsersPurchased} × {formatCurrency(capacity.perUserFee)}/mo = {formatCurrency(currentAddOnCost)}/mo
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
              {formatCurrency(capacity.perUserFee)} per seat per month
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
                <span>User add-ons</span>
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
              id="agree-users"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="agree-users" className="text-sm font-normal cursor-pointer">
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
