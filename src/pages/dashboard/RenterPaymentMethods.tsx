import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRenterPaymentMethods, useAddPaymentMethod, useRemovePaymentMethod, useToggleAutopay } from '@/hooks/useRenterPaymentMethods';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Star, Check } from 'lucide-react';
import { useState } from 'react';
import { useBoothRenter } from '@/hooks/useBoothRenters';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function RenterPaymentMethods() {
  const { user } = useAuth();
  const { data: renterProfile } = useBoothRenter(undefined);
  const { data: paymentMethods, isLoading } = useRenterPaymentMethods(renterProfile?.id);
  const removePaymentMethod = useRemovePaymentMethod();
  const toggleAutopay = useToggleAutopay();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMethodForAutopay, setSelectedMethodForAutopay] = useState<string | null>(null);
  const [autopayDaysBefore, setAutopayDaysBefore] = useState(0);

  const handleRemove = async (methodId: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      await removePaymentMethod.mutateAsync(methodId);
    }
  };

  const handleToggleAutopay = async (methodId: string, currentEnabled: boolean) => {
    if (currentEnabled) {
      await toggleAutopay.mutateAsync({ methodId, enabled: false });
    } else {
      setSelectedMethodForAutopay(methodId);
    }
  };

  const confirmAutopay = async () => {
    if (selectedMethodForAutopay) {
      await toggleAutopay.mutateAsync({
        methodId: selectedMethodForAutopay,
        enabled: true,
        daysBefore: autopayDaysBefore,
      });
      setSelectedMethodForAutopay(null);
    }
  };

  const handleAddCard = () => {
    // In production, this would open Stripe Elements
    toast.info('Stripe integration required', {
      description: 'Contact support to set up payment processing.',
    });
    setIsAddOpen(false);
  };

  const getCardIcon = (brand: string | null) => {
    // Could return different icons based on card brand
    return <CreditCard className="h-8 w-8" />;
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your cards and autopay settings</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Securely add a debit or credit card for rent payments.
              </p>
              {/* Stripe Elements would go here */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Stripe Card Element</p>
                <p className="text-xs">(Integration required)</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCard}>Add Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Methods List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
            <Card key={method.id} className={method.is_default ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">
                      {getCardIcon(method.card_brand)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">
                          {method.card_brand || 'Card'} •••• {method.card_last4}
                        </p>
                        {method.is_default && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.card_exp_month}/{method.card_exp_year}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={method.autopay_enabled}
                        onCheckedChange={() => handleToggleAutopay(method.id, method.autopay_enabled)}
                        disabled={toggleAutopay.isPending}
                      />
                      <Label className="text-sm">Autopay</Label>
                    </div>
                    
                    <Button
                      size={tokens.button.inline}
                      variant="ghost"
                      onClick={() => handleRemove(method.id)}
                      disabled={removePaymentMethod.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {method.autopay_enabled && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                    <Check className="h-4 w-4 inline mr-1 text-green-500" />
                    Autopay enabled
                    {method.autopay_days_before_due > 0 && (
                      <span> - {method.autopay_days_before_due} days before due date</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No payment methods</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add a payment method to enable automatic rent payments
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Autopay Configuration Dialog */}
      <Dialog open={!!selectedMethodForAutopay} onOpenChange={() => setSelectedMethodForAutopay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Autopay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              When would you like your rent to be automatically charged?
            </p>
            <div className="space-y-2">
              <Label>Payment Timing</Label>
              <Select value={autopayDaysBefore.toString()} onValueChange={(v) => setAutopayDaysBefore(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">On the due date</SelectItem>
                  <SelectItem value="1">1 day before due date</SelectItem>
                  <SelectItem value="3">3 days before due date</SelectItem>
                  <SelectItem value="5">5 days before due date</SelectItem>
                  <SelectItem value="7">7 days before due date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMethodForAutopay(null)}>
              Cancel
            </Button>
            <Button onClick={confirmAutopay} disabled={toggleAutopay.isPending}>
              Enable Autopay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Autopay</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Your card will be automatically charged on the scheduled date each month
          </p>
          <p>
            • You'll receive an email confirmation after each successful payment
          </p>
          <p>
            • If a payment fails, you'll be notified and can retry manually
          </p>
          <p>
            • You can disable autopay at any time from this page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
