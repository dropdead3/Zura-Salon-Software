import { useAuth } from '@/contexts/AuthContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useBoothRenter } from '@/hooks/useBoothRenters';
import { useRenterPaymentMethods } from '@/hooks/useRenterPaymentMethods';
import { useRenterYTDCommissions } from '@/hooks/useCommissionStatements';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  DollarSign, 
  CreditCard, 
  FileText, 
  Calendar,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RenterPortal() {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  
  // Get booth renter profile by user ID
  const { data: boothRenters } = useBoothRenter(undefined);
  const renterProfile = boothRenters; // Will need to query by user_id
  
  const { data: paymentMethods } = useRenterPaymentMethods(renterProfile?.id);
  const { data: ytdCommissions } = useRenterYTDCommissions(renterProfile?.id);

  const defaultPaymentMethod = paymentMethods?.find(pm => pm.is_default);
  const hasAutopay = paymentMethods?.some(pm => pm.autopay_enabled);

  // Mock data for rent payment status (would come from rent_payments table)
  const upcomingPayment = {
    amount: renterProfile?.active_contract?.rent_amount || 0,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 
      renterProfile?.active_contract?.due_day_of_month || 1),
    status: 'upcoming' as const,
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium">
            Welcome back, {renterProfile?.display_name || renterProfile?.full_name || 'Booth Renter'}
          </h1>
          <p className="text-muted-foreground">
            {renterProfile?.business_name && `${renterProfile.business_name} • `}
            Manage your booth rental account
          </p>
        </div>
        <Badge variant={renterProfile?.status === 'active' ? 'default' : 'secondary'}>
          {renterProfile?.status || 'Active'}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Rent Due</p>
                <p className="text-2xl font-medium">{formatCurrencyWhole(upcomingPayment.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(upcomingPayment.dueDate, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">YTD Commission</p>
                <p className="text-2xl font-medium">
                  {formatCurrencyWhole(ytdCommissions?.totalPaid || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrencyWhole(ytdCommissions?.totalPending || 0)} pending
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                {defaultPaymentMethod ? (
                  <>
                    <p className="text-lg font-medium capitalize">
                      {defaultPaymentMethod.card_brand} •••• {defaultPaymentMethod.card_last4}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {defaultPaymentMethod.card_exp_month}/{defaultPaymentMethod.card_exp_year}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-medium text-muted-foreground">Not set up</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Autopay</p>
                <p className="text-lg font-medium">
                  {hasAutopay ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasAutopay ? 'Automatic payments' : 'Manual payments'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${hasAutopay ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                {hasAutopay ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <Link to="/dashboard/renter/pay">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Pay Rent</CardTitle>
                    <CardDescription>Make a payment or view balance</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link to="/dashboard/renter/payment-methods">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription>Manage cards and autopay</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link to="/dashboard/renter/commissions">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileText className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Commission Statements</CardTitle>
                    <CardDescription>View earnings and statements</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Alerts Section */}
      {!defaultPaymentMethod && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                No payment method on file
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Add a payment method to enable automatic rent payments.
              </p>
            </div>
            <Button size={tokens.button.card} asChild>
              <Link to="/dashboard/renter/payment-methods">Add Payment Method</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest transactions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
