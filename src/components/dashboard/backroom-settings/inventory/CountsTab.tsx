/**
 * CountsTab — Physical count session management.
 * Apple-grade responsive: scrollable tables, stacked header, compact KPIs on mobile.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, ClipboardCheck, Plus, AlertTriangle, TrendingDown } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useCountSessions, useCreateCountSession } from '@/hooks/inventory/useCountSessions';
import { useShrinkageSummary } from '@/hooks/useStockCounts';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { format } from 'date-fns';

interface CountsTabProps {
  locationId?: string;
}

export function CountsTab({ locationId }: CountsTabProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: sessions = [], isLoading: sessionsLoading } = useCountSessions();
  const { data: shrinkage = [], isLoading: shrinkageLoading } = useShrinkageSummary(locationId);
  const createSession = useCreateCountSession();
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const [tab, setTab] = useState<'sessions' | 'shrinkage'>('sessions');

  const isLoading = sessionsLoading || shrinkageLoading;
  const totalShrinkageCost = shrinkage.reduce((s, r) => s + r.shrinkageCost, 0);

  const handleStartCount = () => {
    if (!orgId) return;
    createSession.mutate({
      organization_id: orgId,
      location_id: locationId,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className={tokens.body.emphasis}>Physical Count Sessions</p>
          <p className={cn(tokens.body.muted, 'text-sm')}>Run periodic counts to detect shrinkage and keep stock accurate.</p>
        </div>
        <Button size="sm" onClick={handleStartCount} disabled={createSession.isPending} className={cn(tokens.button.cardAction, 'self-end sm:self-auto shrink-0')}>
          {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Start New Count
        </Button>
      </div>

      {/* KPI summary */}
      {shrinkage.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className={cn(tokens.kpi.tile, 'relative p-3 sm:p-4')}>
            <span className={cn(tokens.kpi.label, 'text-[10px] sm:text-xs')}>Total Shrinkage</span>
            <span className={cn(tokens.kpi.value, 'text-destructive text-lg sm:text-2xl')}>{formatCurrency(totalShrinkageCost)}</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative p-3 sm:p-4')}>
            <span className={cn(tokens.kpi.label, 'text-[10px] sm:text-xs')}>Products Affected</span>
            <span className={cn(tokens.kpi.value, 'text-lg sm:text-2xl')}>{shrinkage.length}</span>
          </div>
          <div className={cn(tokens.kpi.tile, 'relative p-3 sm:p-4 hidden sm:flex')}>
            <span className={cn(tokens.kpi.label, 'text-[10px] sm:text-xs')}>Count Sessions</span>
            <span className={cn(tokens.kpi.value, 'text-lg sm:text-2xl')}>{sessions.length}</span>
          </div>
        </div>
      )}

      {/* Sub-tab toggle */}
      <div className="flex gap-1">
        <Button variant={tab === 'sessions' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('sessions')} className="transition-all duration-150">
          <ClipboardCheck className="w-4 h-4 mr-1" /> Sessions
        </Button>
        <Button variant={tab === 'shrinkage' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('shrinkage')} className="transition-all duration-150">
          <TrendingDown className="w-4 h-4 mr-1" /> Shrinkage
        </Button>
      </div>

      {/* Sessions list */}
      {tab === 'sessions' && (
        sessions.length === 0 ? (
          <div className={tokens.empty.container}>
            <ClipboardCheck className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No count sessions yet</h3>
            <p className={tokens.empty.description}>Start your first physical count to ensure stock accuracy.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                        <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Products</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Variance (units)</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Variance (cost)</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => {
                        const isActive = session.status === 'in_progress' || session.status === 'open';
                        return (
                          <TableRow key={session.id}>
                            <TableCell className={cn(tokens.body.emphasis, 'whitespace-nowrap')}>
                              {format(new Date(session.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] font-medium border whitespace-nowrap',
                                isActive ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'
                              )}>
                                {isActive ? 'In Progress' : 'Completed'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{session.total_products_counted}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {session.total_variance_units !== 0 ? (
                                <span className={session.total_variance_units < 0 ? 'text-destructive' : 'text-success'}>
                                  {session.total_variance_units > 0 ? '+' : ''}{session.total_variance_units}
                                </span>
                              ) : '0'}
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell tabular-nums">
                              {session.total_variance_cost !== 0 ? (
                                <span className="text-destructive">{formatCurrency(Math.abs(session.total_variance_cost))}</span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                              {session.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        )
      )}

      {/* Shrinkage summary */}
      {tab === 'shrinkage' && (
        shrinkage.length === 0 ? (
          <div className={tokens.empty.container}>
            <TrendingDown className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No shrinkage detected</h3>
            <p className={tokens.empty.description}>Complete a count session to identify discrepancies.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[520px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')}>Category</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Expected</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Counted</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Loss</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Cost of Loss</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Last Counted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shrinkage.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className={cn(tokens.body.emphasis, 'truncate max-w-[160px]')}>{item.productName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.category || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(item.expectedQty)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(item.countedQty)}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive font-medium">
                            <span className="flex items-center justify-end gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" /> {item.shrinkageUnits}
                            </span>
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell tabular-nums text-destructive">
                            {formatCurrency(item.shrinkageCost)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(item.lastCountedAt), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
