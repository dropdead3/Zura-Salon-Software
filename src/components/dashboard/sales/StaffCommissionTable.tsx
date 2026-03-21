import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useResolveCommission, CommissionSource } from '@/hooks/useResolveCommission';

interface StylistData {
  user_id: string;
  name: string;
  photo_url?: string;
  serviceRevenue: number;
  productRevenue: number;
  totalRevenue: number;
}

interface StaffCommissionTableProps {
  stylistData: StylistData[] | undefined;
  /** @deprecated - kept for backward compat, resolver is used internally now */
  calculateCommission?: (serviceRevenue: number, productRevenue: number) => any;
  isLoading: boolean;
}

const SOURCE_BADGE_STYLES: Record<CommissionSource, string> = {
  override: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
  level: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  unassigned: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function StaffCommissionTable({ stylistData, isLoading }: StaffCommissionTableProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { resolveCommission, isLoading: resolverLoading } = useResolveCommission();

  const rows = useMemo(() => {
    if (!stylistData?.length) return [];

    return stylistData
      .map((s) => {
        const c = resolveCommission(s.user_id, s.serviceRevenue, s.productRevenue);
        const totalRev = s.serviceRevenue + s.productRevenue;
        return {
          ...s,
          commission: {
            serviceCommission: c.serviceCommission,
            productCommission: c.retailCommission,
            totalCommission: c.totalCommission,
            tierName: c.sourceName,
          },
          source: c.source,
          sourceName: c.sourceName,
          effectiveRate: totalRev > 0 ? (c.totalCommission / totalRev) * 100 : 0,
        };
      })
      .sort((a, b) => b.commission.totalCommission - a.commission.totalCommission);
  }, [stylistData, resolveCommission]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        serviceRevenue: acc.serviceRevenue + r.serviceRevenue,
        productRevenue: acc.productRevenue + r.productRevenue,
        totalCommission: acc.totalCommission + r.commission.totalCommission,
        serviceCommission: acc.serviceCommission + r.commission.serviceCommission,
        productCommission: acc.productCommission + r.commission.productCommission,
      }),
      { serviceRevenue: 0, productRevenue: 0, totalCommission: 0, serviceCommission: 0, productCommission: 0 }
    );
  }, [rows]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (isLoading || resolverLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">STAFF COMMISSION BREAKDOWN</CardTitle>
              <MetricInfoTooltip description="Per-stylist commission resolved via override → level → tier priority. Source column shows which rate applies." />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No stylist data for the selected period</p>
            <p className="text-sm mt-1">Adjust the date range to see commission estimates</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">STAFF COMMISSION BREAKDOWN</CardTitle>
              <MetricInfoTooltip description="Per-stylist commission resolved via override → level → tier priority. Source column shows which rate applies." />
            </div>
            <CardDescription className="text-xs">
              Per-stylist commission based on resolved rates (override → level → tier)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Stylist</TableHead>
                <TableHead className="text-right">Service Rev</TableHead>
                <TableHead className="text-right">Product Rev</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Eff. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const isTop = idx === 0 && row.commission.totalCommission > 0;
                return (
                  <TableRow key={row.user_id} className={cn(isTop && 'bg-chart-2/[0.03]')}>
                    <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          {row.photo_url && <AvatarImage src={row.photo_url} alt={row.name} />}
                          <AvatarFallback className="text-[10px]">{getInitials(row.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{row.name}</span>
                        {isTop && (
                          <span className="text-[9px] text-chart-2 font-medium uppercase tracking-wider">Top</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(row.serviceRevenue)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      <BlurredAmount>{formatCurrencyWhole(row.productRevenue)}</BlurredAmount>
                    </TableCell>
                    <TableCell>
                      {row.sourceName ? (
                        <Badge
                          variant="outline"
                          className={cn('text-xs', SOURCE_BADGE_STYLES[row.source])}
                        >
                          {row.sourceName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-display tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(Math.round(row.commission.totalCommission))}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                      {row.effectiveRate.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right font-display tabular-nums">
                  <BlurredAmount>{formatCurrencyWhole(totals.serviceRevenue)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  <BlurredAmount>{formatCurrencyWhole(totals.productRevenue)}</BlurredAmount>
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-display tabular-nums">
                  <BlurredAmount>{formatCurrencyWhole(Math.round(totals.totalCommission))}</BlurredAmount>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
