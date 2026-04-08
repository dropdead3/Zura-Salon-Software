import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Gift, Cake, Award } from 'lucide-react';
import { useStaffMilestonesReport } from '@/hooks/reports/useStaffMilestonesReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function StaffMilestonesReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: entries = [], isLoading } = useStaffMilestonesReport({ daysAhead: 30, milestoneType: 'both', locationId });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const today = format(new Date(), 'yyyy-MM-dd');
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Staff Milestones Report', dateFrom: today, dateTo: 'Next 30 days', locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Type', 'Date', 'Days Until', 'Years']], body: entries.map(e => [e.staffName, e.type === 'birthday' ? '🎂 Birthday' : '🏆 Anniversary', e.date, e.daysUntil === 0 ? 'Today!' : `${e.daysUntil}d`, e.years !== null ? `${e.years} yr${e.years !== 1 ? 's' : ''}` : '—']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'staff-milestones', dateFrom: today, dateTo: today }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Type', 'Date', 'Days Until', 'Years'], ...entries.map(e => [e.staffName, e.type, e.date, e.daysUntil.toString(), e.years !== null ? e.years.toString() : ''])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const today = format(new Date(), 'yyyy-MM-dd');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'staff-milestones', dateFrom: today, dateTo: today }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Staff Milestones</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} upcoming milestones in the next 30 days</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No upcoming milestones in the next 30 days.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Type</TableHead>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Days Until</TableHead>
              <TableHead className={tokens.table.columnHeader}>Years</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {e.type === 'birthday' ? <Cake className="w-3.5 h-3.5 text-pink-500" /> : <Award className="w-3.5 h-3.5 text-amber-500" />}
                      {e.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                    </span>
                  </TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.daysUntil === 0 ? <span className="text-primary font-medium">Today! 🎉</span> : `${e.daysUntil}d`}</TableCell>
                  <TableCell>{e.years !== null ? `${e.years} yr${e.years !== 1 ? 's' : ''}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
