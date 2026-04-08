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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Cake } from 'lucide-react';
import { useClientBirthdaysReport } from '@/hooks/useClientBirthdaysReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; dateRangeKey?: string; }

export function ClientBirthdaysReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: entries = [], isLoading } = useClientBirthdaysReport({ daysAhead: 30, locationId });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const today = format(new Date(), 'yyyy-MM-dd');
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Client Birthdays Report', dateFrom: today, dateTo: 'Next 30 days', locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Client', 'Birthday', 'Days Until', 'Email', 'Phone', 'Total Spend', 'Visits']], body: entries.map(e => [e.clientName, e.birthday, e.daysUntil === 0 ? 'Today!' : `${e.daysUntil}d`, e.email || '', e.phone || '', formatCurrencyWhole(e.totalSpend), e.visitCount.toString()]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'client-birthdays', dateFrom: today, dateTo: today }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Client', 'Birthday', 'Days Until', 'Email', 'Phone', 'Total Spend', 'Visits'], ...entries.map(e => [e.clientName, e.birthday, e.daysUntil.toString(), e.email || '', e.phone || '', e.totalSpend.toFixed(2), e.visitCount.toString()])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const today = format(new Date(), 'yyyy-MM-dd');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'client-birthdays', dateFrom: today, dateTo: today }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Client Birthdays</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} upcoming birthdays in the next 30 days</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No upcoming birthdays in the next 30 days.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={tokens.table.columnHeader}>Birthday</TableHead>
              <TableHead className={tokens.table.columnHeader}>Days Until</TableHead>
              <TableHead className={tokens.table.columnHeader}>Email</TableHead>
              <TableHead className={tokens.table.columnHeader}>Phone</TableHead>
              <TableHead className={tokens.table.columnHeader}>Total Spend</TableHead>
              <TableHead className={tokens.table.columnHeader}>Visits</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.clientName}</TableCell>
                  <TableCell>{e.birthday}</TableCell>
                  <TableCell>{e.daysUntil === 0 ? <span className="text-primary font-medium">Today! 🎂</span> : `${e.daysUntil}d`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.email || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.phone || '—'}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalSpend)}</BlurredAmount></TableCell>
                  <TableCell>{e.visitCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
