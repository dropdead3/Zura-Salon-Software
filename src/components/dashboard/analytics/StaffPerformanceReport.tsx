/**
 * StaffPerformanceReport — Unified stylist scorecard for salon owners.
 * Composites revenue, experience scores, and color bar metrics per stylist.
 */

import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ArrowUpDown, ChevronDown, AlertCircle, DollarSign } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useStaffPerformanceComposite, type StaffPerformanceRow } from '@/hooks/useStaffPerformanceComposite';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLevelEconomicsAnalyzer, type StylistSnapshot } from '@/hooks/useLevelEconomicsAnalyzer';
import { useStylistLevels } from '@/hooks/useStylistLevels';

type SortKey = 'revenue' | 'serviceRevenue' | 'productRevenue' | 'rebookRate' | 'retailConversion' | 'avgChemicalCostPerService' | 'experienceScore' | 'reweighComplianceRate' | 'wasteRate' | 'margin' | 'hourlyContribution';

interface StaffPerformanceReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  className?: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  strong: { label: 'Strong', variant: 'default' },
  watch: { label: 'Watch', variant: 'secondary' },
  'needs-attention': { label: 'Needs Attention', variant: 'destructive' },
};

const MARGIN_STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  healthy: { label: 'Healthy', variant: 'default' },
  tight: { label: 'Tight', variant: 'secondary' },
  negative: { label: 'Underpriced', variant: 'destructive' },
};

export function StaffPerformanceReport({ dateFrom, dateTo, locationId, className }: StaffPerformanceReportProps) {
  const { formatCurrency, currency } = useFormatCurrency();
  const { formatPercent } = useFormatNumber();
  const { data: rows, isLoading } = useStaffPerformanceComposite(dateFrom, dateTo, locationId);
  const { data: dbLevels = [] } = useStylistLevels();
  const levelEconomics = useLevelEconomicsAnalyzer(dbLevels);

  // Build userId → StylistSnapshot lookup
  const snapshotMap = useMemo(() => {
    const map = new Map<string, StylistSnapshot>();
    for (const s of levelEconomics.stylistSnapshots) {
      map.set(s.userId, s);
    }
    return map;
  }, [levelEconomics.stylistSnapshots]);

  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const sorted = [...(rows ?? [])].sort((a, b) => {
    if (sortKey === 'margin') {
      const aSnap = snapshotMap.get(a.staffId);
      const bSnap = snapshotMap.get(b.staffId);
      const av = aSnap?.hasEnoughData ? aSnap.weightedMarginPct : -999;
      const bv = bSnap?.hasEnoughData ? bSnap.weightedMarginPct : -999;
      return sortAsc ? av - bv : bv - av;
    }
    if (sortKey === 'hourlyContribution') {
      const aSnap = snapshotMap.get(a.staffId);
      const bSnap = snapshotMap.get(b.staffId);
      const av = aSnap?.hasEnoughData ? aSnap.effectiveHourlyContribution : -999;
      const bv = bSnap?.hasEnoughData ? bSnap.effectiveHourlyContribution : -999;
      return sortAsc ? av - bv : bv - av;
    }
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'serviceRevenue', label: 'Services' },
    { key: 'productRevenue', label: 'Retail' },
    { key: 'rebookRate', label: 'Rebook Rate' },
    { key: 'retailConversion', label: 'Retail %' },
    { key: 'avgChemicalCostPerService', label: 'Avg Chemical' },
    { key: 'reweighComplianceRate', label: 'Reweigh %' },
    { key: 'wasteRate', label: 'Waste %' },
    { key: 'experienceScore', label: 'Score' },
    { key: 'margin', label: 'Margin' },
    { key: 'hourlyContribution', label: '$/hr' },
  ];

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Users className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Staff Performance</CardTitle>
                <MetricInfoTooltip
                  title="Staff Performance Intelligence"
                  description="Unified view of each stylist's revenue, rebook rate, retail conversion, chemical cost efficiency, reweigh compliance, waste rate, composite experience score, margin %, and effective hourly contribution. Expand rows for coaching signals and economics breakdown."
                />
              </div>
              <CardDescription className={tokens.body.muted}>
                Per-stylist metrics with coaching insights
              </CardDescription>
            </div>
          </div>
          {!isLoading && rows && (
            <Badge variant="outline" className="font-sans text-xs">
              {rows.length} stylists
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        ) : !rows?.length ? (
          <div className={tokens.empty.container}>
            <Users className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No staff data</h3>
            <p className={tokens.empty.description}>
              Completed appointments with staff tracking required
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
                  {columns.map(col => (
                    <TableHead key={col.key} className={tokens.table.columnHeader}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-sans text-sm font-medium hover:bg-transparent"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(row => (
                  <StylistRow
                    key={row.staffId}
                    row={row}
                    expanded={expandedRow === row.staffId}
                    onToggle={() => setExpandedRow(expandedRow === row.staffId ? null : row.staffId)}
                    formatCurrency={formatCurrency}
                    formatPercent={formatPercent}
                    columnCount={columns.length + 2}
                    snapshot={snapshotMap.get(row.staffId)}
                    currency={currency}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StylistRow({
  row,
  expanded,
  onToggle,
  formatCurrency,
  formatPercent,
  columnCount,
  snapshot,
  currency,
}: {
  row: StaffPerformanceRow;
  expanded: boolean;
  onToggle: () => void;
  formatCurrency: (n: number) => string;
  formatPercent: (n: number, wholeNumber?: boolean) => string;
  columnCount: number;
  snapshot?: StylistSnapshot;
  currency: string;
}) {
  const badge = STATUS_BADGE[row.experienceStatus];
  const hasSignals = row.coachingSignals.length > 0;
  const hasSnapshot = snapshot?.hasEnoughData;
  const hasExpandContent = hasSignals || hasSnapshot;
  const initials = row.staffName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/30',
          hasExpandContent && 'group',
        )}
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7">
              {row.photoUrl && <AvatarImage src={row.photoUrl} alt={row.staffName} />}
              <AvatarFallback className="text-[10px] font-sans">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5">
              <span className={tokens.body.emphasis}>{row.staffName}</span>
              {hasExpandContent && (
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-muted-foreground transition-transform',
                  expanded && 'rotate-180',
                )} />
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <AnimatedBlurredAmount value={row.revenue} currency={currency} decimals={2} />
        </TableCell>
        <TableCell>
          <AnimatedBlurredAmount value={row.serviceRevenue} currency={currency} decimals={2} />
        </TableCell>
        <TableCell>
          <AnimatedBlurredAmount value={row.productRevenue} currency={currency} decimals={2} />
        </TableCell>
        <TableCell>{row.rebookRate}%</TableCell>
        <TableCell>{row.retailConversion}%</TableCell>
        <TableCell>
          {row.avgChemicalCostPerService > 0
            ? <AnimatedBlurredAmount value={row.avgChemicalCostPerService} currency={currency} decimals={2} />
            : <span className="text-muted-foreground">—</span>
          }
        </TableCell>
        <TableCell>
          {row.mixSessionCount > 0
            ? <span className={cn(row.reweighComplianceRate < 80 && 'text-destructive')}>{row.reweighComplianceRate}%</span>
            : <span className="text-muted-foreground">—</span>
          }
        </TableCell>
        <TableCell>
          {row.mixSessionCount > 0
            ? <span className={cn(row.wasteRate > 15 && 'text-destructive')}>{Math.round(row.wasteRate)}%</span>
            : <span className="text-muted-foreground">—</span>
          }
        </TableCell>
        <TableCell>
          <span className={cn(
            'font-display text-sm font-medium',
            row.experienceScore >= 70 && 'text-green-600 dark:text-green-400',
            row.experienceScore >= 50 && row.experienceScore < 70 && 'text-amber-600 dark:text-amber-400',
            row.experienceScore < 50 && 'text-destructive',
          )}>
            {row.experienceScore}
          </span>
        </TableCell>
        {/* Margin % */}
        <TableCell>
          {hasSnapshot ? (
            <span className={cn(
              'font-display text-sm font-medium',
              snapshot!.status === 'healthy' && 'text-green-600 dark:text-green-400',
              snapshot!.status === 'tight' && 'text-amber-600 dark:text-amber-400',
              snapshot!.status === 'negative' && 'text-destructive',
            )}>
              {(snapshot!.weightedMarginPct * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        {/* $/hr Contribution */}
        <TableCell>
          {hasSnapshot ? (
            <AnimatedBlurredAmount value={snapshot!.effectiveHourlyContribution} currency={currency} decimals={2} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={badge.variant} className="font-sans text-[10px]">
            {badge.label}
          </Badge>
        </TableCell>
      </TableRow>

      {/* Expanded section: coaching signals + economics */}
      {expanded && hasExpandContent && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={columnCount} className="py-3 px-6">
            <div className="space-y-3">
              {/* Coaching signals */}
              {hasSignals && (
                <div className="space-y-1.5">
                  {row.coachingSignals.map((signal, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span className={tokens.body.muted}>{signal}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Economics section */}
              {hasSnapshot && (
                <div className="border-t border-border/50 pt-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span className="font-display text-xs tracking-wide text-primary">ECONOMICS</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">
                      Level: <span className="text-foreground font-medium">{snapshot!.levelLabel}</span>
                    </span>
                    <Badge variant={MARGIN_STATUS_BADGE[snapshot!.status].variant} className="font-sans text-[10px]">
                      {MARGIN_STATUS_BADGE[snapshot!.status].label}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Margin: <span className="text-foreground">{(snapshot!.weightedMarginPct * 100).toFixed(1)}%</span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Contribution: <span className="text-foreground">{formatCurrency(snapshot!.effectiveHourlyContribution)}/hr</span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Appts: <span className="text-foreground">{snapshot!.totalAppointments}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
