import { useState } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Receipt,
  Gift,
  RefreshCw,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  Hash,
  TrendingUp,
  Banknote,
  Coins,
} from 'lucide-react';
import { useGroupedTransactions, type GroupedTransactionFilters, type GroupedTransaction } from '@/hooks/useGroupedTransactions';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useLocations } from '@/hooks/useLocations';
import { GroupedTransactionTable } from '@/components/dashboard/transactions/GroupedTransactionTable';
import { TransactionDetailSheet } from '@/components/dashboard/transactions/TransactionDetailSheet';
import { IssueCreditsDialog } from '@/components/dashboard/transactions/IssueCreditsDialog';
import { GiftCardManager } from '@/components/dashboard/transactions/GiftCardManager';
import { TillBalanceSummary } from '@/components/dashboard/transactions/TillBalanceSummary';
import { cn } from '@/lib/utils';
import { BentoGrid } from '@/components/ui/bento-grid';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


export default function Transactions() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [locationId, setLocationId] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<GroupedTransaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const { data: locations = [] } = useLocations();

  const filters: GroupedTransactionFilters = {
    date: selectedDate,
    locationId: locationId !== 'all' ? locationId : undefined,
    paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
    clientSearch: searchQuery || undefined,
  };

  const { data: transactions = [], isLoading, refetch } = useGroupedTransactions(filters);
  const { formatCurrency } = useFormatCurrency();

  const handleSelectTransaction = (txn: GroupedTransaction) => {
    setSelectedTxn(txn);
    setDetailOpen(true);
  };


  // Use parseISO to avoid timezone boundary shifts
  const goToPreviousDay = () => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
  const goToNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    if (next <= new Date()) setSelectedDate(format(next, 'yyyy-MM-dd'));
  };
  const goToToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'));

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');

  // KPI calculations
  const activeTxns = transactions.filter(t => !t.isVoided);
  const totalRevenue = activeTxns.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalTips = activeTxns.reduce((sum, t) => sum + t.tipAmount, 0);
  const avgTicket = activeTxns.length > 0 ? totalRevenue / activeTxns.length : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          title="Sales"
          description="Daily transaction management"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button size={tokens.button.card} onClick={() => setIsCreditsOpen(true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Issue Credits
              </Button>
            </div>
          }
        />

        <PageExplainer pageId="transactions" />

        <Tabs defaultValue="till-transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="till-transactions" className="gap-2">
              <Receipt className="w-4 h-4" />
              Till Transactions
            </TabsTrigger>
            <TabsTrigger value="petty-cash" className="gap-2">
              <Coins className="w-4 h-4" />
              Petty Cash
            </TabsTrigger>
            <TabsTrigger value="gift-cards" className="gap-2">
              <Gift className="w-4 h-4" />
              Gift Cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="till-transactions" className="space-y-4">
            {/* Daily date navigation + filters */}
            <Card>
              <div className="p-4 space-y-3">
                {/* Date nav row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Previous day</TooltipContent>
                    </Tooltip>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className={tokens.body.emphasis}>{displayDate}</span>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={goToNextDay}
                          disabled={isToday}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Next day</TooltipContent>
                    </Tooltip>

                    {!isToday && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={goToToday}>
                        Today
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filter row */}
                <div className="flex flex-wrap gap-3">
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className={cn('w-[160px]', tokens.input.filter)}>
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className={cn('w-[130px]', tokens.input.filter)}>
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by client name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn('pl-9', tokens.input.search)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* KPI tiles */}
            <BentoGrid maxPerRow={4} gap="gap-4">
              <div className={cn(tokens.kpi.tile, 'relative')}>
                <div className={tokens.card.iconBox}>
                  <DollarSign className={tokens.card.icon} />
                </div>
                <span className={tokens.kpi.label}>Total Revenue</span>
                <span className={tokens.kpi.value}>
                  <BlurredAmount>{formatCurrency(totalRevenue)}</BlurredAmount>
                </span>
              </div>

              <div className={cn(tokens.kpi.tile, 'relative')}>
                <div className={tokens.card.iconBox}>
                  <Hash className={tokens.card.icon} />
                </div>
                <span className={tokens.kpi.label}>Transactions</span>
                <span className={tokens.kpi.value}>{activeTxns.length}</span>
              </div>

              <div className={cn(tokens.kpi.tile, 'relative')}>
                <div className={tokens.card.iconBox}>
                  <TrendingUp className={tokens.card.icon} />
                </div>
                <span className={tokens.kpi.label}>Avg Ticket</span>
                <span className={tokens.kpi.value}>
                  <BlurredAmount>{formatCurrency(avgTicket)}</BlurredAmount>
                </span>
              </div>

              <div className={cn(tokens.kpi.tile, 'relative')}>
                <div className={tokens.card.iconBox}>
                  <Banknote className={tokens.card.icon} />
                </div>
                <span className={tokens.kpi.label}>Tips</span>
                <span className={tokens.kpi.value}>
                  <BlurredAmount>{formatCurrency(totalTips)}</BlurredAmount>
                </span>
              </div>
            </BentoGrid>

            {/* Grouped transaction table */}
            <GroupedTransactionTable
              transactions={transactions}
              isLoading={isLoading}
              onSelectTransaction={handleSelectTransaction}
            />

            {/* Till balance summary */}
            {transactions.length > 0 && (
              <TillBalanceSummary transactions={transactions} />
            )}
          </TabsContent>

          <TabsContent value="petty-cash">
            <Card>
              <div className={tokens.empty.container}>
                <Coins className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>Petty Cash</h3>
                <p className={tokens.empty.description}>
                  Petty cash tracking is coming soon. You'll be able to log cash in/out, track float amounts, and reconcile at end of day.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="gift-cards">
            <GiftCardManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Sheet (contains Void + Refund dialogs) */}
      <TransactionDetailSheet
        transaction={selectedTxn}
        open={detailOpen}
        onOpenChange={(isOpen) => {
          setDetailOpen(isOpen);
          if (!isOpen) setSelectedTxn(null);
        }}
      />

      {/* Issue Credits Dialog */}
      <IssueCreditsDialog
        open={isCreditsOpen}
        onOpenChange={setIsCreditsOpen}
      />
    </DashboardLayout>
  );
}
