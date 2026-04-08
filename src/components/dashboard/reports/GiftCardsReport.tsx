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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import { useGiftCardsReport } from '@/hooks/useGiftCardsReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; dateRangeKey?: string; }

export function GiftCardsReport({ dateFrom, dateTo, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const { data, isLoading } = useGiftCardsReport();

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Gift Cards Report', dateFrom, dateTo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      doc.setFontSize(10);
      doc.text(`Total Issued: ${data?.totalIssued || 0} cards · Value: ${formatCurrencyWhole(data?.totalIssuedValue || 0)}`, 14, y + 2);
      doc.text(`Outstanding: ${formatCurrencyWhole(data?.totalOutstandingBalance || 0)} · Redeemed: ${formatCurrencyWhole(data?.totalRedeemedValue || 0)}`, 14, y + 8);
      y += 14;

      autoTable(doc, { ...branding, startY: y, head: [['Code', 'Type', 'Initial', 'Balance', 'Purchaser', 'Recipient', 'Status', 'Created']], body: (data?.entries || []).map(e => [e.code, e.cardType, formatCurrencyWhole(e.initialAmount), formatCurrencyWhole(e.currentBalance), e.purchaserName, e.recipientName, e.isActive ? 'Active' : e.currentBalance === 0 ? 'Redeemed' : 'Expired', format(new Date(e.createdAt), 'MMM d, yyyy')]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'gift-cards', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Code', 'Type', 'Initial Amount', 'Balance', 'Purchaser', 'Recipient', 'Status', 'Created'], ...(data?.entries || []).map(e => [e.code, e.cardType, e.initialAmount.toFixed(2), e.currentBalance.toFixed(2), e.purchaserName, e.recipientName, e.isActive ? 'Active' : e.currentBalance === 0 ? 'Redeemed' : 'Expired', e.createdAt])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'gift-cards', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Gift Cards</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{data?.totalIssued || 0} cards issued</p>
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
            { label: 'Total Issued Value', value: formatCurrencyWhole(data?.totalIssuedValue || 0), icon: CreditCard },
            { label: 'Outstanding Balance', value: formatCurrencyWhole(data?.totalOutstandingBalance || 0), icon: CreditCard },
            { label: 'Active Cards', value: (data?.activeCount || 0).toString(), icon: CheckCircle2 },
            { label: 'Fully Redeemed', value: (data?.fullyRedeemedCount || 0).toString(), icon: XCircle },
          ].map((kpi, i) => (
            <div key={i} className="relative rounded-xl border bg-card p-4">
              <kpi.icon className="w-4 h-4 text-muted-foreground mb-2" />
              <p className={tokens.kpi.label}>{kpi.label}</p>
              <p className={tokens.kpi.value}><BlurredAmount>{kpi.value}</BlurredAmount></p>
            </div>
          ))}
        </div>

        {(data?.entries.length ?? 0) === 0 ? <p className={tokens.empty.description}>No gift cards found.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Code</TableHead>
              <TableHead className={tokens.table.columnHeader}>Type</TableHead>
              <TableHead className={tokens.table.columnHeader}>Initial</TableHead>
              <TableHead className={tokens.table.columnHeader}>Balance</TableHead>
              <TableHead className={tokens.table.columnHeader}>Purchaser</TableHead>
              <TableHead className={tokens.table.columnHeader}>Recipient</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium font-mono text-xs">{e.code}</TableCell>
                  <TableCell className="capitalize">{e.cardType}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.initialAmount)}</BlurredAmount></TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.currentBalance)}</BlurredAmount></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.purchaserName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.recipientName}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${e.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : e.currentBalance === 0 ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {e.isActive ? 'Active' : e.currentBalance === 0 ? 'Redeemed' : 'Expired'}
                    </span>
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
