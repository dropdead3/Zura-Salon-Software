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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useStaffTransactionDetailReport } from '@/hooks/useStaffTransactionDetailReport';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function StaffTransactionDetailReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useStaffTransactionDetailReport({ dateFrom, dateTo, locationId });
  const rows = data?.rows ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Staff Transaction Detail', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Date', 'Stylist', 'Client', 'Item', 'Type', 'Qty', 'Unit Price', 'Discount', 'Total']], body: rows.slice(0, 500).map(r => [r.transactionDate, r.stylistName, r.clientName, r.itemName, r.itemType, r.quantity.toString(), formatCurrencyWhole(r.unitPrice), formatCurrencyWhole(r.discount), formatCurrencyWhole(r.totalAmount)]), styles: { fontSize: 7 } });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'staff-transaction-detail', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const csvRows = [['Date', 'Stylist', 'Client', 'Item', 'Type', 'Qty', 'Unit Price', 'Discount', 'Total'], ...rows.map(r => [r.transactionDate, r.stylistName, r.clientName, r.itemName, r.itemType, r.quantity.toString(), r.unitPrice.toFixed(2), r.discount.toFixed(2), r.totalAmount.toFixed(2)])];
    const blob = new Blob([buildCsvString(csvRows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'staff-transaction-detail', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Staff Transaction Detail</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">{data.totalItems} line items · Revenue: <BlurredAmount>{formatCurrencyWhole(data.totalRevenue)}</BlurredAmount> · Discounts: <BlurredAmount>{formatCurrencyWhole(data.totalDiscount)}</BlurredAmount></p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className={tokens.empty.description}>No transactions for this period.</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
                <TableHead className={tokens.table.columnHeader}>Client</TableHead>
                <TableHead className={tokens.table.columnHeader}>Item</TableHead>
                <TableHead className={tokens.table.columnHeader}>Type</TableHead>
                <TableHead className={tokens.table.columnHeader}>Qty</TableHead>
                <TableHead className={tokens.table.columnHeader}>Unit Price</TableHead>
                <TableHead className={tokens.table.columnHeader}>Discount</TableHead>
                <TableHead className={tokens.table.columnHeader}>Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{formatDate(new Date(r.transactionDate), 'MMM d')}</TableCell>
                    <TableCell className="font-medium">{r.stylistName}</TableCell>
                    <TableCell>{r.clientName}</TableCell>
                    <TableCell className="text-sm">{r.itemName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{r.itemType}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell><BlurredAmount>{formatCurrencyWhole(r.unitPrice)}</BlurredAmount></TableCell>
                    <TableCell>{r.discount > 0 ? <BlurredAmount>{formatCurrencyWhole(r.discount)}</BlurredAmount> : '—'}</TableCell>
                    <TableCell><BlurredAmount>{formatCurrencyWhole(r.totalAmount)}</BlurredAmount></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 200 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing 200 of {rows.length} rows. Download CSV for full data.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
