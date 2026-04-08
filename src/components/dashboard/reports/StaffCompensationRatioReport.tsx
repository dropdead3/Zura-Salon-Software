import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useStaffCompensationRatio } from '@/hooks/useStaffCompensationRatio';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function StaffCompensationRatioReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { entries, totals, isLoading } = useStaffCompensationRatio(dateFrom, dateTo, locationId);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Staff Compensation Ratio', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Stylist', 'Revenue', 'Commission', 'Labor %', 'Source']],
        body: entries.map(e => [e.name, formatCurrencyWhole(e.totalRevenue), formatCurrencyWhole(e.totalCommission), `${e.laborCostPercent.toFixed(1)}%`, e.commissionSource]),
        foot: [['Total', formatCurrencyWhole(totals.totalRevenue), formatCurrencyWhole(totals.totalCommission), `${totals.avgLaborPercent.toFixed(1)}%`, '']],
      });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'staff-compensation-ratio', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Stylist', 'Revenue', 'Commission', 'Labor %', 'Source'], ...entries.map(e => [e.name, e.totalRevenue.toFixed(2), e.totalCommission.toFixed(2), e.laborCostPercent.toFixed(1), e.commissionSource])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'staff-compensation-ratio', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle className={tokens.card.title}>Staff Compensation Ratio</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total Revenue</p><p className={tokens.kpi.value}>{formatCurrencyWhole(totals.totalRevenue)}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total Commission</p><p className={tokens.kpi.value}>{formatCurrencyWhole(totals.totalCommission)}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Avg Labor %</p><p className={tokens.kpi.value}>{totals.avgLaborPercent.toFixed(1)}%</p></div>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
            <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
            <TableHead className={tokens.table.columnHeader}>Commission</TableHead>
            <TableHead className={tokens.table.columnHeader}>Labor %</TableHead>
            <TableHead className={tokens.table.columnHeader}>Source</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.map(e => (
              <TableRow key={e.userId}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>{formatCurrencyWhole(e.totalRevenue)}</TableCell>
                <TableCell>{formatCurrencyWhole(e.totalCommission)}</TableCell>
                <TableCell className={e.laborCostPercent > 50 ? 'text-destructive' : ''}>{e.laborCostPercent.toFixed(1)}%</TableCell>
                <TableCell className="text-muted-foreground text-xs">{e.commissionSource}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data for this period</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
