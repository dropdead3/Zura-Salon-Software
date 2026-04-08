import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  RotateCcw, 
  Eye,
  Package,
  Scissors,
  Tag
} from 'lucide-react';
import { TransactionItem } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface TransactionListProps {
  transactions: TransactionItem[];
  isLoading: boolean;
  onRefund: (transaction: TransactionItem) => void;
  onViewDetails?: (transaction: TransactionItem) => void;
}

type SortField = 'transaction_date' | 'client_name' | 'item_name' | 'total_amount';
type SortDirection = 'asc' | 'desc';

export function TransactionList({ 
  transactions, 
  isLoading, 
  onRefund,
  onViewDetails 
}: TransactionListProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'transaction_date':
        comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        break;
      case 'client_name':
        comparison = (a.client_name || '').localeCompare(b.client_name || '');
        break;
      case 'item_name':
        comparison = (a.item_name || '').localeCompare(b.item_name || '');
        break;
      case 'total_amount':
        comparison = (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size={tokens.button.inline}
      className="-ml-3 h-8 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-1 h-3 w-3",
        sortField === field ? "text-primary" : "text-muted-foreground"
      )} />
    </Button>
  );

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className={tokens.loading.skeleton} />
          ))}
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <div className={tokens.empty.container}>
          <Package className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No transactions found</h3>
          <p className={tokens.empty.description}>Try adjusting your filters or search query</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(tokens.table.columnHeader, "w-[100px]")}>
                <SortHeader field="transaction_date">Date</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "min-w-[150px]")}>
                <SortHeader field="client_name">Client</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "min-w-[200px]")}>
                <SortHeader field="item_name">Item</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "w-[100px]")}>Type</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "w-[90px] text-right")}>Discount</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "w-[100px] text-right")}>
                <SortHeader field="total_amount">Amount</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "w-[120px]")}>Location</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, "w-[100px]")}>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className={tokens.body.emphasis}>
                  {formatDate(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <span className={tokens.body.emphasis}>{transaction.client_name || 'Walk-in'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {(transaction.item_type || '').toLowerCase() === 'service' ? (
                      <Scissors className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate">{transaction.item_name}</span>
                    {transaction.promotion_name && (
                      <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5 text-[10px] px-1.5 py-0 shrink-0">
                        <Tag className="w-3 h-3" />
                        {transaction.promo_code || transaction.promotion_name}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "capitalize",
                    (transaction.item_type || '').toLowerCase() === 'service' && "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
                    (transaction.item_type || '').toLowerCase() === 'product' && "border-green-300 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400"
                  )}>
                    {transaction.item_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {(Number(transaction.discount) || 0) > 0 ? (
                    <span className="text-amber-600 font-medium text-sm">-{formatCurrency(Number(transaction.discount))}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className={cn(tokens.body.emphasis, 'text-right')}>
                  {formatCurrency(Number(transaction.total_amount) || 0)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {transaction.branch_name || '-'}
                </TableCell>
                <TableCell>
                  {transaction.refund_status ? (
                    <Badge variant={
                      transaction.refund_status === 'completed' ? 'destructive' :
                      transaction.refund_status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {transaction.refund_status === 'completed' ? 'Refunded' :
                       transaction.refund_status === 'pending' ? 'Pending' : 
                       transaction.refund_status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400">
                      Paid
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onViewDetails && (
                        <DropdownMenuItem onClick={() => onViewDetails(transaction)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      {!transaction.refund_status && (
                        <DropdownMenuItem 
                          onClick={() => onRefund(transaction)}
                          className="text-amber-600"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Process Refund
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t p-3 text-sm text-muted-foreground">
        Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </div>
    </Card>
  );
}
