import { useState } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useMyTipDistributions } from '@/hooks/useTipDistributions';
import { Loader2, Banknote, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  paid: { label: 'Paid', variant: 'outline' },
};

export function MyTipsHistory() {
  const { formatCurrency } = useFormatCurrency();
  const [dateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: tips = [], isLoading } = useMyTipDistributions(dateFrom, dateTo);

  const totalTips = tips.reduce((sum, t) => sum + Number(t.total_tips), 0);
  const confirmedTips = tips.filter(t => t.status === 'confirmed' || t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.total_tips), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Banknote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>My Tips</CardTitle>
              <MetricInfoTooltip content="Your daily tip distributions for the current pay period." />
            </div>
            <CardDescription>Current period tip history</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        {tips.length > 0 && (
          <div className="flex items-center gap-6 mb-4 p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Period total:</span>{' '}
              <span className="font-medium"><BlurredAmount>{formatCurrency(totalTips)}</BlurredAmount></span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Confirmed:</span>{' '}
              <span className="font-medium"><BlurredAmount>{formatCurrency(confirmedTips)}</BlurredAmount></span>
            </div>
          </div>
        )}

        {tips.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No tips this period"
            description="Tip distributions will appear here once your manager generates and confirms them."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                <TableHead className={tokens.table.columnHeader}>Total</TableHead>
                <TableHead className={tokens.table.columnHeader}>Cash</TableHead>
                <TableHead className={tokens.table.columnHeader}>Card</TableHead>
                <TableHead className={tokens.table.columnHeader}>Method</TableHead>
                <TableHead className={tokens.table.columnHeader}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tips.map((tip) => {
                const status = STATUS_BADGE[tip.status] || STATUS_BADGE.pending;
                return (
                  <TableRow key={tip.id}>
                    <TableCell>{format(new Date(tip.distribution_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><BlurredAmount>{formatCurrency(Number(tip.total_tips))}</BlurredAmount></TableCell>
                    <TableCell><BlurredAmount>{formatCurrency(Number(tip.cash_tips))}</BlurredAmount></TableCell>
                    <TableCell><BlurredAmount>{formatCurrency(Number(tip.card_tips))}</BlurredAmount></TableCell>
                    <TableCell className="capitalize">{tip.method.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="text-xs">
                        {tip.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {tip.status === 'confirmed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
