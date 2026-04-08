import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useTaxSummary } from '@/hooks/useTaxSummary';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function TaxSummaryReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useTaxSummary({ dateFrom, dateTo, locationId });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Tax Summary Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      if (data) {
        autoTable(doc, { ...branding, startY: y, head: [['Metric', 'Amount']], body: [['Pre-Tax Revenue', formatCurrencyWhole(data.totalPreTaxRevenue)], ['Tax Collected', formatCurrencyWhole(data.totalTax)], ['Gross Revenue', formatCurrencyWhole(data.totalGrossRevenue)]] });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
      if (data?.byMonth.length) {
        doc.setFontSize(12); doc.text('By Month', 14, y); y += 6;
        autoTable(doc, { ...branding, startY: y, head: [['Month', 'Revenue', 'Tax']], body: data.byMonth.map(m => [m.month, formatCurrencyWhole(m.revenue), formatCurrencyWhole(m.tax)]) });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
      if (data?.byLocation.length) {
        doc.setFontSize(12); doc.text('By Location', 14, y); y += 6;
        autoTable(doc, { ...branding, startY: y, head: [['Location', 'Revenue', 'Tax']], body: data.byLocation.map(l => [l.locationName, formatCurrencyWhole(l.revenue), formatCurrencyWhole(l.tax)]) });
      }
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'tax-summary', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    if (!data) return;
    const rows = [['Month', 'Revenue', 'Tax Collected'], ...data.byMonth.map(m => [m.month, m.revenue.toFixed(2), m.tax.toFixed(2)])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'tax-summary', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Tax Summary</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">Total tax: <BlurredAmount>{formatCurrencyWhole(data.totalTax)}</BlurredAmount> on <BlurredAmount>{formatCurrencyWhole(data.totalGrossRevenue)}</BlurredAmount> gross</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {data?.byMonth.length ? (
          <div>
            <h4 className="text-sm font-medium mb-2">By Month</h4>
            <Table>
              <TableHeader><TableRow>
                <TableHead className={tokens.table.columnHeader}>Month</TableHead>
                <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
                <TableHead className={tokens.table.columnHeader}>Tax Collected</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.byMonth.map((m, i) => (<TableRow key={i}><TableCell className="font-medium">{m.month}</TableCell><TableCell><BlurredAmount>{formatCurrencyWhole(m.revenue)}</BlurredAmount></TableCell><TableCell><BlurredAmount>{formatCurrencyWhole(m.tax)}</BlurredAmount></TableCell></TableRow>))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        {data?.byLocation && data.byLocation.length > 1 ? (
          <div>
            <h4 className="text-sm font-medium mb-2">By Location</h4>
            <Table>
              <TableHeader><TableRow>
                <TableHead className={tokens.table.columnHeader}>Location</TableHead>
                <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
                <TableHead className={tokens.table.columnHeader}>Tax Collected</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.byLocation.map((l, i) => (<TableRow key={i}><TableCell className="font-medium">{l.locationName}</TableCell><TableCell><BlurredAmount>{formatCurrencyWhole(l.revenue)}</BlurredAmount></TableCell><TableCell><BlurredAmount>{formatCurrencyWhole(l.tax)}</BlurredAmount></TableCell></TableRow>))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
