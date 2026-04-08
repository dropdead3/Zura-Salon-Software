import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatDate } from '@/hooks/useFormatDate';
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
import { FileText, Download, Loader2, FileSpreadsheet, Eye } from 'lucide-react';
import { ReportPreviewModal } from '@/components/dashboard/reports/ReportPreviewModal';
import { useStaffKPIReport } from '@/hooks/useStaffKPIReport';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface StaffKPIReportProps {
  reportType: string;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function StaffKPIReport({ 
  reportType, 
  dateFrom, 
  dateTo, 
  locationId,
  onClose 
}: StaffKPIReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const { data: kpiData, isLoading } = useStaffKPIReport(dateFrom, dateTo, locationId);

  const getReportTitle = () => {
    switch (reportType) {
      case 'staff-kpi': return 'Staff KPI Report';
      case 'productivity': return 'Productivity Report';
      case 'rebooking': return 'Rebooking Analysis';
      case 'new-clients': return 'New Client Acquisition';
      default: return 'Staff Report';
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
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
      const y = addReportHeader(doc, headerOpts);

      // KPI Table
      if (kpiData && kpiData.length > 0) {
        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Staff', 'Revenue', 'Services', 'Avg Ticket', 'Rebooking %', 'Retention %', 'New Clients']],
          body: kpiData.map(staff => [
            staff.staffName,
            formatCurrencyWhole(staff.totalRevenue),
            staff.totalServices.toString(),
            formatCurrencyWhole(Math.round(staff.averageTicket)),
            `${staff.rebookingRate.toFixed(1)}%`,
            `${staff.retentionRate.toFixed(1)}%`,
            staff.newClients.toString(),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
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
    if (!kpiData) return;
    
    let csvContent = 'Staff,Revenue,Services,Avg Ticket,Rebooking %,Retention %,New Clients\n';
    kpiData.forEach(staff => {
      csvContent += `"${staff.staffName}",${staff.totalRevenue},${staff.totalServices},${Math.round(staff.averageTicket)},${staff.rebookingRate.toFixed(1)},${staff.retentionRate.toFixed(1)},${staff.newClients}\n`;
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
          <ChartSkeleton lines={8} className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const reportTable =
    kpiData && kpiData.length > 0 ? (
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Services</TableHead>
              <TableHead className="text-right">Avg Ticket</TableHead>
              <TableHead className="text-right">Rebooking %</TableHead>
              <TableHead className="text-right">Retention %</TableHead>
              <TableHead className="text-right">New Clients</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kpiData.map((staff) => (
              <TableRow key={staff.staffId}>
                <TableCell className="font-medium">{staff.staffName}</TableCell>
                <TableCell className="text-right">{formatCurrencyWhole(staff.totalRevenue)}</TableCell>
                <TableCell className="text-right">{staff.totalServices}</TableCell>
                <TableCell className="text-right">{formatCurrencyWhole(Math.round(staff.averageTicket))}</TableCell>
                <TableCell className="text-right">{staff.rebookingRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{staff.retentionRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{staff.newClients}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No staff performance data available for this period</p>
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
        <CardContent>{reportTable}</CardContent>
      </Card>

      <ReportPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportTitle={getReportTitle()}
        dateFrom={dateFrom}
        dateTo={dateTo}
      >
        {reportTable}
      </ReportPreviewModal>
    </>
  );
}
