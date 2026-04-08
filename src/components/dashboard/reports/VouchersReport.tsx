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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Ticket, CheckCircle2, XCircle } from 'lucide-react';
import { useVouchersReport } from '@/hooks/useVouchersReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function VouchersReport({ dateFrom, dateTo, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const { data, isLoading } = useVouchersReport();

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Vouchers Report', dateFrom, dateTo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      doc.setFontSize(10);
      doc.text(`Total Issued: ${data?.totalIssued || 0} · Value: ${formatCurrencyWhole(data?.totalIssuedValue || 0)}`, 14, y + 2);
      doc.text(`Redeemed: ${formatCurrencyWhole(data?.totalRedeemedValue || 0)} · Outstanding: ${formatCurrencyWhole(data?.totalOutstandingValue || 0)}`, 14, y + 8);
      y += 14;

      autoTable(doc, { ...branding, startY: y, head: [['Code', 'Type', 'Value', 'Issued To', 'Status', 'Redeemed At', 'Issued At']], body: (data?.entries || []).map(e => [e.code, e.voucherType, formatCurrencyWhole(e.value), e.issuedToName, e.isRedeemed ? 'Redeemed' : e.isActive ? 'Active' : 'Expired', e.redeemedAt ? format(new Date(e.redeemedAt), 'MMM d, yyyy') : '—', e.issuedAt ? format(new Date(e.issuedAt), 'MMM d, yyyy') : '—']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'vouchers', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Code', 'Type', 'Value', 'Value Type', 'Issued To', 'Status', 'Redeemed At', 'Issued At'], ...(data?.entries || []).map(e => [e.code, e.voucherType, e.value.toFixed(2), e.valueType, e.issuedToName, e.isRedeemed ? 'Redeemed' : e.isActive ? 'Active' : 'Expired', e.redeemedAt || '', e.issuedAt || ''])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'vouchers', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Vouchers</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{data?.totalIssued || 0} vouchers issued</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Issued Value', value: formatCurrencyWhole(data?.totalIssuedValue || 0), icon: Ticket },
            { label: 'Outstanding Value', value: formatCurrencyWhole(data?.totalOutstandingValue || 0), icon: Ticket },
            { label: 'Redeemed', value: (data?.redeemedCount || 0).toString(), icon: CheckCircle2 },
            { label: 'Expired', value: (data?.expiredCount || 0).toString(), icon: XCircle },
          ].map((kpi, i) => (
            <div key={i} className="relative rounded-xl border bg-card p-4">
              <kpi.icon className="w-4 h-4 text-muted-foreground mb-2" />
              <p className={tokens.kpi.label}>{kpi.label}</p>
              <p className={tokens.kpi.value}><BlurredAmount>{kpi.value}</BlurredAmount></p>
            </div>
          ))}
        </div>

        {/* By Type breakdown */}
        {(data?.byType.length ?? 0) > 0 && (
          <div className="rounded-xl border p-4">
            <h4 className={tokens.card.title + ' mb-3'}>By Type</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data?.byType.map((t) => (
                <div key={t.type} className="text-sm">
                  <p className="capitalize font-medium">{t.type}</p>
                  <p className="text-muted-foreground">{t.count} issued · <BlurredAmount>{formatCurrencyWhole(t.value)}</BlurredAmount></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.entries.length ?? 0) === 0 ? <p className={tokens.empty.description}>No vouchers found.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Code</TableHead>
              <TableHead className={tokens.table.columnHeader}>Type</TableHead>
              <TableHead className={tokens.table.columnHeader}>Value</TableHead>
              <TableHead className={tokens.table.columnHeader}>Issued To</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
              <TableHead className={tokens.table.columnHeader}>Redeemed At</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium font-mono text-xs">{e.code}</TableCell>
                  <TableCell className="capitalize">{e.voucherType}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.value)}</BlurredAmount></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.issuedToName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${e.isRedeemed ? 'bg-muted text-muted-foreground' : e.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {e.isRedeemed ? 'Redeemed' : e.isActive ? 'Active' : 'Expired'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.redeemedAt ? format(new Date(e.redeemedAt), 'MMM d, yyyy') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
