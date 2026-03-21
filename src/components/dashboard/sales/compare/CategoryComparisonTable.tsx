import { ArrowUpRight, ArrowDownRight, Minus, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Loader2 } from 'lucide-react';
import type { CategoryBreakdown } from '@/hooks/useComparisonData';

interface CategoryComparisonTableProps {
  categories: CategoryBreakdown[] | undefined;
  isLoading: boolean;
  periodALabel?: string;
  periodBLabel?: string;
}

export function CategoryComparisonTable({ 
  categories, 
  isLoading,
  periodALabel = 'Period A',
  periodBLabel = 'Period B',
}: CategoryComparisonTableProps) {
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No category data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...categories.map(c => Math.max(c.periodA, c.periodB)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="font-display text-base tracking-wide">CATEGORY BREAKDOWN</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">{periodALabel}</TableHead>
              <TableHead className="text-right">{periodBLabel}</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="w-[120px]">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => {
              const isPositive = cat.changePercent > 0;
              const isNeutral = cat.changePercent === 0;
              const growthWidth = Math.min(Math.abs(cat.changePercent), 100);

              return (
                <TableRow key={cat.category}>
                  <TableCell className="font-medium">{cat.category}</TableCell>
                  <TableCell className="text-right font-display">
                    {formatCurrencyWhole(cat.periodA)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrencyWhole(cat.periodB)}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-medium',
                    isNeutral ? 'text-muted-foreground' : isPositive ? 'text-chart-2' : 'text-destructive'
                  )}>
                    {isPositive ? '+' : ''}{cat.changePercent.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={growthWidth} 
                        className={cn(
                          'h-2 flex-1',
                          isPositive ? '[&>div]:bg-chart-2' : '[&>div]:bg-destructive'
                        )} 
                      />
                      {isNeutral ? (
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      ) : isPositive ? (
                        <ArrowUpRight className="w-3 h-3 text-chart-2" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
