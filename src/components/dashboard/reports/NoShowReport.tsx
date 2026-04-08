import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { FileText, Download, Loader2, FileSpreadsheet, Clock, Eye } from 'lucide-react';
import { ReportPreviewModal } from '@/components/dashboard/reports/ReportPreviewModal';
import { useNoShowReport } from '@/hooks/useNoShowReport';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { toast } from 'sonner';
import { ReportDateSubtitle } from '@/components/dashboard/reports/ReportDateSubtitle';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { EmptyDataBanner } from '@/components/ui/EmptyDataBanner';

interface NoShowReportProps {
  reportType: string;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function NoShowReport({ 
  reportType, 
  dateFrom, 
  dateTo, 
  locationId,
  onClose,
  dateRangeKey
}: NoShowReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const { data: noShowData, isLoading } = useNoShowReport(dateFrom, dateTo, locationId);

  const getReportTitle = () => {
    switch (reportType) {
      case 'no-show': return 'No-Show Report';
      case 'service-duration': return 'Service Duration Analysis';
      case 'lead-time': return 'Appointment Lead Time';
      default: return 'Operations Report';
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

      // Summary
      if (noShowData) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, y);
        y += 8;

        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total Appointments', formatNumber(noShowData.totalAppointments)],
            ['No-Shows', formatNumber(noShowData.noShows)],
            ['No-Show Rate', `${noShowData.noShowRate.toFixed(1)}%`],
            ['Cancellations', formatNumber(noShowData.cancellations)],
            ['Cancellation Rate', `${noShowData.cancellationRate.toFixed(1)}%`],
            ['Revenue Lost (Est.)', formatCurrencyWhole(noShowData.revenueLost)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        // By Day of Week
        if (noShowData.byDayOfWeek && noShowData.byDayOfWeek.length > 0) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('No-Shows by Day of Week', 14, y);
          y += 8;

          autoTable(doc, {
            ...branding,
            startY: y,
            head: [['Day', 'Total Appts', 'No-Shows', 'No-Show Rate']],
            body: noShowData.byDayOfWeek.map(day => [
              day.dayName,
              day.total.toString(),
              day.noShows.toString(),
              `${day.rate.toFixed(1)}%`,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [51, 51, 51] },
            margin: { ...branding.margin, left: 14, right: 14 },
          });
        }
      }

      addReportFooter(doc);

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
    if (!noShowData?.byDayOfWeek) return;
    
    let csvContent = 'Day,Total Appointments,No-Shows,No-Show Rate\n';
    noShowData.byDayOfWeek.forEach(day => {
      csvContent += `"${day.dayName}",${day.total},${day.noShows},${day.rate.toFixed(1)}\n`;
    });

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

  const reportBody = noShowData ? (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Total Appointments</p>
          <p className="text-2xl font-medium">{formatNumber(noShowData.totalAppointments)}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">No-Show Rate</p>
          <p className="text-2xl font-medium text-destructive">{noShowData.noShowRate.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Cancellation Rate</p>
          <p className="text-2xl font-medium text-warning-foreground">{noShowData.cancellationRate.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Est. Revenue Lost</p>
          <p className="text-2xl font-medium text-destructive">{formatCurrencyWhole(noShowData.revenueLost)}</p>
        </div>
      </div>

      {/* By Day of Week */}
      {noShowData.byDayOfWeek && noShowData.byDayOfWeek.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">No-Shows by Day of Week</h3>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Total Appts</TableHead>
                  <TableHead className="text-right">No-Shows</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noShowData.byDayOfWeek.map((day) => (
                  <TableRow key={day.dayName}>
                    <TableCell className="font-medium">{day.dayName}</TableCell>
                    <TableCell className="text-right">{day.total}</TableCell>
                    <TableCell className="text-right">{day.noShows}</TableCell>
                    <TableCell className="text-right">
                      <span className={day.rate > 10 ? 'text-destructive' : day.rate > 5 ? 'text-warning-foreground' : ''}>
                        {day.rate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  ) : (
    <div className="py-4">
      <EmptyDataBanner />
    </div>
  );

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
                <ReportDateSubtitle dateFrom={dateFrom} dateTo={dateTo} dateRangeKey={dateRangeKey} />
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
        <CardContent className="space-y-6">{reportBody}</CardContent>
      </Card>

      <ReportPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportTitle={getReportTitle()}
        dateFrom={dateFrom}
        dateTo={dateTo}
      >
        <div className="space-y-6">{reportBody}</div>
      </ReportPreviewModal>
    </>
  );
}
