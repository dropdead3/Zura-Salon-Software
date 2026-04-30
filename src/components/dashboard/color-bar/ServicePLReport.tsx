/**
 * ServicePLReport — Tabular P&L layout per service with CSV export.
 */

import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useAppointmentProfitSummary } from '@/hooks/color-bar/useAppointmentProfit';
import type { ServiceMarginRanking } from '@/lib/color-bar/appointment-profit-engine';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface ServicePLReportProps {
  startDate: string;
  endDate: string;
  locationId?: string;
}

export function ServicePLReport({ startDate, endDate, locationId }: ServicePLReportProps) {
  const { data: summary, isLoading } = useAppointmentProfitSummary(startDate, endDate, locationId);
  const { formatCurrency } = useFormatCurrency();

  const rankings = useMemo(() => summary?.serviceRankings ?? [], [summary]);

  const totals = useMemo(() => {
    if (!rankings.length) return null;
    return {
      appointments: rankings.reduce((s, r) => s + r.appointmentCount, 0),
      revenue: rankings.reduce((s, r) => s + r.totalRevenue, 0),
      chemCost: rankings.reduce((s, r) => s + r.avgChemicalCost * r.appointmentCount, 0),
      laborCost: rankings.reduce((s, r) => s + r.avgLaborCost * r.appointmentCount, 0),
      margin: rankings.reduce((s, r) => s + r.totalMargin, 0),
    };
  }, [rankings]);

  const handleExportCSV = useCallback(() => {
    if (!rankings.length) return;
    const esc = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Service', 'Appointments', 'Revenue', 'Chemical Cost', 'Labor Est.', 'Gross Margin', 'Margin %'];
    const rows = rankings.map((r) => [
      esc(r.serviceName),
      r.appointmentCount,
      r.totalRevenue.toFixed(2),
      (r.avgChemicalCost * r.appointmentCount).toFixed(2),
      (r.avgLaborCost * r.appointmentCount).toFixed(2),
      r.totalMargin.toFixed(2),
      r.avgMarginPct.toFixed(1) + '%',
    ]);
    if (totals) {
      rows.push([
        'TOTAL',
        totals.appointments,
        totals.revenue.toFixed(2),
        totals.chemCost.toFixed(2),
        totals.laborCost.toFixed(2),
        totals.margin.toFixed(2),
        totals.revenue > 0 ? ((totals.margin / totals.revenue) * 100).toFixed(1) + '%' : '0%',
      ]);
    }
    const csv = [headers.join(','), ...rows.map((r) => r.map(String).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-pl-report-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rankings, totals, startDate, endDate]);

  // Visibility Contract: no service rankings to render a P&L breakdown.
  if (isLoading || !rankings.length) {
    const reason = isLoading ? 'loading' : 'no-data';
    reportVisibilitySuppression('service-pl-report', reason, {
      rankingCount: rankings.length,
      startDate,
      endDate,
    });
    return null;
  }

  return (
    <Card className={cn(tokens.card.wrapper)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Service P&L</CardTitle>
                <MetricInfoTooltip description="Profit and loss breakdown per service type. Revenue minus chemical and estimated labor costs." />
              </div>
              <CardDescription className="text-xs">
                {rankings.length} services · {totals?.appointments ?? 0} appointments
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className={cn(tokens.table.columnHeader, 'text-left py-2')}>Service</th>
                <th className={cn(tokens.table.columnHeader, 'text-right py-2')}>Appts</th>
                <th className={cn(tokens.table.columnHeader, 'text-right py-2')}>Revenue</th>
                <th className={cn(tokens.table.columnHeader, 'text-right py-2')}>Chemical</th>
                <th className={cn(tokens.table.columnHeader, 'text-right py-2')}>Labor Est.</th>
                <th className={cn(tokens.table.columnHeader, 'text-right py-2')}>Margin</th>
                <th className={cn(tokens.table.columnHeader, 'text-right py-2')}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => (
                <ServiceRow key={r.serviceName} ranking={r} formatCurrency={formatCurrency} />
              ))}
              {totals && (
                <tr className="border-t-2 border-border font-medium">
                  <td className="py-2 font-sans text-foreground">Total</td>
                  <td className="py-2 text-right tabular-nums">{totals.appointments}</td>
                  <td className="py-2 text-right tabular-nums"><BlurredAmount>{formatCurrency(totals.revenue)}</BlurredAmount></td>
                  <td className="py-2 text-right tabular-nums"><BlurredAmount>{formatCurrency(totals.chemCost)}</BlurredAmount></td>
                  <td className="py-2 text-right tabular-nums"><BlurredAmount>{formatCurrency(totals.laborCost)}</BlurredAmount></td>
                  <td className="py-2 text-right tabular-nums"><BlurredAmount>{formatCurrency(totals.margin)}</BlurredAmount></td>
                  <td className="py-2 text-right tabular-nums">
                    {totals.revenue > 0 ? ((totals.margin / totals.revenue) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceRow({ ranking: r, formatCurrency }: { ranking: ServiceMarginRanking; formatCurrency: (n: number) => string }) {
  const totalChem = r.avgChemicalCost * r.appointmentCount;
  const totalLabor = r.avgLaborCost * r.appointmentCount;
  const marginColor = r.avgMarginPct >= 60 ? 'text-emerald-600 dark:text-emerald-400' : r.avgMarginPct >= 40 ? 'text-foreground' : 'text-amber-600 dark:text-amber-400';

  return (
    <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors">
      <td className="py-2 font-sans text-foreground">{r.serviceName}</td>
      <td className="py-2 text-right tabular-nums text-muted-foreground">{r.appointmentCount}</td>
      <td className="py-2 text-right tabular-nums"><BlurredAmount>{formatCurrency(r.totalRevenue)}</BlurredAmount></td>
      <td className="py-2 text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrency(totalChem)}</BlurredAmount></td>
      <td className="py-2 text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrency(totalLabor)}</BlurredAmount></td>
      <td className="py-2 text-right tabular-nums"><BlurredAmount>{formatCurrency(r.totalMargin)}</BlurredAmount></td>
      <td className={cn('py-2 text-right tabular-nums', marginColor)}>{r.avgMarginPct.toFixed(1)}%</td>
    </tr>
  );
}
