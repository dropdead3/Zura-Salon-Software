/**
 * StaffPerformanceReport — Unified stylist scorecard for salon owners.
 * Composites revenue, experience scores, and backroom metrics per stylist.
 */

import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ArrowUpDown, ChevronDown, AlertCircle } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useStaffPerformanceComposite, type StaffPerformanceRow } from '@/hooks/useStaffPerformanceComposite';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/components/ui/BlurredAmount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SortKey = 'revenue' | 'rebookRate' | 'retailConversion' | 'avgChemicalCostPerService' | 'experienceScore';

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

export function StaffPerformanceReport({ dateFrom, dateTo, locationId, className }: StaffPerformanceReportProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatPercent } = useFormatNumber();
  const { data: rows, isLoading } = useStaffPerformanceComposite(dateFrom, dateTo, locationId);

  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const sorted = [...(rows ?? [])].sort((a, b) => {
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
    { key: 'rebookRate', label: 'Rebook Rate' },
    { key: 'retailConversion', label: 'Retail %' },
    { key: 'avgChemicalCostPerService', label: 'Avg Chemical' },
    { key: 'experienceScore', label: 'Score' },
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
                  description="Unified view of each stylist's revenue, rebook rate, retail conversion, chemical cost efficiency, and composite experience score. Expand rows for coaching signals."
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
                />
              ))}
            </TableBody>
          </Table>
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
}: {
  row: StaffPerformanceRow;
  expanded: boolean;
  onToggle: () => void;
  formatCurrency: (n: number) => string;
  formatPercent: (n: number, wholeNumber?: boolean) => string;
  columnCount: number;
}) {
  const badge = STATUS_BADGE[row.experienceStatus];
  const hasSignals = row.coachingSignals.length > 0;
  const initials = row.staffName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/30',
          hasSignals && 'group',
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
              {hasSignals && (
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-muted-foreground transition-transform',
                  expanded && 'rotate-180',
                )} />
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <BlurredAmount value={row.revenue} formatter={formatCurrency} />
        </TableCell>
        <TableCell>{row.rebookRate}%</TableCell>
        <TableCell>{row.retailConversion}%</TableCell>
        <TableCell>
          {row.avgChemicalCostPerService > 0
            ? <BlurredAmount value={row.avgChemicalCostPerService} formatter={formatCurrency} />
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
        <TableCell>
          <Badge variant={badge.variant} className="font-sans text-[10px]">
            {badge.label}
          </Badge>
        </TableCell>
      </TableRow>

      {/* Coaching signals expandable */}
      {expanded && hasSignals && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={columnCount} className="py-3 px-6">
            <div className="space-y-1.5">
              {row.coachingSignals.map((signal, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span className={tokens.body.muted}>{signal}</span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
