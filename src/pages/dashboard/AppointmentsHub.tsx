import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tokens } from '@/lib/design-tokens';
import { Receipt, Calendar, Gift } from 'lucide-react';
import { HubSearchBar } from '@/components/dashboard/appointments-hub/HubSearchBar';
import { AppointmentsList } from '@/components/dashboard/appointments-hub/AppointmentsList';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

// Lazy imports for existing transaction/gift card components
import { TransactionList } from '@/components/dashboard/transactions/TransactionList';
import { RefundDialog } from '@/components/dashboard/transactions/RefundDialog';
import { IssueCreditsDialog } from '@/components/dashboard/transactions/IssueCreditsDialog';
import { GiftCardManager } from '@/components/dashboard/transactions/GiftCardManager';
import { useTransactions, type TransactionFilters } from '@/hooks/useTransactions';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card } from '@/components/ui/card';
import { BentoGrid } from '@/components/ui/bento-grid';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/hooks/useLocations';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { CreditCard, RefreshCw, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'all';

function TransactionsTab({ search }: { search: string }) {
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [locationId, setLocationId] = useState('all');
  const [itemType, setItemType] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const { data: locations = [] } = useLocations();
  const { formatCurrency } = useFormatCurrency();

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

  const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const serviceCount = transactions.filter(t => t.item_type === 'service').length;
  const productCount = transactions.filter(t => t.item_type === 'product').length;
  const refundedCount = transactions.filter(t => t.refund_status).length;

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Client', 'Type', 'Amount', 'Refund Status'];
    const rows = transactions.map((t: any) => [
      t.transaction_date || '',
      t.client_name || '',
      t.item_type || '',
      t.total_amount ?? '',
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
      <BentoGrid maxPerRow={4} gap="gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className={tokens.stat.large}>{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Services</p>
          <p className={tokens.stat.large}>{serviceCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className={tokens.stat.large}>{productCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Refunded</p>
          <p className={cn(tokens.stat.large, refundedCount > 0 && 'text-amber-600')}>{refundedCount}</p>
        </Card>
      </BentoGrid>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-3 items-center">
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

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size={tokens.button.card} onClick={handleExportCSV} disabled={transactions.length === 0}>
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
      </Card>

      <TransactionList
        transactions={transactions}
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
  const [search, setSearch] = useState('');

  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader title="Appointments & Transactions" />

        {/* Unified search */}
        <HubSearchBar value={search} onChange={setSearch} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
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

          <TabsContent value="appointments" className="mt-4">
            <AppointmentsList search={search} />
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
