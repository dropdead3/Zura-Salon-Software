import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useFormulaHistoryReport } from '@/hooks/reports/useFormulaHistoryReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; dateRangeKey?: string; }

export function FormulaHistoryReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useFormulaHistoryReport({ dateFrom, dateTo, locationId });
  const entries = data?.entries || [];
  const summary = data?.summary;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Client Formula History', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      if (summary) {
        doc.setFontSize(10);
        doc.text(`Total Formulas: ${summary.totalFormulas} | Types: ${Object.keys(summary.byType).join(', ')}`, 14, y);
        y += 8;
      }
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Service', 'Formula Type', 'Date', 'Notes']], body: entries.map(e => [e.staffName, e.serviceName || '—', e.formulaType || '—', e.createdAt, e.notes || '']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'formula-history', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Service', 'Formula Type', 'Date', 'Notes'], ...entries.map(e => [e.staffName, e.serviceName || '', e.formulaType || '', e.createdAt, e.notes || ''])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'formula-history', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Client Formula History</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} formulas • {format(new Date(dateFrom), 'MMM d')} – {format(new Date(dateTo), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary && summary.totalFormulas > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Formulas</p>
              <p className="text-2xl font-display tracking-wide">{summary.totalFormulas}</p>
            </div>
            {Object.entries(summary.byType).slice(0, 3).map(([type, count]) => (
              <div key={type} className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">{type}</p>
                <p className="text-2xl font-display tracking-wide">{count}</p>
              </div>
            ))}
          </div>
        )}
        {entries.length === 0 ? <p className={tokens.empty.description}>No formulas recorded in this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Service</TableHead>
              <TableHead className={tokens.table.columnHeader}>Formula Type</TableHead>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>{e.serviceName || '—'}</TableCell>
                  <TableCell>{e.formulaType || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.createdAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{e.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
