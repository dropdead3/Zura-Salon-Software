import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Download, FileSpreadsheet, Loader2, ArrowLeft, Users } from 'lucide-react';
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
import { useRetailAnalytics } from '@/hooks/useRetailAnalytics';

interface RetailStaffReportProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
  dateRangeKey?: string;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export function RetailStaffReport({ dateFrom, dateTo, locationId, onClose }: RetailStaffReportProps) {
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
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Retail Sales by Staff', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      // Summary
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`Total Revenue: ${formatCurrencyWhole(data.summary.totalRevenue)}  |  Units: ${data.summary.totalUnits}  |  Attachment Rate: ${data.summary.attachmentRate}%  |  Staff: ${data.staffRetail.length}`, 14, y);
      y += 8;

      // Staff table
      autoTable(doc, {
        ...branding, startY: y,
        head: [['#', 'Stylist', 'Product Revenue', 'Units Sold', 'Attachment Rate', 'Avg Ticket']],
        body: data.staffRetail.map((s, idx) => [
          (idx + 1).toString(),
          s.name,
          formatCurrencyWhole(s.productRevenue),
          s.unitsSold.toString(),
          `${s.attachmentRate}%`,
          formatCurrencyWhole(s.avgTicket),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51] },
        margin: { ...branding.margin, left: 14, right: 14 },
      });

      addReportFooter(doc);
      doc.save(buildReportFileName({ orgName: headerOpts.orgName, locationName: locationInfo?.name, reportSlug: 'retail-by-staff', dateFrom, dateTo }));

      if (user) {
        await supabase.from('report_history').insert({
          report_type: 'retail-staff', report_name: 'Retail Sales by Staff',
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
    let csv = 'Rank,Stylist,Product Revenue,Units Sold,Attachment Rate,Avg Ticket\n';
    data.staffRetail.forEach((s, idx) => {
      csv += `${idx + 1},"${s.name}",${s.productRevenue},${s.unitsSold},${s.attachmentRate}%,${s.avgTicket}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `retail-by-staff-${dateFrom}-to-${dateTo}.csv`; link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-64" /></CardContent></Card>;
  }

  if (!data) return null;

  const staffSorted = [...data.staffRetail].sort((a, b) => b.productRevenue - a.productRevenue);

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
          <p className="text-[11px] text-muted-foreground font-display uppercase tracking-wider mb-1">Team Members</p>
          <p className="text-xl font-display tabular-nums">{data.staffRetail.length}</p>
        </CardContent></Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base tracking-wide">RETAIL SALES BY STAFF</CardTitle>
            <MetricInfoTooltip description="Per-stylist retail sales metrics ranked by product revenue. Attachment rate is the percentage of each stylist's service transactions that included a product sale." />
          </div>
          <CardDescription className="text-xs">{formatDate(new Date(dateFrom), 'MMM d, yyyy')} – {formatDate(new Date(dateTo), 'MMM d, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Stylist</TableHead>
                <TableHead className="text-right">Product Revenue</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">Attachment Rate</TableHead>
                <TableHead className="text-right">Avg Ticket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No staff retail data in this period
                  </TableCell>
                </TableRow>
              ) : (
                staffSorted.map((s, idx) => {
                  const isTop = idx === 0;
                  return (
                    <TableRow key={s.userId || s.name} className={cn(isTop && 'bg-chart-2/[0.03]')}>
                      <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7">
                            {s.photoUrl && <AvatarImage src={s.photoUrl} alt={s.name} />}
                            <AvatarFallback className="text-[10px]">{getInitials(s.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{s.name}</span>
                          {isTop && <span className="text-[9px] text-chart-2 font-medium font-display uppercase tracking-wider">Top</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium"><BlurredAmount>{formatCurrencyWhole(s.productRevenue)}</BlurredAmount></TableCell>
                      <TableCell className="text-right tabular-nums">{s.unitsSold}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.attachmentRate}%</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground"><BlurredAmount>{formatCurrencyWhole(s.avgTicket)}</BlurredAmount></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {staffSorted.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell />
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-right font-display tabular-nums"><BlurredAmount>{formatCurrencyWhole(data.summary.totalRevenue)}</BlurredAmount></TableCell>
                  <TableCell className="text-right font-display tabular-nums">{data.summary.totalUnits}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.summary.attachmentRate}%</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
