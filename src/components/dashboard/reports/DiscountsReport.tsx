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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Tag } from 'lucide-react';
import { useDiscountsReport } from '@/hooks/useDiscountsReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function DiscountsReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useDiscountsReport({ dateFrom, dateTo, locationId });
  const entries = data?.entries ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Discounts & Promotions Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Stylist', 'Total Discounts', 'Discount Count', 'Revenue', 'Discount %']], body: entries.map(e => [e.stylistName, formatCurrencyWhole(e.totalDiscounts), e.discountCount.toString(), formatCurrencyWhole(e.totalRevenue), `${e.discountPercent.toFixed(1)}%`]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'discounts', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Stylist', 'Total Discounts', 'Discount Count', 'Revenue', 'Discount %'], ...entries.map(e => [e.stylistName, e.totalDiscounts.toFixed(2), e.discountCount.toString(), e.totalRevenue.toFixed(2), e.discountPercent.toFixed(1)])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'discounts', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Discounts & Promotions</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">Total discounted: <BlurredAmount>{formatCurrencyWhole(data.totalDiscountAmount)}</BlurredAmount> · {data.totalTransactions} discounted transactions · Avg discount: {data.avgDiscountPercent.toFixed(1)}%</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No discounts applied in this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
              <TableHead className={tokens.table.columnHeader}>Total Discounts</TableHead>
              <TableHead className={tokens.table.columnHeader}>Count</TableHead>
              <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
              <TableHead className={tokens.table.columnHeader}>Discount %</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.stylistName}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalDiscounts)}</BlurredAmount></TableCell>
                  <TableCell>{e.discountCount}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalRevenue)}</BlurredAmount></TableCell>
                  <TableCell>{e.discountPercent.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
