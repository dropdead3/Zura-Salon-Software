import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useStaffStrikesReport } from '@/hooks/reports/useStaffStrikesReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function StaffStrikesReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: entries = [], isLoading } = useStaffStrikesReport({ dateFrom, dateTo });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Staff Strikes Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Type', 'Severity', 'Title', 'Incident Date', 'Status', 'Resolution']], body: entries.map(e => [e.staffName, e.strikeType, e.severity, e.title, e.incidentDate, e.isResolved ? 'Resolved' : 'Active', e.resolutionNotes || '—']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'staff-strikes', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Type', 'Severity', 'Title', 'Incident Date', 'Status', 'Resolution'], ...entries.map(e => [e.staffName, e.strikeType, e.severity, e.title, e.incidentDate, e.isResolved ? 'Resolved' : 'Active', e.resolutionNotes || ''])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'staff-strikes', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  const severityColor: Record<string, string> = {
    low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    high: 'bg-red-500/10 text-red-700 dark:text-red-400',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Staff Strikes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} strikes • {format(new Date(dateFrom), 'MMM d')} – {format(new Date(dateTo), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No strikes recorded in this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Type</TableHead>
              <TableHead className={tokens.table.columnHeader}>Severity</TableHead>
              <TableHead className={tokens.table.columnHeader}>Title</TableHead>
              <TableHead className={tokens.table.columnHeader}>Incident Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>{e.strikeType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${severityColor[e.severity.toLowerCase()] || severityColor.medium}`}>{e.severity}</Badge>
                  </TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{e.incidentDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={e.isResolved ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}>
                      {e.isResolved ? 'Resolved' : 'Active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
