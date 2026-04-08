import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useDuplicateClientsReport } from '@/hooks/useDuplicateClientsReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function DuplicateClientsReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: groups = [], isLoading } = useDuplicateClientsReport({ locationId });

  const totalDuplicates = groups.reduce((s, g) => s + g.clients.length, 0);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Duplicate Clients Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      const rows: string[][] = [];
      for (const g of groups) {
        for (const c of g.clients) {
          rows.push([g.matchType, g.matchValue, c.name, c.email || '', c.phone || '', formatCurrencyWhole(c.totalSpend), c.visitCount.toString()]);
        }
      }
      autoTable(doc, { ...branding, startY: y, head: [['Match Type', 'Match Value', 'Client', 'Email', 'Phone', 'Spend', 'Visits']], body: rows });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'duplicate-clients', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const csvRows: string[][] = [['Match Type', 'Match Value', 'Client', 'Email', 'Phone', 'Spend', 'Visits']];
    for (const g of groups) {
      for (const c of g.clients) {
        csvRows.push([g.matchType, g.matchValue, c.name, c.email || '', c.phone || '', c.totalSpend.toFixed(2), c.visitCount.toString()]);
      }
    }
    const blob = new Blob([buildCsvString(csvRows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'duplicate-clients.csv'; a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Duplicate Clients</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{groups.length} potential duplicate groups · {totalDuplicates} client records</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? <p className={tokens.empty.description}>No duplicate clients detected.</p> : (
          <div className="space-y-6">
            {groups.map((g, gi) => (
              <div key={gi} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">{g.matchType} match: {g.matchValue}</span>
                  <span className="text-xs text-muted-foreground">({g.clients.length} records)</span>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className={tokens.table.columnHeader}>Client</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Email</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Phone</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Spend</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Visits</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {g.clients.map((c, ci) => (
                      <TableRow key={ci}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone || '—'}</TableCell>
                        <TableCell><BlurredAmount>{formatCurrencyWhole(c.totalSpend)}</BlurredAmount></TableCell>
                        <TableCell>{c.visitCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
