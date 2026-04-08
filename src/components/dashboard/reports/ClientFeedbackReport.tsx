import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Star, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { useClientFeedbackReport } from '@/hooks/reports/useClientFeedbackReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; dateRangeKey?: string; }

export function ClientFeedbackReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useClientFeedbackReport({ dateFrom, dateTo, locationId });
  const entries = data?.entries || [];
  const summary = data?.summary;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Client Feedback & NPS Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      if (summary) {
        doc.setFontSize(10);
        doc.text(`NPS: ${summary.avgNPS} | Avg Rating: ${summary.avgRating.toFixed(1)}/5 | Promoters: ${summary.promoters} | Passives: ${summary.passives} | Detractors: ${summary.detractors}`, 14, y);
        y += 8;
      }
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Rating', 'NPS', 'Service', 'Friendliness', 'Cleanliness', 'Comments', 'Date']], body: entries.map(e => [e.staffName, `${e.overallRating}/5`, e.npsScore?.toString() || '—', e.serviceQuality?.toString() || '—', e.staffFriendliness?.toString() || '—', e.cleanliness?.toString() || '—', e.comments || '', e.respondedAt]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'client-feedback', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Rating', 'NPS', 'Service Quality', 'Friendliness', 'Cleanliness', 'Comments', 'Date'], ...entries.map(e => [e.staffName, e.overallRating.toString(), e.npsScore?.toString() || '', e.serviceQuality?.toString() || '', e.staffFriendliness?.toString() || '', e.cleanliness?.toString() || '', e.comments || '', e.respondedAt])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'client-feedback', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Client Feedback & NPS</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} responses • {format(new Date(dateFrom), 'MMM d')} – {format(new Date(dateTo), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">NPS Score</p>
              <p className="text-2xl font-display tracking-wide">{summary.avgNPS}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-display tracking-wide">{summary.avgRating.toFixed(1)}<span className="text-sm text-muted-foreground">/5</span></p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ThumbsUp className="w-3 h-3" />Promoters</p>
              <p className="text-2xl font-display tracking-wide text-emerald-600 dark:text-emerald-400">{summary.promoters}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Minus className="w-3 h-3" />Passives</p>
              <p className="text-2xl font-display tracking-wide text-amber-600 dark:text-amber-400">{summary.passives}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ThumbsDown className="w-3 h-3" />Detractors</p>
              <p className="text-2xl font-display tracking-wide text-red-600 dark:text-red-400">{summary.detractors}</p>
            </div>
          </div>
        )}
        {entries.length === 0 ? <p className={tokens.empty.description}>No feedback responses in this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Rating</TableHead>
              <TableHead className={tokens.table.columnHeader}>NPS</TableHead>
              <TableHead className={tokens.table.columnHeader}>Comments</TableHead>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {e.overallRating}/5
                    </span>
                  </TableCell>
                  <TableCell>{e.npsScore ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{e.comments || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.respondedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
