import { useState, useMemo } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Download, Loader2, FileSpreadsheet, Eye } from 'lucide-react';
import { ReportPreviewModal } from '@/components/dashboard/reports/ReportPreviewModal';
import { useSalesMetrics, useSalesByStylist, useSalesByLocation, useDailySalesSummary } from '@/hooks/useSalesData';
import { useProductSalesAnalytics } from '@/hooks/useProductSalesAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BentoGrid } from '@/components/ui/bento-grid';
import { tokens } from '@/lib/design-tokens';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';

interface SalesReportGeneratorProps {
  reportType: string;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
}

export function SalesReportGenerator({ 
  reportType, 
  dateFrom, 
  dateTo, 
  locationId,
  onClose 
}: SalesReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics({
    dateFrom,
    dateTo,
    locationId,
  });

  const { data: stylistData, isLoading: stylistLoading } = useSalesByStylist(dateFrom, dateTo);
  const { data: locationData, isLoading: locationLoading } = useSalesByLocation(dateFrom, dateTo);
  const { data: productData, isLoading: productLoading } = useProductSalesAnalytics('month', locationId);
  const { data: dailyRawData, isLoading: dailyLoading } = useDailySalesSummary({ dateFrom, dateTo, locationId });

  // Aggregate daily rows (per-staff) into per-date rows
  const dailyRows = useMemo(() => {
    if (!dailyRawData) return [];
    const byDate: Record<string, { date: string; totalRevenue: number; serviceRevenue: number; productRevenue: number; totalServices: number; totalProducts: number }> = {};
    for (const row of dailyRawData) {
      const d = row.summary_date;
      if (!byDate[d]) {
        byDate[d] = { date: d, totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, totalServices: 0, totalProducts: 0 };
      }
      byDate[d].totalRevenue += row.total_revenue;
      byDate[d].serviceRevenue += row.service_revenue;
      byDate[d].productRevenue += row.product_revenue;
      byDate[d].totalServices += row.total_services;
      byDate[d].totalProducts += row.total_products;
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyRawData]);

  const isLoading = metricsLoading || stylistLoading || locationLoading || productLoading || dailyLoading;

  const getReportTitle = () => {
    switch (reportType) {
      case 'daily-sales': return 'Daily Sales Summary';
      case 'stylist-sales': return 'Sales by Stylist';
      case 'location-sales': return 'Sales by Location';
      case 'product-sales': return 'Product Sales Report';
      default: return 'Sales Report';
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = {
        orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization',
        logoDataUrl,
        reportTitle: getReportTitle(),
        dateFrom,
        dateTo,
        locationInfo,
      } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      // Summary Section
      if (metrics) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, y);
        y += 8;

        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total Revenue', formatCurrencyWhole(metrics.totalRevenue)],
            ['Service Revenue', formatCurrencyWhole(metrics.serviceRevenue)],
            ['Product Revenue', formatCurrencyWhole(metrics.productRevenue)],
            ['Total Services', formatNumber(metrics.totalServices)],
            ['Total Products', formatNumber(metrics.totalProducts)],
            ['Average Ticket', formatCurrencyWhole(Math.round(metrics.averageTicket))],
          ],
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Daily breakdown table
      if (reportType === 'daily-sales' && dailyRows.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Breakdown', 14, y);
        y += 8;

        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Date', 'Total Revenue', 'Service Rev', 'Product Rev', 'Services', 'Products', 'Avg Ticket']],
          body: dailyRows.map(r => {
            const txns = r.totalServices + r.totalProducts;
            return [
              formatDate(new Date(r.date + 'T00:00:00'), 'MMM d, yyyy'),
              formatCurrencyWhole(r.totalRevenue),
              formatCurrencyWhole(r.serviceRevenue),
              formatCurrencyWhole(r.productRevenue),
              formatNumber(r.totalServices),
              formatNumber(r.totalProducts),
              txns > 0 ? formatCurrencyWhole(Math.round(r.totalRevenue / txns)) : '$0',
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Report-specific content
      if (reportType === 'stylist-sales' && stylistData) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales by Stylist', 14, y);
        y += 8;

        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Rank', 'Stylist', 'Total Revenue', 'Services', 'Avg Ticket']],
          body: stylistData.slice(0, 15).map((s, idx) => [
            `#${idx + 1}`,
            s.name,
            formatCurrencyWhole(s.totalRevenue),
            s.totalServices.toString(),
            formatCurrencyWhole(Math.round(s.totalRevenue / s.totalServices || 0)),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      if (reportType === 'location-sales' && locationData) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales by Location', 14, y);
        y += 8;

        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Location', 'Total Revenue', 'Services', 'Products', 'Transactions']],
          body: locationData.map(l => [
            l.name,
            formatCurrencyWhole(l.totalRevenue),
            formatNumber(l.totalServices),
            formatNumber(l.totalProducts),
            formatNumber(l.totalServices + l.totalProducts),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      addReportFooter(doc);

      // Save
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: reportType, dateFrom, dateTo }));

      // Log to report history
      if (user) {
        await supabase.from('report_history').insert({
          report_type: reportType,
          report_name: getReportTitle(),
          date_from: dateFrom,
          date_to: dateTo,
          parameters: { locationId },
          generated_by: user.id,
          organization_id: effectiveOrganization?.id ?? null,
        });
      }

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    let csvContent = '';
    
    if (reportType === 'daily-sales' && dailyRows.length > 0) {
      csvContent = 'Date,Total Revenue,Service Revenue,Product Revenue,Services,Products,Avg Ticket\n';
      dailyRows.forEach(r => {
        const txns = r.totalServices + r.totalProducts;
        csvContent += `${r.date},${r.totalRevenue.toFixed(2)},${r.serviceRevenue.toFixed(2)},${r.productRevenue.toFixed(2)},${r.totalServices},${r.totalProducts},${txns > 0 ? (r.totalRevenue / txns).toFixed(2) : '0'}\n`;
      });
    } else if (reportType === 'stylist-sales' && stylistData) {
      csvContent = 'Rank,Stylist,Total Revenue,Services,Avg Ticket\n';
      stylistData.forEach((s, idx) => {
        csvContent += `${idx + 1},"${s.name}",${s.totalRevenue},${s.totalServices},${Math.round(s.totalRevenue / s.totalServices || 0)}\n`;
      });
    } else if (reportType === 'location-sales' && locationData) {
      csvContent = 'Location,Total Revenue,Services,Products,Transactions\n';
      locationData.forEach(l => {
        csvContent += `"${l.name}",${l.totalRevenue},${l.totalServices},${l.totalProducts},${l.totalServices + l.totalProducts}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartSkeleton lines={4} className="h-32" />
          <ChartSkeleton lines={8} className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {getReportTitle()}
            </CardTitle>
            <CardDescription>
              {formatDate(new Date(dateFrom), 'MMM d, yyyy')} - {formatDate(new Date(dateTo), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size={tokens.button.card} onClick={() => setPreviewOpen(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" size={tokens.button.card} onClick={exportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={generatePDF} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {metrics && (
          <BentoGrid maxPerRow={4} gap="gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-medium"><BlurredAmount>{formatCurrencyWhole(metrics.totalRevenue)}</BlurredAmount></p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Service Revenue</p>
              <p className="text-2xl font-medium"><BlurredAmount>{formatCurrencyWhole(metrics.serviceRevenue)}</BlurredAmount></p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Total Services</p>
              <p className="text-2xl font-medium">{formatNumber(metrics.totalServices)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Average Ticket</p>
              <p className="text-2xl font-medium"><BlurredAmount>{formatCurrencyWhole(Math.round(metrics.averageTicket))}</BlurredAmount></p>
            </div>
          </BentoGrid>
        )}

        {/* Daily Sales Table */}
        {reportType === 'daily-sales' && dailyRows.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Total Revenue</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Service Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Product Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Services</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Products</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Avg Ticket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRows.map(r => {
                  const txns = r.totalServices + r.totalProducts;
                  return (
                    <TableRow key={r.date}>
                      <TableCell className="font-medium">{formatDate(new Date(r.date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right"><BlurredAmount>{formatCurrencyWhole(r.totalRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right"><BlurredAmount>{formatCurrencyWhole(r.serviceRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right"><BlurredAmount>{formatCurrencyWhole(r.productRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right">{formatNumber(r.totalServices)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.totalProducts)}</TableCell>
                      <TableCell className="text-right">{txns > 0 ? <BlurredAmount>{formatCurrencyWhole(Math.round(r.totalRevenue / txns))}</BlurredAmount> : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Data Table */}
        {reportType === 'stylist-sales' && stylistData && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Avg Ticket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stylistData.slice(0, 15).map((s, idx) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{formatCurrencyWhole(s.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{s.totalServices}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyWhole(Math.round(s.totalRevenue / s.totalServices || 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {reportType === 'location-sales' && locationData && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationData.map((l) => (
                  <TableRow key={l.location_id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-right">{formatCurrencyWhole(l.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{l.totalServices}</TableCell>
                    <TableCell className="text-right">{l.totalProducts}</TableCell>
                    <TableCell className="text-right">{l.totalServices + l.totalProducts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <ReportPreviewModal
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      reportTitle={getReportTitle()}
      dateFrom={dateFrom}
      dateTo={dateTo}
    >
      <div className="space-y-6">
        {metrics && (
          <BentoGrid maxPerRow={4} gap="gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-medium"><BlurredAmount>{formatCurrencyWhole(metrics.totalRevenue)}</BlurredAmount></p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Service Revenue</p>
              <p className="text-2xl font-medium"><BlurredAmount>{formatCurrencyWhole(metrics.serviceRevenue)}</BlurredAmount></p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Total Services</p>
              <p className="text-2xl font-medium">{formatNumber(metrics.totalServices)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Average Ticket</p>
              <p className="text-2xl font-medium"><BlurredAmount>{formatCurrencyWhole(Math.round(metrics.averageTicket))}</BlurredAmount></p>
            </div>
          </BentoGrid>
        )}
        {reportType === 'daily-sales' && dailyRows.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Total Revenue</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Service Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Product Rev</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Services</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Products</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Avg Ticket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRows.map(r => {
                  const txns = r.totalServices + r.totalProducts;
                  return (
                    <TableRow key={r.date}>
                      <TableCell className="font-medium">{formatDate(new Date(r.date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right"><BlurredAmount>{formatCurrencyWhole(r.totalRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right"><BlurredAmount>{formatCurrencyWhole(r.serviceRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right"><BlurredAmount>{formatCurrencyWhole(r.productRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right">{formatNumber(r.totalServices)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.totalProducts)}</TableCell>
                      <TableCell className="text-right">{txns > 0 ? <BlurredAmount>{formatCurrencyWhole(Math.round(r.totalRevenue / txns))}</BlurredAmount> : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {reportType === 'stylist-sales' && stylistData && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Avg Ticket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stylistData.slice(0, 15).map((s, idx) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{formatCurrencyWhole(s.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{s.totalServices}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyWhole(Math.round(s.totalRevenue / s.totalServices || 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {reportType === 'location-sales' && locationData && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationData.map((l) => (
                  <TableRow key={l.location_id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-right">{formatCurrencyWhole(l.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{l.totalServices}</TableCell>
                    <TableCell className="text-right">{l.totalProducts}</TableCell>
                    <TableCell className="text-right">{l.totalServices + l.totalProducts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportPreviewModal>
    </>
  );
}
