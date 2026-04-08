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
import { useLocationBenchmark } from '@/hooks/useLocationBenchmark';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; onClose: () => void; dateRangeKey?: string; }

export function LocationBenchmarkReport({ dateFrom, dateTo, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const { entries, isLoading } = useLocationBenchmark(dateFrom, dateTo);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Location Benchmarking', dateFrom, dateTo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Location', 'Revenue', 'Appointments', 'Avg Ticket', 'Clients', 'No-Show %']],
        body: entries.map(e => [e.locationName, formatCurrencyWhole(e.totalRevenue), e.appointmentCount.toString(), formatCurrencyWhole(e.avgTicket), e.uniqueClients.toString(), `${e.noShowPercent.toFixed(1)}%`]),
      });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'location-benchmark', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Location', 'Revenue', 'Appointments', 'Avg Ticket', 'Clients', 'No-Show %'], ...entries.map(e => [e.locationName, e.totalRevenue.toFixed(2), e.appointmentCount.toString(), e.avgTicket.toFixed(2), e.uniqueClients.toString(), e.noShowPercent.toFixed(1)])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'location-benchmark', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle className={tokens.card.title}>Location Benchmarking</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead className={tokens.table.columnHeader}>Location</TableHead>
            <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
            <TableHead className={tokens.table.columnHeader}>Appointments</TableHead>
            <TableHead className={tokens.table.columnHeader}>Avg Ticket</TableHead>
            <TableHead className={tokens.table.columnHeader}>Unique Clients</TableHead>
            <TableHead className={tokens.table.columnHeader}>No-Show %</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.map(e => (
              <TableRow key={e.locationId}>
                <TableCell className="font-medium">{e.locationName}</TableCell>
                <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalRevenue)}</BlurredAmount></TableCell>
                <TableCell>{e.appointmentCount}</TableCell>
                <TableCell><BlurredAmount>{formatCurrencyWhole(e.avgTicket)}</BlurredAmount></TableCell>
                <TableCell>{e.uniqueClients}</TableCell>
                <TableCell className={e.noShowPercent > 10 ? 'text-destructive' : ''}>{e.noShowPercent.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No multi-location data</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
