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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useChurnRiskReport } from '@/hooks/reports/useChurnRiskReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function ChurnRiskReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useChurnRiskReport();
  const entries = data?.entries || [];
  const summary = data?.summary;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const today = format(new Date(), 'yyyy-MM-dd');
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Churn Risk Report', dateFrom: 'Current Snapshot', dateTo: today, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Risk Level', 'Score', 'Factors', 'Recommendations', 'Analyzed']], body: entries.map(e => [e.riskLevel, e.riskScore.toFixed(0), e.factors.join('; '), e.recommendations.join('; '), e.analyzedAt]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'churn-risk', dateFrom: today, dateTo: today }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Risk Level', 'Score', 'Factors', 'Recommendations', 'Analyzed'], ...entries.map(e => [e.riskLevel, e.riskScore.toString(), e.factors.join('; '), e.recommendations.join('; '), e.analyzedAt])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const today = format(new Date(), 'yyyy-MM-dd');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'churn-risk', dateFrom: today, dateTo: today }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  const riskColor: Record<string, string> = {
    high: 'bg-red-500/10 text-red-700 dark:text-red-400',
    medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Churn Risk</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} clients with risk scores</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3 text-red-500" />High Risk</p>
              <p className="text-2xl font-display tracking-wide text-red-600 dark:text-red-400">{summary.high}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" />Medium</p>
              <p className="text-2xl font-display tracking-wide text-amber-600 dark:text-amber-400">{summary.medium}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" />Low</p>
              <p className="text-2xl font-display tracking-wide text-emerald-600 dark:text-emerald-400">{summary.low}</p>
            </div>
          </div>
        )}
        {entries.length === 0 ? <p className={tokens.empty.description}>No churn risk data available.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Risk Level</TableHead>
              <TableHead className={tokens.table.columnHeader}>Score</TableHead>
              <TableHead className={tokens.table.columnHeader}>Factors</TableHead>
              <TableHead className={tokens.table.columnHeader}>Recommendations</TableHead>
              <TableHead className={tokens.table.columnHeader}>Analyzed</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${riskColor[e.riskLevel] || riskColor.medium}`}>{e.riskLevel}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{e.riskScore}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                    {e.factors.length > 0 ? e.factors.slice(0, 2).join(', ') : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                    {e.recommendations.length > 0 ? e.recommendations.slice(0, 2).join(', ') : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.analyzedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
