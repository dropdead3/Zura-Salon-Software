import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Clock } from 'lucide-react';
import { useTimeAttendanceReport } from '@/hooks/reports/useTimeAttendanceReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function TimeAttendanceReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: entries = [], isLoading } = useTimeAttendanceReport({ dateFrom, dateTo, locationId });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Time & Attendance Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Days Worked', 'Total Hours', 'Avg Hours/Day', 'Break Hours', 'Overtime Hours']], body: entries.map(e => [e.staffName, e.daysWorked.toString(), e.totalHours.toFixed(1), e.avgHoursPerDay.toFixed(1), e.breakHours.toFixed(1), e.overtimeHours.toFixed(1)]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'time-attendance', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Days Worked', 'Total Hours', 'Avg Hours/Day', 'Break Hours', 'Overtime Hours'], ...entries.map(e => [e.staffName, e.daysWorked.toString(), e.totalHours.toFixed(1), e.avgHoursPerDay.toFixed(1), e.breakHours.toFixed(1), e.overtimeHours.toFixed(1)])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'time-attendance', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Time & Attendance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} staff members • {format(new Date(dateFrom), 'MMM d')} – {format(new Date(dateTo), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No time entries found for this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Days Worked</TableHead>
              <TableHead className={tokens.table.columnHeader}>Total Hours</TableHead>
              <TableHead className={tokens.table.columnHeader}>Avg Hours/Day</TableHead>
              <TableHead className={tokens.table.columnHeader}>Break Hours</TableHead>
              <TableHead className={tokens.table.columnHeader}>Overtime Hours</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>{e.daysWorked}</TableCell>
                  <TableCell>{e.totalHours.toFixed(1)}h</TableCell>
                  <TableCell>{e.avgHoursPerDay.toFixed(1)}h</TableCell>
                  <TableCell>{e.breakHours.toFixed(1)}h</TableCell>
                  <TableCell className={e.overtimeHours > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                    {e.overtimeHours.toFixed(1)}h
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
