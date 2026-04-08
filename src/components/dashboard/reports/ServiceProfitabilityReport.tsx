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
import { useAppointmentProfitSummary } from '@/hooks/color-bar/useAppointmentProfit';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function ServiceProfitabilityReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: summary, isLoading } = useAppointmentProfitSummary(dateFrom, dateTo, locationId);
  const rankings = summary?.serviceRankings ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Service Profitability Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Service', 'Appointments', 'Total Revenue', 'Avg Chemical Cost', 'Avg Margin', 'Margin %']],
        body: rankings.map(r => [r.serviceName, r.appointmentCount.toString(), formatCurrencyWhole(r.totalRevenue), formatCurrencyWhole(Math.round(r.avgChemicalCost)), formatCurrencyWhole(Math.round(r.avgMargin)), `${r.avgMarginPct.toFixed(1)}%`]),
      });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'service-profitability', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Service', 'Appointments', 'Total Revenue', 'Avg Chemical Cost', 'Avg Margin', 'Margin %'], ...rankings.map(r => [r.serviceName, r.appointmentCount.toString(), r.totalRevenue.toFixed(2), r.avgChemicalCost.toFixed(2), r.avgMargin.toFixed(2), r.avgMarginPct.toFixed(1)])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'service-profitability', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle className={tokens.card.title}>Service Profitability</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? <p className={tokens.empty.description}>No profitability data for this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Service</TableHead>
              <TableHead className={tokens.table.columnHeader}>Appointments</TableHead>
              <TableHead className={tokens.table.columnHeader}>Total Revenue</TableHead>
              <TableHead className={tokens.table.columnHeader}>Avg Chemical Cost</TableHead>
              <TableHead className={tokens.table.columnHeader}>Avg Margin</TableHead>
              <TableHead className={tokens.table.columnHeader}>Margin %</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rankings.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.serviceName}</TableCell>
                  <TableCell>{r.appointmentCount}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(r.totalRevenue)}</BlurredAmount></TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(Math.round(r.avgChemicalCost))}</BlurredAmount></TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(Math.round(r.avgMargin))}</BlurredAmount></TableCell>
                  <TableCell>{r.avgMarginPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
