import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useAppointmentProfitSummary } from '@/hooks/color-bar/useAppointmentProfit';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  onClose: () => void;
}

export function ServiceProfitabilityReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatNumber } = useFormatNumber();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: summary, isLoading } = useAppointmentProfitSummary(dateFrom, dateTo, locationId);

  const rankings = summary?.serviceRankings ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Service Profitability Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);

      autoTable(doc, {
        ...branding,
        startY: y,
        head: [['Service', 'Revenue', 'Chemical Cost', 'Contribution Margin', 'Margin %']],
        body: rankings.map(r => [
          r.serviceName,
          formatNumber(r.revenue, 'currency'),
          formatNumber(r.chemicalCost ?? 0, 'currency'),
          formatNumber(r.contributionMargin ?? r.revenue, 'currency'),
          `${((r.marginPercent ?? 100)).toFixed(1)}%`,
        ]),
      });

      addReportFooter(doc);
      doc.save(buildReportFileName('service-profitability', dateFrom, dateTo));
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = () => {
    const rows = [
      ['Service', 'Revenue', 'Chemical Cost', 'Contribution Margin', 'Margin %'],
      ...rankings.map(r => [
        r.serviceName,
        (r.revenue).toFixed(2),
        (r.chemicalCost ?? 0).toFixed(2),
        (r.contributionMargin ?? r.revenue).toFixed(2),
        (r.marginPercent ?? 100).toFixed(1),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildReportFileName('service-profitability', dateFrom, dateTo, 'csv');
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground" onClick={onClose}>
        <ArrowLeft className="w-4 h-4 mr-1.5" />Back to Reports
      </Button>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={tokens.card.title}>Service Profitability</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
            <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <p className={tokens.empty.description}>No profitability data for this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Revenue</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Chemical Cost</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Margin</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.serviceName}</TableCell>
                    <TableCell>{formatNumber(r.revenue, 'currency')}</TableCell>
                    <TableCell>{formatNumber(r.chemicalCost ?? 0, 'currency')}</TableCell>
                    <TableCell>{formatNumber(r.contributionMargin ?? r.revenue, 'currency')}</TableCell>
                    <TableCell>{(r.marginPercent ?? 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
