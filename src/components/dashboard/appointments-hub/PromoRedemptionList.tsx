import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tag, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { PromoRedemption } from '@/hooks/useTransactionPromoDetails';

interface PromoRedemptionListProps {
  redemptions: PromoRedemption[];
  isLoading: boolean;
}

export function PromoRedemptionList({ redemptions, isLoading }: PromoRedemptionListProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </Card>
    );
  }

  if (redemptions.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Ticket className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No Promo Redemptions</h3>
        <p className={tokens.empty.description}>No promotion codes have been redeemed in this period.</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Promotion</TableHead>
              <TableHead className={tokens.table.columnHeader}>Code</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Discount</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Original</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redemptions.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">
                  {formatDate(new Date(r.redeemed_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="font-medium text-sm">{r.promotion_name}</TableCell>
                <TableCell>
                  {r.promo_code ? (
                    <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5">
                      <Tag className="w-3 h-3" />
                      {r.promo_code}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{r.client_name || 'Walk-in'}</TableCell>
                <TableCell className="text-right text-sm font-medium text-amber-600">
                  <BlurredAmount>-{formatCurrency(r.discount_applied)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.original_amount != null ? (
                    <BlurredAmount>{formatCurrency(r.original_amount)}</BlurredAmount>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {r.final_amount != null ? (
                    <BlurredAmount>{formatCurrency(r.final_amount)}</BlurredAmount>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t p-3 text-sm text-muted-foreground">
        {redemptions.length} redemption{redemptions.length !== 1 ? 's' : ''}
      </div>
    </Card>
  );
}
