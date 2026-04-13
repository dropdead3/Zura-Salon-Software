import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useMyTipDistributions } from '@/hooks/useTipDistributions';
import { Loader2, Banknote, CheckCircle2, Clock, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  paid: { label: 'Paid', variant: 'outline' },
};

export function MyTipsHistory() {
  const { formatCurrency } = useFormatCurrency();
  const [monthOffset, setMonthOffset] = useState(0);

  const targetMonth = subMonths(new Date(), monthOffset);
  const dateFrom = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(targetMonth), 'yyyy-MM-dd');
  const monthLabel = format(targetMonth, 'MMMM yyyy');

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>My Tips</CardTitle>
                <MetricInfoTooltip description="Your daily tip distributions for the selected period." />
              </div>
              <CardDescription>Tip history by month</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setMonthOffset(prev => prev + 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-sans min-w-[120px] text-center">{monthLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={monthOffset === 0}
              onClick={() => setMonthOffset(prev => Math.max(0, prev - 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
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
