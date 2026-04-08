import { useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tokens } from '@/lib/design-tokens';
import { Receipt, Calendar, Gift, Tag, Ticket, ArrowUpRight, BarChart3, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { AppointmentsList } from '@/components/dashboard/appointments-hub/AppointmentsList';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { PromoRedemptionList } from '@/components/dashboard/appointments-hub/PromoRedemptionList';
import { useTransactionPromoDetails } from '@/hooks/useTransactionPromoDetails';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

// Lazy imports for existing transaction/gift card components
import { TransactionList } from '@/components/dashboard/transactions/TransactionList';
import { RefundDialog } from '@/components/dashboard/transactions/RefundDialog';
import { IssueCreditsDialog } from '@/components/dashboard/transactions/IssueCreditsDialog';
import { GiftCardManager } from '@/components/dashboard/transactions/GiftCardManager';
import { useTransactions, type TransactionFilters } from '@/hooks/useTransactions';
import { useRefundRecords } from '@/hooks/useRefunds';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card } from '@/components/ui/card';
import { BentoGrid } from '@/components/ui/bento-grid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/hooks/useLocations';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { CreditCard, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PageExplainer } from '@/components/ui/PageExplainer';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'all';

function TransactionsTab({ search }: { search: string }) {
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [locationId, setLocationId] = useState('all');
  const [itemType, setItemType] = useState('all');
  const [showPendingRefunds, setShowPendingRefunds] = useState(false);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);
  const [showPromoHistory, setShowPromoHistory] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const { data: locations = [] } = useLocations();
  const { formatCurrency } = useFormatCurrency();
  const { data: pendingRefunds = [] } = useRefundRecords({ status: 'pending' });
  const { effectiveOrganization } = useOrganizationContext();

  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { startDate: format(startOfDay(now), 'yyyy-MM-dd'), endDate: format(endOfDay(now), 'yyyy-MM-dd') };
      case 'this_week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      case 'this_month':
        return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      default:
        return {};
    }
  };

  const filters: TransactionFilters = {
    ...getDateRange(),
    locationId: locationId !== 'all' ? locationId : undefined,
    itemType: itemType !== 'all' ? itemType : undefined,
    clientSearch: search || undefined,
    limit: 500,
  };

  const { data: transactions = [], isLoading, refetch } = useTransactions(filters);

  const dateRange = getDateRange();
  const { data: promoRedemptions = [], isLoading: promoLoading } = useTransactionPromoDetails({
    organizationId: effectiveOrganization?.id,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Apply client-side discounted-only filter
  const filteredTransactions = showDiscountedOnly
    ? transactions.filter(t => (Number(t.discount) || 0) > 0)
    : transactions;

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0) + (Number(t.tax_amount) || 0), 0);
  const serviceCount = filteredTransactions.filter(t => (t.item_type || '').toLowerCase() === 'service').length;
  const productCount = filteredTransactions.filter(t => (t.item_type || '').toLowerCase() === 'product').length;
  const refundedCount = filteredTransactions.filter(t => t.refund_status).length;
  const totalDiscounts = transactions.reduce((sum, t) => sum + (Number(t.discount) || 0), 0);
  const discountedCount = transactions.filter(t => (Number(t.discount) || 0) > 0).length;

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Client', 'Type', 'Item', 'Discount', 'Amount', 'Promo Code', 'Promotion Name', 'Refund Status'];
    const rows = filteredTransactions.map((t: any) => [
      t.transaction_date || '',
      t.client_name || '',
      t.item_type || '',
      t.item_name || '',
      t.discount ?? '',
      t.total_amount ?? '',
      t.promo_code || '',
      t.promotion_name || '',
      t.refund_status || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <BentoGrid maxPerRow={5} gap="gap-4">
        <Card className={cn(tokens.card.wrapper, 'p-4')}>
          <p className={tokens.body.muted}>Total Revenue</p>
          <p className={tokens.stat.large}><BlurredAmount>{formatCurrency(totalRevenue)}</BlurredAmount></p>
        </Card>
        <Card className={cn(tokens.card.wrapper, 'p-4')}>
          <p className={tokens.body.muted}>Services</p>
          <p className={tokens.stat.large}>{serviceCount}</p>
        </Card>
        <Card className={cn(tokens.card.wrapper, 'p-4')}>
          <p className={tokens.body.muted}>Products</p>
          <p className={tokens.stat.large}>{productCount}</p>
        </Card>
        <Card className={cn(tokens.card.wrapper, 'p-4')}>
          <p className={tokens.body.muted}>Discounts Given</p>
          <p className={cn(tokens.stat.large, totalDiscounts > 0 && 'text-amber-600')}>
            <BlurredAmount>{formatCurrency(totalDiscounts)}</BlurredAmount>
          </p>
          {discountedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{discountedCount} item{discountedCount !== 1 ? 's' : ''}</p>
          )}
        </Card>
        <Card className={cn(tokens.card.wrapper, 'p-4')}>
          <p className={tokens.body.muted}>Refunded</p>
          <p className={cn(tokens.stat.large, refundedCount > 0 && 'text-amber-600')}>{refundedCount}</p>
        </Card>
      </BentoGrid>

      {/* Filters — bare row, no card wrapper */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={itemType} onValueChange={setItemType}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="service">Services</SelectItem>
            <SelectItem value="product">Products</SelectItem>
          </SelectContent>
        </Select>

        {/* Discounted Only toggle */}
        <Button
          variant={showDiscountedOnly ? 'default' : 'outline'}
          size={tokens.button.card}
          onClick={() => setShowDiscountedOnly(!showDiscountedOnly)}
          className="gap-2"
        >
          <Tag className="w-4 h-4" />
          Discounted Only
          {discountedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {discountedCount}
            </Badge>
          )}
        </Button>

        {/* Pending Refunds toggle */}
        {pendingRefunds.length > 0 && (
          <Button
            variant={showPendingRefunds ? 'default' : 'outline'}
            size={tokens.button.card}
            onClick={() => setShowPendingRefunds(!showPendingRefunds)}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Pending Refunds
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {pendingRefunds.length}
            </Badge>
          </Button>
        )}

        {/* Promo History toggle */}
        <Button
          variant={showPromoHistory ? 'default' : 'outline'}
          size={tokens.button.card}
          onClick={() => setShowPromoHistory(!showPromoHistory)}
          className="gap-2"
        >
          <Ticket className="w-4 h-4" />
          Promo History
        </Button>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size={tokens.button.card} onClick={handleExportCSV} disabled={filteredTransactions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size={tokens.button.card} onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size={tokens.button.card} onClick={() => setIsCreditsOpen(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Issue Credits
          </Button>
        </div>
      </div>

      {/* Pending Refunds List */}
      {showPendingRefunds && pendingRefunds.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <div className="p-4 space-y-2">
            <h4 className={tokens.heading.subsection}>Refunds Awaiting Approval</h4>
            {pendingRefunds.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className={tokens.body.emphasis}>{r.original_item_name || 'Transaction'}</p>
                  <p className="text-xs text-muted-foreground">{r.reason || 'No reason provided'}</p>
                </div>
                <BlurredAmount>
                  <span className={tokens.body.emphasis}>${r.refund_amount}</span>
                </BlurredAmount>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Promo Redemption History */}
      {showPromoHistory && (
        <div className="space-y-2">
          <h4 className={tokens.heading.subsection}>Promotion Redemption History</h4>
          <PromoRedemptionList redemptions={promoRedemptions} isLoading={promoLoading} />
        </div>
      )}

      <TransactionList
        transactions={filteredTransactions}
        isLoading={isLoading}
        onRefund={(t) => { setSelectedTransaction(t); setIsRefundOpen(true); }}
      />

      <RefundDialog transaction={selectedTransaction} open={isRefundOpen} onOpenChange={setIsRefundOpen} />
      <IssueCreditsDialog open={isCreditsOpen} onOpenChange={setIsCreditsOpen} />
    </div>
  );
}

export default function AppointmentsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'appointments';
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const handleTabChange = useCallback((tab: string) => {
    const params: Record<string, string> = { tab };
    if (search) params.search = search;
    setSearchParams(params, { replace: true });
  }, [setSearchParams, search]);

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader
          title="Appointments & Transactions"
          description="View, filter, and manage individual appointment records, transactions, and gift cards. Use batch actions to update statuses or export data."
        />
        <PageExplainer pageId="appointments-hub" />

        {/* Analytics quick-links callout */}
        <Collapsible defaultOpen>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60 overflow-hidden">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 pb-3 cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className={tokens.card.iconBox}>
                  <BarChart3 className={tokens.card.icon} />
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="font-display text-sm tracking-wide text-foreground">LOOKING FOR ANALYTICS?</h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">Jump to detailed breakdowns and trend reports.</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 pb-4">
                {[
                  { label: 'Appointment Analytics', to: '/dashboard/admin/analytics?tab=operations&subtab=appointments', icon: Calendar },
                  { label: 'Booking Pipeline', to: '/dashboard/admin/analytics?tab=operations&subtab=booking-pipeline', icon: Tag },
                  { label: 'Sales Overview', to: '/dashboard/admin/analytics?tab=sales', icon: CreditCard },
                  { label: 'Staff Utilization', to: '/dashboard/admin/analytics?tab=operations&subtab=staff-utilization', icon: Receipt },
                ].map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="group flex items-center gap-3 rounded-lg bg-muted/40 hover:bg-muted/60 px-3.5 py-2.5 transition-all duration-200 hover:shadow-sm"
                  >
                    <link.icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-sans text-sm text-foreground">{link.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="appointments" className="gap-2">
                <Calendar className="w-4 h-4" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2">
                <Receipt className="w-4 h-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="gift-cards" className="gap-2">
                <Gift className="w-4 h-4" />
                Gift Cards
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="appointments" className="mt-4">
            <AppointmentsList search={search} onSearchChange={setSearch} />
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <TransactionsTab search={search} />
          </TabsContent>

          <TabsContent value="gift-cards" className="mt-4">
            <GiftCardManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
