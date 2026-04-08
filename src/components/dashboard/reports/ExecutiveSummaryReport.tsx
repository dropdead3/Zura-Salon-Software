import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, FileSpreadsheet, Loader2, ArrowLeft } from 'lucide-react';
import { useSalesMetrics, useSalesByLocation } from '@/hooks/useSalesData';
import { useLocations } from '@/hooks/useLocations';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportFooter, addReportHeader, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { toast } from 'sonner';
import { ReportDateSubtitle } from '@/components/dashboard/reports/ReportDateSubtitle';

interface ExecutiveSummaryReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function ExecutiveSummaryReport({ dateFrom, dateTo, locationId, onClose, dateRangeKey }: ExecutiveSummaryReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);

  const filters = { dateFrom, dateTo, locationId: locationId || 'all' };
  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics(filters);
  const { data: locationData, isLoading: locationLoading } = useSalesByLocation(dateFrom, dateTo);
  const { data: locations } = useLocations();

  const isLoading = metricsLoading || locationLoading;
  const isMultiLocation = (locations?.filter(l => l.is_active)?.length ?? 0) > 1;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = {
        orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization',
        logoDataUrl,
        reportTitle: 'Executive Summary',
        dateFrom,
        dateTo,
        locationInfo,
      } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Organization Overview', 14, y);
      y += 8;

      autoTable(doc, {
        ...branding,
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', formatCurrency(metrics?.totalRevenue ?? 0)],
          ['Total Transactions', String(metrics?.totalTransactions ?? 0)],
          ['Avg Ticket', formatCurrency(metrics?.averageTicket ?? 0)],
          ['Service Hours', `${(metrics?.totalServiceHours ?? 0).toFixed(1)}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51] },
        margin: { ...branding.margin, left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 12;

      if (isMultiLocation && locationData?.length) {
        doc.setFont('helvetica', 'bold');
        doc.text('Revenue by Location', 14, y);
        y += 8;

        const sorted = [...locationData].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Location', 'Revenue', 'Appointments', 'Avg Ticket']],
          body: sorted.map(loc => [
            loc.locationName || 'Unknown',
            formatCurrency(loc.revenue ?? 0),
            String(loc.appointments ?? 0),
            formatCurrency(loc.appointments ? (loc.revenue ?? 0) / loc.appointments : 0),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: 'executive-summary', dateFrom, dateTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'executive-summary',
          report_name: 'Executive Summary',
          date_from: dateFrom,
          date_to: dateTo,
          parameters: { locationId },
          generated_by: user.id,
          organization_id: effectiveOrganization?.id ?? null,
        });
      }

      toast.success('Executive Summary downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    let csv = 'Metric,Value\n';
    csv += `Total Revenue,${metrics?.totalRevenue ?? 0}\n`;
    csv += `Total Transactions,${metrics?.totalTransactions ?? 0}\n`;
    csv += `Avg Ticket,${metrics?.averageTicket ?? 0}\n`;
    csv += `Service Hours,${(metrics?.totalServiceHours ?? 0).toFixed(1)}\n`;

    if (isMultiLocation && locationData?.length) {
      csv += '\nLocation,Revenue,Appointments,Avg Ticket\n';
      locationData.forEach(loc => {
        csv += `"${loc.locationName || 'Unknown'}",${loc.revenue ?? 0},${loc.appointments ?? 0},${loc.appointments ? ((loc.revenue ?? 0) / loc.appointments).toFixed(2) : 0}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `executive-summary-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-display text-base">Executive Summary</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back to Reports
      </button>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base tracking-wide">Executive Summary</CardTitle>
              <CardDescription>
                <ReportDateSubtitle dateFrom={dateFrom} dateTo={dateTo} dateRangeKey={dateRangeKey} />
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV
              </Button>
              <Button size={tokens.button.card} onClick={generatePDF} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider mb-3">Organization Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: formatCurrency(metrics?.totalRevenue ?? 0) },
                { label: 'Transactions', value: String(metrics?.totalTransactions ?? 0) },
                { label: 'Avg Ticket', value: formatCurrency(metrics?.averageTicket ?? 0) },
                { label: 'Service Hours', value: `${(metrics?.totalServiceHours ?? 0).toFixed(1)}` },
              ].map(m => (
                <div key={m.label} className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-medium tabular-nums mt-0.5">
                    <BlurredAmount>{m.value}</BlurredAmount>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Location */}
          {isMultiLocation && locationData && locationData.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider mb-3">Revenue by Location</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead className="text-right">Avg Ticket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...locationData]
                    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
                    .map((loc, i) => (
                      <TableRow key={i}>
                        <TableCell>{loc.locationName || 'Unknown'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <BlurredAmount>{formatCurrency(loc.revenue ?? 0)}</BlurredAmount>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{loc.appointments ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <BlurredAmount>
                            {formatCurrency(loc.appointments ? (loc.revenue ?? 0) / loc.appointments : 0)}
                          </BlurredAmount>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
