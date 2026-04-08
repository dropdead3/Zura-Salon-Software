import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { DollarSign, Download, FileSpreadsheet, Loader2, ArrowLeft, Building2, Users, Wallet } from 'lucide-react';
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
import { useResolveCommission } from '@/hooks/useResolveCommission';
import { useSalesByStylist } from '@/hooks/useSalesData';
import { useExpectedRentRevenue } from '@/hooks/useExpectedRentRevenue';
import { useHasRenters } from '@/hooks/useHasRenters';
import { usePaySchedule } from '@/hooks/usePaySchedule';
import { format } from 'date-fns';

interface PayrollSummaryReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

export function PayrollSummaryReport({ dateFrom, dateTo, locationId, onClose }: PayrollSummaryReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);

  const { resolveCommission, isLoading: resolverLoading } = useResolveCommission();
  const { currentPeriod } = usePaySchedule();
  const payFrom = currentPeriod?.periodStart ? format(currentPeriod.periodStart, 'yyyy-MM-dd') : dateFrom;
  const payTo = currentPeriod?.periodEnd ? format(currentPeriod.periodEnd, 'yyyy-MM-dd') : dateTo;

  const { data: stylistData, isLoading: stylistLoading } = useSalesByStylist(payFrom, payTo);
  const { data: rentData, isLoading: rentLoading } = useExpectedRentRevenue(payFrom, payTo);
  const { data: hasRenters } = useHasRenters();

  const isLoading = resolverLoading || stylistLoading || rentLoading;

  const commissionRows = (stylistData || []).map(s => {
    const resolved = resolveCommission(s.user_id, s.serviceRevenue, s.productRevenue);
    return { name: s.name, serviceRevenue: s.serviceRevenue, productRevenue: s.productRevenue, tier: resolved.sourceName, commission: resolved.totalCommission };
  }).sort((a, b) => b.commission - a.commission);

  const totalCommission = commissionRows.reduce((s, r) => s + r.commission, 0);
  const totalServiceRev = commissionRows.reduce((s, r) => s + r.serviceRevenue, 0);
  const totalProductRev = commissionRows.reduce((s, r) => s + r.productRevenue, 0);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Payroll Summary Report', dateFrom: payFrom, dateTo: payTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      // Summary line
      doc.setFontSize(10); doc.setTextColor(100);
      const summaryParts = [`Total Commission: ${formatCurrencyWhole(totalCommission)}`];
      if (hasRenters) {
        summaryParts.push(`Expected Rent: ${formatCurrencyWhole(rentData?.expectedRent || 0)}`);
        summaryParts.push(`Collected Rent: ${formatCurrencyWhole(rentData?.collectedRent || 0)}`);
      }
      doc.text(summaryParts.join('  |  '), 14, y);
      y += 8;

      // Commission table
      doc.setFontSize(12); doc.setTextColor(0);
      doc.text('Staff Commission', 14, y); y += 4;
      autoTable(doc, {
        ...branding, startY: y,
        head: [['Staff', 'Service Revenue', 'Product Revenue', 'Level', 'Commission']],
        body: commissionRows.map(r => [r.name, formatCurrencyWhole(r.serviceRevenue), formatCurrencyWhole(r.productRevenue), r.tier || '--', formatCurrencyWhole(Math.round(r.commission))]),
        foot: [['Total', formatCurrencyWhole(totalServiceRev), formatCurrencyWhole(totalProductRev), '', formatCurrencyWhole(Math.round(totalCommission))]],
        theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
      });

      // Rent section
      if (rentData && rentData.activeRenterCount > 0) {
        y = (doc as any).lastAutoTable?.finalY + 12 || y + 80;
        if (y > 170) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text('Rent Summary', 14, y); y += 4;
        autoTable(doc, {
          ...branding, startY: y,
          head: [['Metric', 'Amount']],
          body: [
            ['Active Renters', rentData.activeRenterCount.toString()],
            ['Expected Rent', formatCurrencyWhole(rentData.expectedRent)],
            ['Collected Rent', formatCurrencyWhole(rentData.collectedRent)],
            ['Collection Rate', `${rentData.collectionRate}%`],
          ],
          theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, margin: { ...branding.margin, left: 14, right: 14 },
        });
      }

      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: 'payroll-summary', dateFrom: payFrom, dateTo: payTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'payroll-summary', report_name: 'Payroll Summary Report',
          date_from: payFrom, date_to: payTo, parameters: { locationId },
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
    let csv = 'Staff,Service Revenue,Product Revenue,Level,Commission\n';
    commissionRows.forEach(r => { csv += `"${r.name}",${r.serviceRevenue},${r.productRevenue},"${r.tier}",${Math.round(r.commission)}\n`; });
    csv += `\nTotal,${totalServiceRev},${totalProductRev},,${Math.round(totalCommission)}\n`;
    if (hasRenters && rentData && rentData.activeRenterCount > 0) {
      csv += `\nRent Summary\nActive Renters,${rentData.activeRenterCount}\nExpected Rent,${rentData.expectedRent}\nCollected Rent,${rentData.collectedRent}\nCollection Rate,${rentData.collectionRate}%\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `payroll-summary-${payFrom}-to-${payTo}.csv`; link.click();
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

      {/* Summary KPIs */}
      <div className={cn("grid grid-cols-2 gap-4", hasRenters ? "md:grid-cols-4" : "md:grid-cols-2")}>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Wallet className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Commission Liability</p></div>
          <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(totalCommission)}</BlurredAmount></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Staff Count</p></div>
          <p className="text-xl font-display tabular-nums">{commissionRows.length}</p>
        </CardContent></Card>
        {hasRenters && (
          <>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1"><Building2 className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Expected Rent</p></div>
              <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(rentData?.expectedRent || 0)}</BlurredAmount></p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider">Collected Rent</p></div>
              <p className="text-xl font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(rentData?.collectedRent || 0)}</BlurredAmount></p>
              {rentData && rentData.collectionRate < 100 && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{rentData.collectionRate}% collected</p>}
            </CardContent></Card>
          </>
        )}
      </div>

      {/* Commission Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base tracking-wide">STAFF COMMISSION</CardTitle>
            <MetricInfoTooltip description="Estimated commission for each stylist based on their assigned level rates." />
          </div>
          <CardDescription className="text-xs">Pay period: {payFrom} to {payTo}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Service Revenue</TableHead>
                <TableHead className="text-right">Product Revenue</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionRows.map(r => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(r.serviceRevenue)}</BlurredAmount></TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(r.productRevenue)}</BlurredAmount></TableCell>
                  <TableCell>{r.tier ? <Badge variant="outline" className="text-xs">{r.tier}</Badge> : <span className="text-xs text-muted-foreground">--</span>}</TableCell>
                  <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(Math.round(r.commission))}</BlurredAmount></TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(totalServiceRev)}</BlurredAmount></TableCell>
                <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrencyWhole(totalProductRev)}</BlurredAmount></TableCell>
                <TableCell />
                <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(Math.round(totalCommission))}</BlurredAmount></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
