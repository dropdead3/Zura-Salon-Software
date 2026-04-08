import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Beaker } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { useServiceProfitabilitySnapshots } from '@/hooks/color-bar/useServiceProfitability';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function ChemicalCostReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: snapshots, isLoading } = useServiceProfitabilitySnapshots(dateFrom, dateTo, locationId);

  const serviceMap = new Map<string, { revenue: number; productCost: number; wasteCost: number; margin: number; count: number }>();
  (snapshots ?? []).forEach(s => {
    const key = s.service_name || 'Unknown';
    const entry = serviceMap.get(key) || { revenue: 0, productCost: 0, wasteCost: 0, margin: 0, count: 0 };
    entry.revenue += s.service_revenue; entry.productCost += s.product_cost; entry.wasteCost += s.waste_cost; entry.margin += s.contribution_margin; entry.count += 1;
    serviceMap.set(key, entry);
  });

  const rows = Array.from(serviceMap.entries())
    .map(([name, v]) => ({ name, ...v, avgCost: v.count > 0 ? v.productCost / v.count : 0, marginPct: v.revenue > 0 ? (v.margin / v.revenue) * 100 : 0 }))
    .sort((a, b) => b.productCost - a.productCost);

  const totalProductCost = rows.reduce((s, r) => s + r.productCost, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalWaste = rows.reduce((s, r) => s + r.wasteCost, 0);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Chemical Cost Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Service', 'Revenue', 'Chemical Cost', 'Avg Cost', 'Waste', 'Margin %']],
        body: rows.map(r => [r.name, formatCurrencyWhole(r.revenue), formatCurrencyWhole(r.productCost), formatCurrencyWhole(Math.round(r.avgCost)), formatCurrencyWhole(r.wasteCost), `${r.marginPct.toFixed(1)}%`]),
        foot: [['Total', formatCurrencyWhole(totalRevenue), formatCurrencyWhole(totalProductCost), '', formatCurrencyWhole(totalWaste), totalRevenue > 0 ? `${(((totalRevenue - totalProductCost) / totalRevenue) * 100).toFixed(1)}%` : '-']],
      });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'chemical-cost', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const csvRows = [['Service', 'Revenue', 'Chemical Cost', 'Avg Cost', 'Waste', 'Margin %'], ...rows.map(r => [r.name, r.revenue.toFixed(2), r.productCost.toFixed(2), r.avgCost.toFixed(2), r.wasteCost.toFixed(2), r.marginPct.toFixed(1)])];
    const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'chemical-cost', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground" onClick={onClose}><ArrowLeft className="w-4 h-4 mr-1.5" />Back to Reports</Button>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className={tokens.card.title}>Chemical Cost Report</CardTitle>
              {totalProductCost > 0 && <p className="text-sm text-muted-foreground mt-1">Total: {formatCurrencyWhole(totalProductCost)} · Waste: {formatCurrencyWhole(totalWaste)}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
            <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className={tokens.empty.description}>No chemical cost data. Ensure Color Bar is configured.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
                <TableHead className={tokens.table.columnHeader}>Chemical Cost</TableHead>
                <TableHead className={tokens.table.columnHeader}>Avg Cost</TableHead>
                <TableHead className={tokens.table.columnHeader}>Waste</TableHead>
                <TableHead className={tokens.table.columnHeader}>Margin %</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{formatCurrencyWhole(r.revenue)}</TableCell>
                    <TableCell>{formatCurrencyWhole(r.productCost)}</TableCell>
                    <TableCell>{formatCurrencyWhole(Math.round(r.avgCost))}</TableCell>
                    <TableCell>{formatCurrencyWhole(r.wasteCost)}</TableCell>
                    <TableCell>{r.marginPct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
