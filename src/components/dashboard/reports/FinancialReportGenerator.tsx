import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Eye, FileSpreadsheet, Loader2 } from 'lucide-react';
import { ReportPreviewModal } from '@/components/dashboard/reports/ReportPreviewModal';
import { useSalesTrend } from '@/hooks/useSalesData';
import { useSalesGoals } from '@/hooks/useSalesGoals';
import { useGoalPeriodRevenue } from '@/hooks/useGoalPeriodRevenue';
import { useComparisonData, getPresetPeriods } from '@/hooks/useComparisonData';
import { usePayrollForecasting } from '@/hooks/usePayrollForecasting';
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
import { EmptyDataBanner } from '@/components/ui/EmptyDataBanner';

interface FinancialReportGeneratorProps {
  reportType: string;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function FinancialReportGenerator({
  reportType,
  dateFrom,
  dateTo,
  locationId,
  onClose,
  dateRangeKey,
}: FinancialReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);

  const { data: trendData, isLoading: trendLoading } = useSalesTrend(dateFrom, dateTo, locationId);
  const goals = useSalesGoals().goals;
  const { data: weeklyRevenue } = useGoalPeriodRevenue('weekly', locationId);
  const { data: monthlyRevenue } = useGoalPeriodRevenue('monthly', locationId);

  const yoyPeriods = getPresetPeriods('thisYear-lastYear');
  const { data: yoyData, isLoading: yoyLoading } = useComparisonData({
    mode: 'yoy',
    periodA: yoyPeriods.periodA,
    periodB: yoyPeriods.periodB,
  });

  const { projection, isLoading: commissionLoading } = usePayrollForecasting();

  const getReportTitle = () => {
    switch (reportType) {
      case 'revenue-trend':
        return 'Revenue Trend';
      case 'commission':
        return 'Commission Report';
      case 'goals':
        return 'Goal Progress';
      case 'yoy':
        return 'Year-over-Year Comparison';
      default:
        return 'Financial Report';
    }
  };

  const isLoading =
    (reportType === 'revenue-trend' && trendLoading) ||
    (reportType === 'goals' && (weeklyRevenue === undefined || monthlyRevenue === undefined)) ||
    (reportType === 'yoy' && yoyLoading) ||
    (reportType === 'commission' && commissionLoading);

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

      const ensureSpace = () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (y > pageHeight - 40) {
          doc.addPage();
          y = addReportHeader(doc, headerOpts);
        }
      };

      if (reportType === 'revenue-trend' && trendData?.overall?.length) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Revenue', 14, y);
        y += 8;
        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Date', 'Revenue', 'Transactions']],
          body: trendData.overall.slice(-31).map((row: { date: string; revenue: number; transactions: number }) => [
            formatDate(new Date(row.date), 'MMM d, yyyy'),
            formatCurrency(row.revenue),
            row.transactions.toString(),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        ensureSpace();
      }

      if (reportType === 'goals' && goals) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Goal Progress', 14, y);
        y += 8;
        const weeklyActual = weeklyRevenue ?? 0;
        const monthlyActual = monthlyRevenue ?? 0;
        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Period', 'Target', 'Actual', 'Progress']],
          body: [
            [
              'Weekly',
              formatCurrency(goals.weeklyTarget),
              formatCurrency(weeklyActual),
              `${goals.weeklyTarget > 0 ? ((weeklyActual / goals.weeklyTarget) * 100).toFixed(1) : 0}%`,
            ],
            [
              'Monthly',
              formatCurrency(goals.monthlyTarget),
              formatCurrency(monthlyActual),
              `${goals.monthlyTarget > 0 ? ((monthlyActual / goals.monthlyTarget) * 100).toFixed(1) : 0}%`,
            ],
          ],
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        ensureSpace();
      }

      if (reportType === 'yoy' && yoyData) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Year-over-Year Comparison', 14, y);
        y += 8;
        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Metric', 'This Year', 'Last Year', 'Change %']],
          body: [
            [
              'Total Revenue',
              formatCurrency(yoyData.periodA.totalRevenue),
              formatCurrency(yoyData.periodB.totalRevenue),
              `${yoyData.changes.totalRevenue >= 0 ? '+' : ''}${yoyData.changes.totalRevenue.toFixed(1)}%`,
            ],
            [
              'Transactions',
              yoyData.periodA.totalTransactions.toString(),
              yoyData.periodB.totalTransactions.toString(),
              `${yoyData.changes.totalTransactions >= 0 ? '+' : ''}${yoyData.changes.totalTransactions.toFixed(1)}%`,
            ],
            [
              'Avg Ticket',
              formatCurrency(Math.round(yoyData.periodA.averageTicket)),
              formatCurrency(Math.round(yoyData.periodB.averageTicket)),
              `${yoyData.changes.averageTicket >= 0 ? '+' : ''}${yoyData.changes.averageTicket.toFixed(1)}%`,
            ],
          ],
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        ensureSpace();
      }

      if (reportType === 'commission' && projection?.byEmployee?.length) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Projected Commission by Staff', 14, y);
        y += 8;
        autoTable(doc, {
          ...branding,
          startY: y,
          head: [['Staff', 'Service Commission', 'Product Commission', 'Total Gross']],
          body: projection.byEmployee.map(
            (emp: {
              employeeName: string;
              projectedCompensation: { serviceCommission: number; productCommission: number; totalGross: number };
            }) => [
              emp.employeeName,
              formatCurrency(emp.projectedCompensation.serviceCommission),
              formatCurrency(emp.projectedCompensation.productCommission),
              formatCurrency(emp.projectedCompensation.totalGross),
            ]
          ),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      addReportFooter(doc);

      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: reportType, dateFrom, dateTo }));

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
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    let csvContent = '';

    if (reportType === 'revenue-trend' && trendData?.overall?.length) {
      csvContent = 'Date,Revenue,Transactions\n';
      trendData.overall.slice(-31).forEach((row: { date: string; revenue: number; transactions: number }) => {
        csvContent += `"${formatDate(new Date(row.date), 'yyyy-MM-dd')}",${row.revenue},${row.transactions}\n`;
      });
    }

    if (reportType === 'goals' && goals) {
      const weeklyActual = weeklyRevenue ?? 0;
      const monthlyActual = monthlyRevenue ?? 0;
      csvContent = 'Period,Target,Actual,Progress\n';
      csvContent += `Weekly,${goals.weeklyTarget},${weeklyActual},${goals.weeklyTarget > 0 ? ((weeklyActual / goals.weeklyTarget) * 100).toFixed(1) : 0}%\n`;
      csvContent += `Monthly,${goals.monthlyTarget},${monthlyActual},${goals.monthlyTarget > 0 ? ((monthlyActual / goals.monthlyTarget) * 100).toFixed(1) : 0}%\n`;
    }

    if (reportType === 'yoy' && yoyData) {
      csvContent = 'Metric,This Year,Last Year,Change %\n';
      csvContent += `Total Revenue,${yoyData.periodA.totalRevenue},${yoyData.periodB.totalRevenue},${yoyData.changes.totalRevenue.toFixed(1)}%\n`;
      csvContent += `Transactions,${yoyData.periodA.totalTransactions},${yoyData.periodB.totalTransactions},${yoyData.changes.totalTransactions.toFixed(1)}%\n`;
      csvContent += `Avg Ticket,${Math.round(yoyData.periodA.averageTicket)},${Math.round(yoyData.periodB.averageTicket)},${yoyData.changes.averageTicket.toFixed(1)}%\n`;
    }

    if (reportType === 'commission' && projection?.byEmployee?.length) {
      csvContent = 'Staff,Service Commission,Product Commission,Total Gross\n';
      projection.byEmployee.forEach(
        (emp: {
          employeeName: string;
          projectedCompensation: { serviceCommission: number; productCommission: number; totalGross: number };
        }) => {
          csvContent += `"${emp.employeeName}",${emp.projectedCompensation.serviceCommission},${emp.projectedCompensation.productCommission},${emp.projectedCompensation.totalGross}\n`;
        }
      );
    }

    if (!csvContent) {
      toast.error('No data available to export');
      return;
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
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base tracking-wide">{getReportTitle()}</CardTitle>
          <CardDescription><ReportDateSubtitle dateFrom={dateFrom} dateTo={dateTo} dateRangeKey={dateRangeKey} /></CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const reportBody = (
    <>
      {reportType === 'revenue-trend' && trendData?.overall?.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Daily revenue (last 31 days)</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trendData.overall
                .slice(-31)
                .reverse()
                .map((row: { date: string; revenue: number; transactions: number }) => (
                  <TableRow key={row.date}>
                    <TableCell>{formatDate(new Date(row.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrency(row.revenue)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.transactions}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {reportType === 'revenue-trend' && !trendData?.overall?.length && (
        <div className="py-4">
          <EmptyDataBanner />
        </div>
      )}

      {reportType === 'goals' && goals && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Weekly</TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(goals.weeklyTarget)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(weeklyRevenue ?? 0)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {goals.weeklyTarget > 0 ? `${(((weeklyRevenue ?? 0) / goals.weeklyTarget) * 100).toFixed(1)}%` : '—'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Monthly</TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(goals.monthlyTarget)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(monthlyRevenue ?? 0)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {goals.monthlyTarget > 0 ? `${(((monthlyRevenue ?? 0) / goals.monthlyTarget) * 100).toFixed(1)}%` : '—'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {reportType === 'yoy' && yoyData && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">This Year</TableHead>
                <TableHead className="text-right">Last Year</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Total Revenue</TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(yoyData.periodA.totalRevenue)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(yoyData.periodB.totalRevenue)}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {yoyData.changes.totalRevenue >= 0 ? '+' : ''}
                  {yoyData.changes.totalRevenue.toFixed(1)}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Transactions</TableCell>
                <TableCell className="text-right tabular-nums">{yoyData.periodA.totalTransactions}</TableCell>
                <TableCell className="text-right tabular-nums">{yoyData.periodB.totalTransactions}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {yoyData.changes.totalTransactions >= 0 ? '+' : ''}
                  {yoyData.changes.totalTransactions.toFixed(1)}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Avg Ticket</TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(Math.round(yoyData.periodA.averageTicket))}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <BlurredAmount>{formatCurrency(Math.round(yoyData.periodB.averageTicket))}</BlurredAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {yoyData.changes.averageTicket >= 0 ? '+' : ''}
                  {yoyData.changes.averageTicket.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {reportType === 'commission' && projection?.byEmployee?.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Current pay period: {projection.periodLabel}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Service Commission</TableHead>
                <TableHead className="text-right">Product Commission</TableHead>
                <TableHead className="text-right">Total Gross</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.byEmployee.map(
                (emp: {
                  employeeName: string;
                  projectedCompensation: { serviceCommission: number; productCommission: number; totalGross: number };
                }) => (
                  <TableRow key={emp.employeeName}>
                    <TableCell>{emp.employeeName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrency(emp.projectedCompensation.serviceCommission)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrency(emp.projectedCompensation.productCommission)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrency(emp.projectedCompensation.totalGross)}</BlurredAmount>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {reportType === 'commission' && !projection?.byEmployee?.length && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No commission data for the current pay period. Connect payroll or add staff with commission settings.
        </p>
      )}

      {reportType === 'yoy' && !yoyData && (
        <p className="text-sm text-muted-foreground py-8 text-center">No comparison data available.</p>
      )}

      {reportType === 'goals' && !goals && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No goals set. Set weekly and monthly targets in Sales settings.
        </p>
      )}

      {reportType === 'commission' && !projection && !commissionLoading && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Payroll forecasting not available. Check pay schedule and commission settings.
        </p>
      )}
    </>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base tracking-wide">{getReportTitle()}</CardTitle>
              <CardDescription>
                <ReportDateSubtitle dateFrom={dateFrom} dateTo={dateTo} dateRangeKey={dateRangeKey} />
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={onClose}>
                Close
              </Button>
              <Button variant="outline" size={tokens.button.card} onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" />
                <span className="ml-2">Preview</span>
              </Button>
              <Button variant="outline" size={tokens.button.card} onClick={exportCSV}>
                <FileSpreadsheet className="h-4 w-4" />
                <span className="ml-2">CSV</span>
              </Button>
              <Button size={tokens.button.card} onClick={generatePDF} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="ml-2">PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{reportBody}</CardContent>
      </Card>

      <ReportPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        reportTitle={getReportTitle()}
        dateFrom={dateFrom}
        dateTo={dateTo}
      >
        {reportBody}
      </ReportPreviewModal>
    </>
  );
}
