import { useState } from 'react';
import { useRentPayments, useRentPaymentsSummary, useRecordPayment } from '@/hooks/useRentPayments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, DollarSign, AlertTriangle, CheckCircle2, Clock, Calendar, Receipt } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  partial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
  waived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusIcons: Record<string, React.ReactNode> = {
  paid: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  pending: <Clock className="h-4 w-4 text-amber-400" />,
  partial: <DollarSign className="h-4 w-4 text-blue-400" />,
  overdue: <AlertTriangle className="h-4 w-4 text-red-400" />,
  waived: <Receipt className="h-4 w-4 text-slate-400" />,
};

interface PaymentsTabContentProps {
  organizationId: string;
}

export function PaymentsTabContent({ organizationId }: PaymentsTabContentProps) {
  const { formatDate } = useFormatDate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().split('T')[0];
  const monthEnd = endOfMonth(now).toISOString().split('T')[0];

  const { data: payments, isLoading } = useRentPayments({
    organizationId,
    status: statusFilter,
    startDate: monthStart,
    endDate: monthEnd,
  });

  const { data: summary } = useRentPaymentsSummary(organizationId);
  const recordPayment = useRecordPayment();

  const filteredPayments = payments?.filter(payment => {
    if (!searchQuery) return true;
    return (
      payment.renter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.renter_business_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  const handleRecordPayment = () => {
    if (!selectedPayment || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    recordPayment.mutate({
      paymentId: selectedPayment.id,
      amount,
      paymentMethod,
      notes: paymentNotes || undefined,
    }, {
      onSuccess: () => {
        setSelectedPayment(null);
        setPaymentAmount('');
        setPaymentMethod('cash');
        setPaymentNotes('');
      },
    });
  };

  const { formatCurrency } = useFormatCurrency();

  return (
    <div className="space-y-6">
      {/* Month indicator */}
      <p className="text-muted-foreground">
        {formatDate(now, 'MMMM yyyy')} rent payments
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Due</p>
            <p className="text-2xl font-medium mt-1">{formatCurrency(summary?.totalDue || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Collected</p>
            <p className="text-2xl font-medium mt-1 text-emerald-400">
              {formatCurrency(summary?.totalCollected || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-medium mt-1 text-amber-400">
              {formatCurrency(summary?.totalOutstanding || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-medium mt-1 text-red-400">
              {formatCurrency(summary?.overdueAmount || 0)}
              {(summary?.overdueCount || 0) > 0 && (
                <span className="text-sm font-normal ml-2">({summary?.overdueCount} renters)</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search renters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredPayments.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'No payments match your filters'
              : 'No rent payments for this period'}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Renter</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Paid</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Balance</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/50 hover:bg-card/70">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{payment.renter_name || 'Unknown'}</p>
                          {payment.renter_business_name && (
                            <p className="text-sm text-muted-foreground">{payment.renter_business_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(new Date(payment.due_date), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium">{formatCurrency(payment.total_due)}</td>
                      <td className="p-4 text-right text-emerald-400">{formatCurrency(payment.amount_paid)}</td>
                      <td className="p-4 text-right font-medium">
                        {payment.balance > 0 ? (
                          <span className="text-amber-400">{formatCurrency(payment.balance)}</span>
                        ) : (
                          <span className="text-emerald-400">{formatCurrency(0)}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`${statusColors[payment.status]} flex items-center gap-1`}>
                            {statusIcons[payment.status]}
                            {payment.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {payment.status !== 'paid' && payment.status !== 'waived' && (
                          <Button
                            variant="outline"
                            size={tokens.button.card}
                            onClick={() => {
                              setSelectedPayment(payment);
                              setPaymentAmount(payment.balance.toString());
                            }}
                          >
                            Record Payment
                          </Button>
                        )}
                        {payment.status === 'paid' && (
                          <Button variant="ghost" size={tokens.button.inline}>
                            View Receipt
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Rent Payment</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">{selectedPayment.renter_name}</p>
                <p className="text-sm text-muted-foreground">
                  Due: {formatDate(new Date(selectedPayment.due_date), 'MMM d, yyyy')}
                </p>
                <p className="text-sm">
                  Balance: <span className="font-medium text-amber-400">{formatCurrency(selectedPayment.balance)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Check number, reference, etc."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
