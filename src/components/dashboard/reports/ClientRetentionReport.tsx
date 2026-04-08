import { useState } from 'react';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
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
import { FileText, Download, Loader2, FileSpreadsheet, AlertTriangle, Eye, DollarSign, TrendingUp, Users, Award } from 'lucide-react';
import { ReportPreviewModal } from '@/components/dashboard/reports/ReportPreviewModal';
import { useClientRetentionReport } from '@/hooks/useClientRetentionReport';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { CLV_TIERS } from '@/lib/clv-calculator';
import { cn } from '@/lib/utils';

interface ClientRetentionReportProps {
  reportType: string;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function ClientRetentionReport({ 
  reportType, 
  dateFrom, 
  dateTo, 
  locationId,
  onClose 
}: ClientRetentionReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const { data: retentionData, isLoading } = useClientRetentionReport(dateFrom, dateTo, locationId);

  const isCLVReport = reportType === 'lifetime-value';

  const getReportTitle = () => {
    switch (reportType) {
      case 'retention': return 'Client Retention Report';
      case 'lifetime-value': return 'Client Lifetime Value';
      case 'new-vs-returning': return 'New vs Returning Clients';
      case 'visit-frequency': return 'Visit Frequency Analysis';
      default: return 'Client Report';
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

      if (retentionData) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');

        if (isCLVReport) {
          // CLV-specific PDF
          doc.text('Portfolio Summary', 14, y);
          y += 8;

          autoTable(doc, {
            ...branding,
            startY: y,
            head: [['Metric', 'Value']],
            body: [
              ['Clients with Reliable CLV', formatNumber(retentionData.clvClients.length)],
              ['Total Portfolio Value', formatCurrencyWhole(Math.round(retentionData.totalPortfolioValue))],
              ['Average Annual CLV', formatCurrencyWhole(Math.round(retentionData.averageCLV))],
              ['Median Annual CLV', formatCurrencyWhole(Math.round(retentionData.medianCLV))],
              ['Top 10% Revenue Share', `${retentionData.top10RevenueShare.toFixed(1)}%`],
              ['Top 50% Revenue Share', `${retentionData.top50RevenueShare.toFixed(1)}%`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [51, 51, 51] },
            margin: { ...branding.margin, left: 14, right: 14 },
          });

          y = (doc as any).lastAutoTable.finalY + 15;

          // Tier distribution
          doc.text('Tier Distribution', 14, y);
          y += 8;

          autoTable(doc, {
            ...branding,
            startY: y,
            head: [['Tier', 'Clients', '% of Clients', 'Annual Value', '% of Value']],
            body: retentionData.clvTierDistribution.map(t => [
              t.label,
              formatNumber(t.count),
              `${t.percentOfClients.toFixed(1)}%`,
              formatCurrencyWhole(Math.round(t.totalAnnualValue)),
              `${t.percentOfValue.toFixed(1)}%`,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [51, 51, 51] },
            margin: { ...branding.margin, left: 14, right: 14 },
          });

          y = (doc as any).lastAutoTable.finalY + 15;

          // Top clients
          if (retentionData.clvClients.length > 0) {
            if (y > 200) { doc.addPage(); y = addReportHeader(doc, headerOpts); }
            doc.text('Top Clients by Annual Value', 14, y);
            y += 8;

            autoTable(doc, {
              ...branding,
              startY: y,
              head: [['Client', 'Tier', 'Annual Value', 'Avg Ticket', 'Visits/Yr', 'Total Spend']],
              body: retentionData.clvClients.slice(0, 25).map(c => [
                c.name,
                CLV_TIERS[c.tier].label,
                formatCurrencyWhole(Math.round(c.annualValue)),
                formatCurrencyWhole(Math.round(c.avgTicket)),
                c.annualFrequency.toFixed(1),
                formatCurrencyWhole(Math.round(c.totalSpend)),
              ]),
              theme: 'striped',
              headStyles: { fillColor: [51, 51, 51] },
              margin: { ...branding.margin, left: 14, right: 14 },
            });
          }
        } else {
          // Original retention PDF
          doc.text('Summary', 14, y);
          y += 8;

          autoTable(doc, {
            ...branding,
            startY: y,
            head: [['Metric', 'Value']],
            body: [
              ['Total Clients', formatNumber(retentionData.totalClients)],
              ['New Clients', formatNumber(retentionData.newClients)],
              ['Returning Clients', formatNumber(retentionData.returningClients)],
              ['Retention Rate', `${retentionData.retentionRate.toFixed(1)}%`],
              ['At-Risk Clients', formatNumber(retentionData.atRiskClients)],
              ['Average LTV', formatCurrencyWhole(Math.round(retentionData.averageLTV))],
            ],
            theme: 'striped',
            headStyles: { fillColor: [51, 51, 51] },
            margin: { ...branding.margin, left: 14, right: 14 },
          });

          y = (doc as any).lastAutoTable.finalY + 15;

          if (retentionData.atRiskClientsList && retentionData.atRiskClientsList.length > 0) {
            if (y > 220) { doc.addPage(); y = addReportHeader(doc, headerOpts); }
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('At-Risk Clients', 14, y);
            y += 8;

            autoTable(doc, {
              ...branding,
              startY: y,
              head: [['Client', 'Last Visit', 'Days Since', 'Total Spend']],
              body: retentionData.atRiskClientsList.slice(0, 20).map(client => [
                client.name,
                formatDate(new Date(client.lastVisit), 'MMM d, yyyy'),
                client.daysSinceVisit.toString(),
                formatCurrencyWhole(client.totalSpend),
              ]),
              theme: 'striped',
              headStyles: { fillColor: [51, 51, 51] },
              margin: { ...branding.margin, left: 14, right: 14 },
            });
          }
        }
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
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    if (isCLVReport && retentionData?.clvClients) {
      let csvContent = 'Client,Tier,Annual Value,Lifetime Value,Avg Ticket,Visits/Yr,Total Spend,Last Visit\n';
      retentionData.clvClients.forEach(c => {
        csvContent += `"${c.name}","${CLV_TIERS[c.tier].label}",${Math.round(c.annualValue)},${Math.round(c.lifetimeValue)},${Math.round(c.avgTicket)},${c.annualFrequency.toFixed(1)},${Math.round(c.totalSpend)},"${c.lastVisit || ''}"\n`;
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clv-report-${dateFrom}-to-${dateTo}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
      return;
    }

    if (!retentionData?.atRiskClientsList) return;
    let csvContent = 'Client,Last Visit,Days Since,Total Spend\n';
    retentionData.atRiskClientsList.forEach(client => {
      csvContent += `"${client.name}","${format(new Date(client.lastVisit), 'yyyy-MM-dd')}",${client.daysSinceVisit},${client.totalSpend}\n`;
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

  const clvReportBody = retentionData ? (
    <>
      {/* Portfolio Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Clients with CLV</p>
          </div>
          <p className="text-2xl font-medium">{formatNumber(retentionData.clvClients.length)}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Avg Annual CLV</p>
          </div>
          <p className="text-2xl font-medium">{formatCurrencyWhole(Math.round(retentionData.averageCLV))}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Portfolio Value</p>
          </div>
          <p className="text-2xl font-medium">{formatCurrencyWhole(Math.round(retentionData.totalPortfolioValue))}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Top 10% = Revenue</p>
          </div>
          <p className="text-2xl font-medium">{retentionData.top10RevenueShare.toFixed(1)}%</p>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Tier Distribution
        </h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">% of Clients</TableHead>
                <TableHead className="text-right">Annual Value</TableHead>
                <TableHead className="text-right">% of Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retentionData.clvTierDistribution.map(t => {
                const tierConfig = CLV_TIERS[t.tier];
                return (
                  <TableRow key={t.tier}>
                    <TableCell>
                      <Badge className={cn("text-xs border-0", tierConfig.color, tierConfig.bgColor)}>
                        {t.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(t.count)}</TableCell>
                    <TableCell className="text-right">{t.percentOfClients.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrencyWhole(Math.round(t.totalAnnualValue))}</TableCell>
                    <TableCell className="text-right">{t.percentOfValue.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Visual bar chart */}
        <div className="space-y-2 px-1">
          {retentionData.clvTierDistribution.map(t => {
            const tierConfig = CLV_TIERS[t.tier];
            return (
              <div key={t.tier} className="flex items-center gap-3">
                <span className={cn("text-xs w-16 font-medium", tierConfig.color)}>{t.label}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", tierConfig.bgColor)}
                    style={{ width: `${Math.max(t.percentOfValue, 2)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{t.percentOfValue.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Clients by CLV */}
      {retentionData.clvClients.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Top Clients by Annual Value
          </h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Annual Value</TableHead>
                  <TableHead className="text-right">Avg Ticket</TableHead>
                  <TableHead className="text-right">Visits/Yr</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retentionData.clvClients.slice(0, 25).map((client, idx) => {
                  const tierConfig = CLV_TIERS[client.tier];
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px] px-1.5 py-0 border-0", tierConfig.color, tierConfig.bgColor)}>
                          {tierConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrencyWhole(Math.round(client.annualValue))}</TableCell>
                      <TableCell className="text-right">{formatCurrencyWhole(Math.round(client.avgTicket))}</TableCell>
                      <TableCell className="text-right">{client.annualFrequency.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyWhole(Math.round(client.totalSpend))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {retentionData.clvClients.length > 25 && (
            <p className="text-xs text-muted-foreground text-center">
              Showing top 25 of {retentionData.clvClients.length} clients. Export CSV for full list.
            </p>
          )}
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>No client data available for CLV analysis</p>
    </div>
  );

  const retentionReportBody = retentionData ? (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Total Clients</p>
          <p className="text-2xl font-medium">{formatNumber(retentionData.totalClients)}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Retention Rate</p>
          <p className="text-2xl font-medium">{retentionData.retentionRate.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">New Clients</p>
          <p className="text-2xl font-medium">{formatNumber(retentionData.newClients)}</p>
        </div>
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Average LTV</p>
          <p className="text-2xl font-medium">{formatCurrencyWhole(Math.round(retentionData.averageLTV))}</p>
        </div>
      </div>

      {/* At-Risk Clients */}
      {retentionData.atRiskClientsList && retentionData.atRiskClientsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium">At-Risk Clients ({retentionData.atRiskClients})</h3>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="text-right">Days Since</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retentionData.atRiskClientsList.slice(0, 10).map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{formatDate(new Date(client.lastVisit), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <span className={client.daysSinceVisit > 90 ? 'text-red-500' : 'text-amber-500'}>
                        {client.daysSinceVisit} days
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrencyWhole(client.totalSpend)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>No client data available for this period</p>
    </div>
  );

  const reportBody = isCLVReport ? clvReportBody : retentionReportBody;

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
