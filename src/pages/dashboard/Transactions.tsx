import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Receipt, 
  CreditCard, 
  Gift,
  RefreshCw,
  MoreHorizontal,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { useTransactions, TransactionFilters } from '@/hooks/useTransactions';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useLocations } from '@/hooks/useLocations';
import { TransactionList } from '@/components/dashboard/transactions/TransactionList';
import { RefundDialog } from '@/components/dashboard/transactions/RefundDialog';
import { IssueCreditsDialog } from '@/components/dashboard/transactions/IssueCreditsDialog';
import { GiftCardManager } from '@/components/dashboard/transactions/GiftCardManager';
import { cn } from '@/lib/utils';
import { BentoGrid } from '@/components/ui/bento-grid';
import { PageExplainer } from '@/components/ui/PageExplainer';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'all';

export default function Transactions() {
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [locationId, setLocationId] = useState<string>('all');
  const [itemType, setItemType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const { data: locations = [] } = useLocations();

  // Calculate date range from preset
  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return {
          startDate: format(startOfDay(now), 'yyyy-MM-dd'),
          endDate: format(endOfDay(now), 'yyyy-MM-dd'),
        };
      case 'this_week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        };
      case 'this_month':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        };
      case 'all':
      default:
        return {};
    }
  };

  const filters: TransactionFilters = {
    ...getDateRange(),
    locationId: locationId !== 'all' ? locationId : undefined,
    itemType: itemType !== 'all' ? itemType : undefined,
    clientSearch: searchQuery || undefined,
    limit: 500,
  };

  const { data: transactions = [], isLoading, refetch } = useTransactions(filters);
  const { formatCurrency } = useFormatCurrency();

  const handleRefund = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsRefundOpen(true);
  };

  // Calculate summary stats
  const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0) + (Number(t.tax_amount) || 0), 0);
  const serviceCount = transactions.filter(t => (t.item_type || '').toLowerCase() === 'service').length;
  const productCount = transactions.filter(t => (t.item_type || '').toLowerCase() === 'product').length;
  const refundedCount = transactions.filter(t => t.refund_status).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <DashboardPageHeader
          title="Transactions"
          description="View and manage client transaction history"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
        <PageExplainer pageId="transactions" />
                Refresh
              </Button>
              <Button size={tokens.button.card} onClick={() => setIsCreditsOpen(true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Issue Credits
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="gift-cards" className="gap-2">
              <Gift className="w-4 h-4" />
              Gift Cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            {/* Stats Cards */}
            <BentoGrid maxPerRow={4} gap="gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-display font-medium">{formatCurrency(totalRevenue)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-display font-medium">{serviceCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-display font-medium">{productCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Refunded</p>
                <p className={cn("text-2xl font-display font-medium", refundedCount > 0 && "text-amber-600")}>
                  {refundedCount}
                </p>
              </Card>
            </BentoGrid>

            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3">
                  <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="service">Services</SelectItem>
                      <SelectItem value="product">Products</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by client name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction List */}
            <TransactionList 
              transactions={transactions}
              isLoading={isLoading}
              onRefund={handleRefund}
            />
          </TabsContent>

          <TabsContent value="gift-cards">
            <GiftCardManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Refund Dialog */}
      <RefundDialog
        transaction={selectedTransaction}
        open={isRefundOpen}
        onOpenChange={setIsRefundOpen}
      />

      {/* Issue Credits Dialog */}
      <IssueCreditsDialog
        open={isCreditsOpen}
        onOpenChange={setIsCreditsOpen}
      />
    </DashboardLayout>
  );
}
