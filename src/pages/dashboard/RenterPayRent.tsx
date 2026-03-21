import { useAuth } from '@/contexts/AuthContext';
import { useBoothRenter } from '@/hooks/useBoothRenters';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  Receipt, 
  Download, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { useRenterPaymentMethods } from '@/hooks/useRenterPaymentMethods';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { toast } from 'sonner';

export default function RenterPayRent() {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { formatCurrency } = useFormatCurrency();
  const { data: renterProfile, isLoading: profileLoading } = useBoothRenter(undefined);
  const { data: paymentMethods, isLoading: methodsLoading } = useRenterPaymentMethods(renterProfile?.id);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch outstanding invoices
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['renter-invoices', renterProfile?.id],
    queryFn: async () => {
      if (!renterProfile?.id) return [];
      const { data, error } = await supabase
        .from('rent_invoices' as any)
        .select('*')
        .eq('booth_renter_id', renterProfile.id)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!renterProfile?.id,
  });

  // Fetch payment history
  const { data: paymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['renter-payment-history', renterProfile?.id],
    queryFn: async () => {
      if (!renterProfile?.id) return [];
      const { data, error } = await supabase
        .from('rent_payments' as any)
        .select('*')
        .eq('booth_renter_id', renterProfile.id)
        .order('paid_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!renterProfile?.id,
  });

  const totalOutstanding = invoices?.reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;
  const defaultMethod = paymentMethods?.find(m => m.is_default);

  const handlePayNow = async (invoiceId: string, amount: number) => {
    const methodToUse = selectedMethodId || defaultMethod?.id;
    if (!methodToUse) {
      toast.error('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    try {
      // In production, this would call a Stripe payment edge function
      // For now, we'll simulate the payment
      const { error } = await supabase
        .from('rent_payments' as any)
        .insert({
          booth_renter_id: renterProfile?.id,
          invoice_id: invoiceId,
          amount,
          payment_method_id: methodToUse,
          status: 'completed',
          paid_at: new Date().toISOString(),
        } as any);

      if (error) throw error;

      // Update invoice status
      await supabase
        .from('rent_invoices' as any)
        .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
        .eq('id', invoiceId);

      toast.success('Payment processed successfully!');
      refetchInvoices();
    } catch (error: any) {
      toast.error('Payment failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayAll = async () => {
    if (!invoices?.length) return;
    
    for (const invoice of invoices) {
      await handlePayNow(invoice.id, invoice.amount_due);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display">PAY RENT</h1>
          <p className="text-muted-foreground text-sm">Pay outstanding balances and view payment history</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Outstanding Balance Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Outstanding Balance
              </CardTitle>
              <CardDescription>
                {invoices?.length || 0} invoice(s) pending payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !invoices?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="font-medium">You're all caught up!</p>
                  <p className="text-sm text-muted-foreground">No outstanding invoices</p>
                </div>
              ) : (
                <>
                  {/* Total Outstanding */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Outstanding</p>
                      <p className="text-2xl font-medium">{formatCurrency(totalOutstanding)}</p>
                    </div>
                    <Button 
                      onClick={handlePayAll}
                      disabled={isProcessing || !defaultMethod}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay All
                    </Button>
                  </div>

                  <Separator />

                  {/* Invoice List */}
                  <div className="space-y-3">
                    {invoices.map((invoice: any) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invoice.description || 'Rent Payment'}</p>
                            {invoice.status === 'overdue' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDate(new Date(invoice.due_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{formatCurrency(invoice.amount_due)}</p>
                          <Button 
                            size={tokens.button.card}
                            onClick={() => handlePayNow(invoice.id, invoice.amount_due)}
                            disabled={isProcessing || !defaultMethod}
                          >
                            Pay
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {methodsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : !paymentMethods?.length ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No payment methods saved</p>
                  <Button variant="outline" size={tokens.button.card} asChild>
                    <a href="/dashboard/renter/payment-methods">Add Card</a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((method: any) => (
                    <div 
                      key={method.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        (selectedMethodId || defaultMethod?.id) === method.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedMethodId(method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-medium capitalize">{method.brand}</span>
                          <span className="text-muted-foreground">•••• {method.last_four}</span>
                        </div>
                        {method.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Recent rent payments</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !paymentHistory?.length ? (
              <p className="text-center text-muted-foreground py-8">No payment history yet</p>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment: any) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Rent Payment</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(new Date(payment.paid_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
