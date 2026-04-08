import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useClientAttritionReport } from '@/hooks/useClientAttritionReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

const riskColors: Record<string, string> = {
  'at-risk': 'bg-status-warning/10 text-status-warning',
  'lapsed': 'bg-status-error/10 text-status-error',
  'lost': 'bg-destructive/10 text-destructive',
};

export function ClientAttritionReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useClientAttritionReport({ asOfDate: dateTo, locationId });
  const entries = data?.entries ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Client Attrition Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      if (data) {
        autoTable(doc, { ...branding, startY: y, head: [['Metric', 'Count']], body: [['At-Risk (60-89 days)', data.atRiskCount.toString()], ['Lapsed (90-119 days)', data.lapsedCount.toString()], ['Lost (120+ days)', data.lostCount.toString()], ['Est. Revenue at Risk', formatCurrencyWhole(data.totalRevenueAtRisk)]] });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
      autoTable(doc, { ...branding, startY: y, head: [['Client', 'Last Visit', 'Days', 'Total Spend', 'Avg Ticket', 'Risk', 'Stylist']], body: entries.slice(0, 100).map(e => [e.clientName, e.lastVisitDate, e.daysSinceVisit.toString(), formatCurrencyWhole(e.totalSpend), formatCurrencyWhole(Math.round(e.avgTicket)), e.riskTier, e.staffName || '-']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'client-attrition', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Client', 'Last Visit', 'Days Since', 'Total Spend', 'Avg Ticket', 'Risk', 'Stylist'], ...entries.map(e => [e.clientName, e.lastVisitDate, e.daysSinceVisit.toString(), e.totalSpend.toFixed(2), e.avgTicket.toFixed(2), e.riskTier, e.staffName || ''])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'client-attrition', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground" onClick={onClose}><ArrowLeft className="w-4 h-4 mr-1.5" />Back to Reports</Button>
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">At-Risk</p><p className="text-2xl font-display tracking-wide text-status-warning">{data.atRiskCount}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Lapsed</p><p className="text-2xl font-display tracking-wide text-status-error">{data.lapsedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Lost</p><p className="text-2xl font-display tracking-wide text-destructive">{data.lostCount}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Revenue at Risk</p><p className="text-2xl font-display tracking-wide">{formatCurrencyWhole(data.totalRevenueAtRisk)}</p></CardContent></Card>
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-muted-foreground" /><CardTitle className={tokens.card.title}>Client Attrition</CardTitle></div>
          <div className="flex gap-2">
            <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
            <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? <p className={tokens.empty.description}>No at-risk clients found.</p> : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className={tokens.table.columnHeader}>Client</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Last Visit</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Days</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Total Spend</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Avg Ticket</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Risk</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Last Stylist</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {entries.slice(0, 100).map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{e.clientName}</TableCell>
                      <TableCell>{e.lastVisitDate}</TableCell>
                      <TableCell>{e.daysSinceVisit}</TableCell>
                      <TableCell>{formatCurrencyWhole(e.totalSpend)}</TableCell>
                      <TableCell>{formatCurrencyWhole(Math.round(e.avgTicket))}</TableCell>
                      <TableCell><Badge variant="outline" className={riskColors[e.riskTier] || ''}>{e.riskTier}</Badge></TableCell>
                      <TableCell>{e.staffName || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {entries.length > 100 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing top 100 of {entries.length}. Download CSV for full list.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
