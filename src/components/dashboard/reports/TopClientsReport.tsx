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
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { useTopClientsReport } from '@/hooks/useTopClientsReport';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; dateRangeKey?: string; }

export function TopClientsReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useTopClientsReport({ dateFrom, dateTo, locationId });
  const entries = data?.entries ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Top Clients Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Rank', 'Client', 'Total Spend', 'Visits', 'Avg Ticket', 'Top Service']], body: entries.map((e, i) => [(i + 1).toString(), e.clientName, formatCurrencyWhole(e.totalSpend), e.visitCount.toString(), formatCurrencyWhole(Math.round(e.avgTicket)), e.topService]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'top-clients', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Rank', 'Client', 'Total Spend', 'Visits', 'Avg Ticket', 'Top Service'], ...entries.map((e, i) => [(i + 1).toString(), e.clientName, e.totalSpend.toFixed(2), e.visitCount.toString(), e.avgTicket.toFixed(2), e.topService])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'top-clients', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Top Clients</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">Top 100 clients · Total: <BlurredAmount>{formatCurrencyWhole(data.totalRevenue)}</BlurredAmount></p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No client data for this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>#</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={tokens.table.columnHeader}>Total Spend</TableHead>
              <TableHead className={tokens.table.columnHeader}>Visits</TableHead>
              <TableHead className={tokens.table.columnHeader}>Avg Ticket</TableHead>
              <TableHead className={tokens.table.columnHeader}>Top Service</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{e.clientName}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalSpend)}</BlurredAmount></TableCell>
                  <TableCell>{e.visitCount}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(Math.round(e.avgTicket))}</BlurredAmount></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.topService}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
