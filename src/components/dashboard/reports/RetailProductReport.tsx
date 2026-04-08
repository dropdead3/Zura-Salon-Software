import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Download, FileSpreadsheet, Loader2, ArrowLeft, ShoppingBag, TrendingUp, TrendingDown, AlertTriangle, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { useRetailAnalytics } from '@/hooks/useRetailAnalytics';

interface RetailProductReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function RetailProductReport({ dateFrom, dateTo, locationId, onClose }: RetailProductReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useRetailAnalytics(dateFrom, dateTo, locationId);

  const generatePDF = async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Retail Product Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      // Summary
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`Revenue: ${formatCurrencyWhole(data.summary.totalRevenue)}  |  Units: ${data.summary.totalUnits}  |  Attachment: ${data.summary.attachmentRate}%  |  Products: ${data.summary.uniqueProducts}`, 14, y);
      y += 8;

      // Product table
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Product', 'Category', 'Units', 'Revenue', 'Avg Price', 'Discount', 'Trend']],
        body: data.products.map(p => [p.name, p.category || '--', p.unitsSold.toString(), formatCurrencyWhole(p.revenue), formatCurrencyWhole(p.avgPrice), p.discount > 0 ? formatCurrencyWhole(p.discount) : '--', `${p.revenueTrend >= 0 ? '+' : ''}${Math.round(p.revenueTrend)}%`]),
        theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
      });

      // Red flags
      if (data.redFlags.length > 0) {
        y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
        if (y > 170) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text(`Red Flags (${data.redFlags.length})`, 14, y); y += 4;
        autoTable(doc, {
          ...branding, startY: y,
          head: [['Product', 'Issue', 'Detail']],
          body: data.redFlags.map(f => [f.product, f.label, f.detail]),
          theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      // Category breakdown
      if (data.categories.length > 0) {
        y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
        if (y > 170) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text('Category Breakdown', 14, y); y += 4;
        autoTable(doc, {
          ...branding, startY: y,
          head: [['Category', 'Revenue', 'Units', 'Products', '% of Total']],
          body: data.categories.map(c => [c.category, formatCurrencyWhole(c.revenue), c.units.toString(), c.productCount.toString(), `${Math.round(c.pctOfTotal)}%`]),
          theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: 'retail-report', dateFrom, dateTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'retail-products', report_name: 'Retail Product Report',
          date_from: dateFrom, date_to: dateTo, parameters: { locationId },
          generated_by: user.id, organization_id: effectiveOrganization?.id ?? null,
        });
      }
      toast.success('Report downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally { setIsGenerating(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    let csv = 'Product,Category,Units,Revenue,Avg Price,Discount,Trend %\n';
    data.products.forEach(p => { csv += `"${p.name}","${p.category || ''}",${p.unitsSold},${p.revenue},${p.avgPrice},${p.discount},${Math.round(p.revenueTrend)}\n`; });
    csv += `\nRed Flags\nProduct,Issue,Detail\n`;
    data.redFlags.forEach(f => { csv += `"${f.product}","${f.label}","${f.detail}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `retail-report-${dateFrom}-to-${dateTo}.csv`; link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-64" /></CardContent></Card>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.card} onClick={exportCSV}><FileSpreadsheet className="w-4 h-4 mr-2" /> CSV</Button>
          <Button size={tokens.button.card} onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Product Revenue</p>
          <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.summary.totalRevenue)}</BlurredAmount></p>
          {data.summary.revenueChange !== 0 && <p className={cn('text-xs tabular-nums', data.summary.revenueChange > 0 ? 'text-emerald-600' : 'text-red-500')}>{data.summary.revenueChange > 0 ? '+' : ''}{Math.round(data.summary.revenueChange)}% vs prior</p>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Units Sold</p>
          <p className="text-xl font-display tabular-nums">{data.summary.totalUnits.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Attachment Rate</p>
          <p className="text-xl font-display tabular-nums">{data.summary.attachmentRate}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Products Sold</p>
          <p className="text-xl font-display tabular-nums">{data.summary.uniqueProducts}</p>
        </CardContent></Card>
      </div>

      {/* Product Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base tracking-wide">ALL PRODUCTS</CardTitle>
            <MetricInfoTooltip description="All retail products sold in the selected period with trend comparison to prior period." />
          </div>
          <CardDescription className="text-xs">{formatDate(new Date(dateFrom), 'MMM d, yyyy')} - {formatDate(new Date(dateTo), 'MMM d, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((p, idx) => (
                <TableRow key={p.name}>
                  <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.category || '\u2014'}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.unitsSold}</TableCell>
                  <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(p.revenue)}</BlurredAmount></TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(p.avgPrice)}</BlurredAmount></TableCell>
                  <TableCell className="text-right">
                    <span className={cn('text-xs tabular-nums', p.revenueTrend > 0 ? 'text-emerald-600' : p.revenueTrend < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                      {p.revenueTrend > 0 ? '+' : ''}{Math.round(p.revenueTrend)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell /><TableCell className="font-medium">Total</TableCell><TableCell />
                <TableCell className="text-right font-display tabular-nums">{data.summary.totalUnits}</TableCell>
                <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.summary.totalRevenue)}</BlurredAmount></TableCell>
                <TableCell /><TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Red Flags */}
      {data.redFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <CardTitle className="font-display text-base tracking-wide">RED FLAGS</CardTitle>
              <Badge variant="destructive" className="text-xs ml-auto">{data.redFlags.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.redFlags.map((f, i) => (
                <div key={i} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', f.severity === 'danger' ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20')}>
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1"><p className="text-sm font-medium">{f.product}</p><p className="text-xs text-muted-foreground">{f.detail}</p></div>
                  <Badge variant="outline" className="text-[10px]">{f.label}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
