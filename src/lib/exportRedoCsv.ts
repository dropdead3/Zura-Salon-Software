/**
 * Export redo analytics data as a CSV file download.
 */

import type { RedoAnalytics } from '@/hooks/useRedoAnalytics';

export function exportRedoCsv(data: RedoAnalytics, formatCurrency: (n: number) => string) {
  const headers = ['Stylist', 'Redo Count', 'Total Appointments', 'Redo Rate (%)', 'Top Reason'];
  
  // Build reason lookup per stylist (approximate from aggregate data)
  const rows = data.byStylist.map(s => [
    s.staffName,
    s.redoCount.toString(),
    s.totalCount.toString(),
    s.redoRate.toFixed(1),
    data.byReason[0]?.reason ?? 'N/A',
  ]);

  // Summary row
  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Total Redos', data.totalRedos.toString()]);
  rows.push(['Total Appointments', data.totalAppointments.toString()]);
  rows.push(['Redo Rate', `${data.redoRate.toFixed(1)}%`]);
  rows.push(['Revenue Impact', formatCurrency(data.financialImpact)]);
  rows.push(['Repeat Redo Clients', data.repeatRedoClients.toString()]);
  
  // Reasons breakdown
  rows.push([]);
  rows.push(['REASONS BREAKDOWN']);
  rows.push(['Reason', 'Count']);
  data.byReason.forEach(r => rows.push([r.reason, r.count.toString()]));

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `redo-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
