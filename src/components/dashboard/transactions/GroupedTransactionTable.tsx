import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  Eye,
  Printer,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import { printReceipt } from './ReceiptPrintView';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';

interface GroupedTransactionTableProps {
  transactions: GroupedTransaction[];
  isLoading: boolean;
  onSelectTransaction: (txn: GroupedTransaction) => void;
}

type SortField = 'clientName' | 'totalAmount' | 'stylistName';
type SortDirection = 'asc' | 'desc';

export function GroupedTransactionTable({
  transactions,
  isLoading,
  onSelectTransaction,
}: GroupedTransactionTableProps) {
  const { formatCurrency } = useFormatCurrency();
  const [sortField, setSortField] = useState<SortField>('clientName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'clientName':
        cmp = (a.clientName || '').localeCompare(b.clientName || '');
        break;
      case 'totalAmount':
        cmp = a.totalAmount - b.totalAmount;
        break;
      case 'stylistName':
        cmp = (a.stylistName || '').localeCompare(b.stylistName || '');
        break;
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const SortHeader = ({ field, children, className: extraClass }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <Button
      variant="ghost"
      size={tokens.button.inline}
      className={cn('h-8 font-medium hover:bg-transparent', extraClass)}
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        'ml-1 h-3 w-3',
        sortField === field ? 'text-primary' : 'text-muted-foreground'
      )} />
    </Button>
  );

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
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
          <h3 className={tokens.empty.heading}>No sales for this date</h3>
          <p className={tokens.empty.description}>
            Try selecting a different date, or check that transaction data has been synced
          </p>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (txn: GroupedTransaction) => {
    if (txn.isVoided) {
      return (
        <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 dark:bg-red-950 dark:text-red-400">
          Voided
        </Badge>
      );
    }
    if (txn.refundStatus === 'completed') {
      return (
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400">
          Refunded
        </Badge>
      );
    }
    if (txn.refundStatus === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    return (
      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400">
        Paid
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(tokens.table.columnHeader, 'min-w-[130px]')}>
                <SortHeader field="clientName">Client</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'w-[120px]')}>
                <SortHeader field="stylistName">Stylist</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'w-[80px] text-center')}>Items</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'w-[100px]')}>Payment</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'w-[100px] text-right')}>
                <SortHeader field="totalAmount" className="justify-end">Total</SortHeader>
              </TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'w-[90px]')}>Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((txn) => (
              <TableRow
                key={txn.transactionId}
                className="cursor-pointer"
                onClick={() => onSelectTransaction(txn)}
              >
                <TableCell className={tokens.body.emphasis}>
                  {txn.clientName || 'Walk-in'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {txn.stylistName || '—'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {txn.items.length}
                  </Badge>
                </TableCell>
                <TableCell>
                  <PaymentMethodBadge method={txn.paymentMethod} />
                </TableCell>
                <TableCell className={cn(tokens.body.emphasis, 'text-right tabular-nums')}>
                  <BlurredAmount>{formatCurrency(txn.totalAmount)}</BlurredAmount>
                </TableCell>
                <TableCell>{getStatusBadge(txn)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onSelectTransaction(txn)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => printReceipt(txn, formatCurrency)}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print Receipt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t p-3 text-sm text-muted-foreground">
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </div>
    </Card>
  );
}
