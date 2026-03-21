import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DollarSign, TrendingUp, ShieldAlert, Settings2, Users, BarChart3 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePayrollForecasting } from '@/hooks/usePayrollForecasting';
import { useResolveCommission } from '@/hooks/useResolveCommission';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

function formatPercent(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export function CommissionIntelligence() {
  const navigate = useNavigate();
  const { projection, isLoading: forecastLoading } = usePayrollForecasting();
  const { resolveCommission, isLoading: resolveLoading } = useResolveCommission();
  const { data: levels } = useStylistLevels();
  const { formatCurrencyWhole } = useFormatCurrency();

  const isLoading = forecastLoading || resolveLoading;

  // Build breakdown rows
  const rows = useMemo(() => {
    if (!projection?.byEmployee) return [];

    return projection.byEmployee.map((emp) => {
      const resolved = resolveCommission(emp.employeeId, emp.projectedSales.services, emp.projectedSales.products);
      const levelSlug = emp.commissionSourceType === 'level' ? emp.commissionSource : null;
      const level = levelSlug && levels ? levels.find(l => l.slug === levelSlug || l.label === levelSlug) : null;

      return {
        id: emp.employeeId,
        name: emp.employeeName,
        photoUrl: emp.photoUrl,
        levelLabel: level?.client_label && level?.label
          ? `${level.client_label} — ${level.label}`
          : (emp.commissionSourceType === 'level' ? emp.commissionSource : null),
        svcRate: resolved.serviceRate,
        retailRate: resolved.retailRate,
        source: resolved.source,
        sourceName: resolved.sourceName,
        estimatedCommission: resolved.totalCommission,
      };
    }).sort((a, b) => b.estimatedCommission - a.estimatedCommission);
  }, [projection, resolveCommission, levels]);

  // Summary stats
  const stats = useMemo(() => {
    if (rows.length === 0) {
      return { totalCommission: 0, avgSvcRate: 0, overrideCount: 0 };
    }
    const totalCommission = rows.reduce((s, r) => s + r.estimatedCommission, 0);
    const svcRates = rows.filter(r => r.svcRate > 0);
    const avgSvcRate = svcRates.length > 0
      ? svcRates.reduce((s, r) => s + r.svcRate, 0) / svcRates.length
      : 0;
    const overrideCount = rows.filter(r => r.source === 'override').length;
    return { totalCommission, avgSvcRate, overrideCount };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[100px]" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={tokens.heading.card}>COMMISSION INTELLIGENCE</h2>
            <p className="text-sm text-muted-foreground">How your team's commissions are resolving this period.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/admin/settings?category=levels')}
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            Configure Rates
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={tokens.card.iconBox}>
                  <DollarSign className={tokens.card.icon} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Period Commissions</p>
                  <p className="text-2xl font-medium">
                    <BlurredAmount>{formatCurrencyWhole(stats.totalCommission)}</BlurredAmount>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={tokens.card.iconBox}>
                  <TrendingUp className={tokens.card.icon} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Effective Service Rate</p>
                  <p className="text-2xl font-medium text-primary">
                    {formatPercent(stats.avgSvcRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">across {rows.length} stylists</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={tokens.card.iconBox}>
                  <ShieldAlert className={tokens.card.icon} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Overrides</p>
                  <p className="text-2xl font-medium">{stats.overrideCount}</p>
                  <p className="text-xs text-muted-foreground">individual rate exceptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Breakdown Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <BarChart3 className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>TEAM COMMISSION BREAKDOWN</CardTitle>
                <CardDescription>
                  Resolved rates by stylist — click a row to configure in Settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No commission data available this period.</p>
                <p className="text-sm mt-1">Revenue data will populate as appointments are completed.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stylist</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Svc %</TableHead>
                    <TableHead className="text-right">Retail %</TableHead>
                    <TableHead className="text-right">Source</TableHead>
                    <TableHead className="text-right">Est. Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => navigate('/dashboard/admin/settings?category=levels')}
                    >
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        {row.levelLabel ? (
                          <span className="text-sm">{row.levelLabel}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(row.svcRate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(row.retailRate)}</TableCell>
                      <TableCell className="text-right">
                        <SourceBadge source={row.source} sourceName={row.sourceName} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <BlurredAmount>{formatCurrencyWhole(row.estimatedCommission)}</BlurredAmount>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="border-t-2 font-medium">
                    <TableCell colSpan={5} className="text-right text-muted-foreground">Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(stats.totalCommission)}</BlurredAmount>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function SourceBadge({ source, sourceName }: { source: string; sourceName: string }) {
  if (source === 'override') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
            Override
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">{sourceName}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  if (source === 'level') {
    return (
      <Badge variant="secondary" className="text-[10px]">
        Level Default
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-destructive">
      Unassigned
    </Badge>
  );
}
