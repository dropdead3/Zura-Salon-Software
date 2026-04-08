import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, FileSpreadsheet, Loader2, ArrowLeft, DollarSign, Users, UserCheck, ShoppingBag, Target } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import { useSalesMetrics, useSalesByStylist } from '@/hooks/useSalesData';
import { useRetailAnalytics } from '@/hooks/useRetailAnalytics';
import { useSalesGoals } from '@/hooks/useSalesGoals';
import { useStaffKPIReport } from '@/hooks/useStaffKPIReport';

interface EndOfMonthReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function EndOfMonthReport({ dateFrom, dateTo, locationId, onClose }: EndOfMonthReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics({ dateFrom, dateTo, locationId });
  const { data: staffKpi, isLoading: staffLoading } = useStaffKPIReport(dateFrom, dateTo, locationId);
  const { data: retailData, isLoading: retailLoading } = useRetailAnalytics(dateFrom, dateTo, locationId);
  const { goals } = useSalesGoals();

  const isLoading = metricsLoading || staffLoading || retailLoading;

  const goalTarget = goals?.monthlyTarget || 0;
  const goalProgress = goalTarget > 0 ? Math.min(((metrics?.totalRevenue || 0) / goalTarget) * 100, 100) : 0;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'End-of-Month Summary', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      // Revenue summary
      doc.setFontSize(12); doc.setTextColor(0);
      doc.text('Revenue Summary', 14, y); y += 4;
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', formatCurrencyWhole(metrics?.totalRevenue || 0)],
          ['Service Revenue', formatCurrencyWhole(metrics?.serviceRevenue || 0)],
          ['Product Revenue', formatCurrencyWhole(metrics?.productRevenue || 0)],
          ['Total Transactions', (metrics?.totalTransactions || 0).toString()],
          ['Average Ticket', formatCurrencyWhole(metrics?.averageTicket || 0)],
          ['Monthly Goal', goalTarget > 0 ? `${formatCurrencyWhole(goalTarget)} (${Math.round(goalProgress)}% achieved)` : 'Not set'],
        ],
        theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
      });

      // Staff performance
      if (staffKpi && staffKpi.length > 0) {
        y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text('Staff Performance', 14, y); y += 4;
        autoTable(doc, {
          ...branding, startY: y,
          head: [['Staff', 'Revenue', 'Services', 'Avg Ticket', 'Rebook %', 'Retention %', 'New Clients']],
          body: staffKpi.slice(0, 15).map(s => [s.staffName, formatCurrencyWhole(s.totalRevenue), s.totalServices.toString(), formatCurrencyWhole(Math.round(s.averageTicket)), `${s.rebookingRate.toFixed(1)}%`, `${s.retentionRate.toFixed(1)}%`, s.newClients.toString()]),
          theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      // Retail highlights
      if (retailData && retailData.summary.totalRevenue > 0) {
        y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;
        if (y > 170) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text('Retail Highlights', 14, y); y += 4;
        autoTable(doc, {
          ...branding, startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Product Revenue', formatCurrencyWhole(retailData.summary.totalRevenue)],
            ['Units Sold', retailData.summary.totalUnits.toString()],
            ['Attachment Rate', `${retailData.summary.attachmentRate}%`],
            ['Top Product', retailData.products[0]?.name || 'N/A'],
          ],
          theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: 'end-of-month', dateFrom, dateTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'end-of-month', report_name: 'End-of-Month Summary',
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
    let csv = 'End-of-Month Summary\nMetric,Value\n';
    csv += `Total Revenue,${metrics?.totalRevenue || 0}\n`;
    csv += `Service Revenue,${metrics?.serviceRevenue || 0}\n`;
    csv += `Product Revenue,${metrics?.productRevenue || 0}\n`;
    csv += `Transactions,${metrics?.totalTransactions || 0}\n`;
    csv += `Avg Ticket,${metrics?.averageTicket || 0}\n`;
    csv += `\nStaff Performance\nStaff,Revenue,Services,Avg Ticket,Rebook %,Retention %,New Clients\n`;
    (staffKpi || []).forEach(s => { csv += `"${s.staffName}",${s.totalRevenue},${s.totalServices},${Math.round(s.averageTicket)},${s.rebookingRate.toFixed(1)},${s.retentionRate.toFixed(1)},${s.newClients}\n`; });
    if (retailData) {
      csv += `\nRetail\nProduct Revenue,${retailData.summary.totalRevenue}\nUnits Sold,${retailData.summary.totalUnits}\nAttachment Rate,${retailData.summary.attachmentRate}%\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `end-of-month-${dateFrom}-to-${dateTo}.csv`; link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-64" /></CardContent></Card>;
  }

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

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Total Revenue</p></div>
          <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(metrics?.totalRevenue || 0)}</BlurredAmount></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Service Revenue</p>
          <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(metrics?.serviceRevenue || 0)}</BlurredAmount></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Product Revenue</p></div>
          <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(metrics?.productRevenue || 0)}</BlurredAmount></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Avg Ticket</p>
          <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(metrics?.averageTicket || 0)}</BlurredAmount></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Target className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Goal Progress</p></div>
          <p className="text-xl font-display tabular-nums">{goalTarget > 0 ? `${Math.round(goalProgress)}%` : 'N/A'}</p>
          {goalTarget > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">of {formatCurrencyWhole(goalTarget)}</p>}
        </CardContent></Card>
      </div>

      {/* Staff Performance */}
      {staffKpi && staffKpi.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="font-display text-base tracking-wide">STAFF PERFORMANCE</CardTitle>
              <MetricInfoTooltip description="Staff ranked by revenue for the period with key performance indicators." />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Avg Ticket</TableHead>
                  <TableHead className="text-right">Rebook %</TableHead>
                  <TableHead className="text-right">Retention %</TableHead>
                  <TableHead className="text-right">New Clients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffKpi.slice(0, 15).map((s, idx) => (
                  <TableRow key={s.staffId} className={cn(idx === 0 && 'bg-chart-2/[0.03]')}>
                    <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{s.staffName}</TableCell>
                    <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(s.totalRevenue)}</BlurredAmount></TableCell>
                    <TableCell className="text-right tabular-nums">{s.totalServices}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(Math.round(s.averageTicket))}</BlurredAmount></TableCell>
                    <TableCell className="text-right tabular-nums">{s.rebookingRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{s.retentionRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{s.newClients}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Retail Highlights */}
      {retailData && retailData.summary.totalRevenue > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="font-display text-base tracking-wide">RETAIL HIGHLIGHTS</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><p className="text-xs text-muted-foreground">Product Revenue</p><p className="text-lg font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(retailData.summary.totalRevenue)}</BlurredAmount></p></div>
              <div><p className="text-xs text-muted-foreground">Units Sold</p><p className="text-lg font-display tabular-nums">{retailData.summary.totalUnits}</p></div>
              <div><p className="text-xs text-muted-foreground">Attachment Rate</p><p className="text-lg font-display tabular-nums">{retailData.summary.attachmentRate}%</p></div>
              <div><p className="text-xs text-muted-foreground">Unique Products</p><p className="text-lg font-display tabular-nums">{retailData.summary.uniqueProducts}</p></div>
            </div>
            {retailData.products.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Top Product</TableHead><TableHead className="text-right">Units</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {retailData.products.slice(0, 5).map(p => (
                    <TableRow key={p.name}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right tabular-nums">{p.unitsSold}</TableCell><TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(p.revenue)}</BlurredAmount></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
