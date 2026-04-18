import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Scissors, ShoppingBag, TrendingUp, Receipt } from 'lucide-react';
import { useUserSalesSummary } from '@/hooks/useSalesData';
import { useUserPhorestMapping } from '@/hooks/usePhorestSync';
import { format, subDays, startOfWeek } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhorestSyncButton } from './PhorestSyncButton';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface SalesStatsCardProps {
  userId: string | undefined;
}

type DateRange = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek';

export function SalesStatsCard({ userId }: SalesStatsCardProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const { currency } = useFormatCurrency();

  // Calculate date filters
  const dateFilters = (() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { dateFrom: format(now, 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { dateFrom: format(yesterday, 'yyyy-MM-dd'), dateTo: format(yesterday, 'yyyy-MM-dd') };
      case '7d':
        return { dateFrom: format(subDays(now, 7), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
      case '30d':
        return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
      case 'thisWeek':
        return { 
          dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), 
          dateTo: format(now, 'yyyy-MM-dd') 
        };
      default:
        return { dateFrom: format(subDays(now, 7), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    }
  })();

  const { data, isLoading } = useUserSalesSummary(userId, dateFilters.dateFrom, dateFilters.dateTo);
  const { data: userMapping, isLoading: mappingLoading } = useUserPhorestMapping(userId);

  if (isLoading || mappingLoading) {
    return (
      <Card className="p-6 bg-chart-2/5 border-chart-2/20 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-20 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // User not linked to Phorest - don't show anything (the Stats page shows linking prompt)
  if (!userMapping) {
    return null;
  }

  // Use actual data or default to zeros
  const displayData = data || {
    totalRevenue: 0,
    serviceRevenue: 0,
    productRevenue: 0,
    totalTransactions: 0,
    averageTicket: 0,
    daysWithData: 0,
  };

  const hasNoSales = !data || displayData.daysWithData === 0;

  const getRangeLabel = () => {
    switch (dateRange) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case 'thisWeek': return 'This Week';
    }
  };

  return (
    <Card className="p-6 bg-chart-2/5 border-chart-2/20 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-chart-2" />
          <h2 className="font-display text-base tracking-wide">MY SALES DATA</h2>
          {hasNoSales && (
            <span className="text-xs text-muted-foreground ml-2">
              (No sales recorded for this period)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PhorestSyncButton syncType="sales" size="sm" />
          <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-chart-2 border-chart-2">
            {displayData.daysWithData} days
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-4 h-4 text-chart-2" />
            <p className="text-2xl font-display tabular-nums">
              <AnimatedNumber
                value={displayData.totalRevenue}
                formatOptions={{ style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                animationKey="cc-sales-total-revenue"
              />
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Scissors className="w-4 h-4 text-chart-3" />
            <p className="text-2xl font-display tabular-nums">
              <AnimatedNumber
                value={displayData.serviceRevenue}
                formatOptions={{ style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                animationKey="cc-sales-service-revenue"
              />
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Services</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ShoppingBag className="w-4 h-4 text-chart-4" />
            <p className="text-2xl font-display tabular-nums">
              <AnimatedNumber
                value={displayData.productRevenue}
                formatOptions={{ style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                animationKey="cc-sales-product-revenue"
              />
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Products</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Receipt className="w-4 h-4 text-chart-5" />
            <p className="text-2xl font-display tabular-nums">
              <AnimatedNumber value={displayData.totalTransactions} animationKey="cc-sales-transactions" />
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Transactions</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-2xl font-display tabular-nums">
              <AnimatedNumber
                value={Math.round(displayData.averageTicket)}
                formatOptions={{ style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                animationKey="cc-sales-avg-ticket"
              />
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Avg Ticket</p>
        </div>
      </div>
    </Card>
  );
}
