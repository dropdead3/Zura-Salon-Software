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
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface ClientSourceEntry {
  source: string;
  clientCount: number;
  totalSpend: number;
  avgSpend: number;
}

function useClientSourceReport(filters: { locationId?: string }) {
  return useQuery({
    queryKey: ['client-source-report', filters],
    queryFn: async () => {
      let q = supabase
        .from('phorest_clients')
        .select('lead_source, total_spend')
        .eq('is_archived', false);
      if (filters.locationId) q = q.eq('location_id', filters.locationId);

      const { data, error } = await q.limit(5000);
      if (error) throw error;

      const sourceMap = new Map<string, { count: number; spend: number }>();
      for (const c of data || []) {
        const source = c.lead_source || 'Unknown';
        const entry = sourceMap.get(source) || { count: 0, spend: 0 };
        entry.count += 1;
        entry.spend += Number(c.total_spend) || 0;
        sourceMap.set(source, entry);
      }

      const entries: ClientSourceEntry[] = Array.from(sourceMap.entries())
        .map(([source, v]) => ({
          source,
          clientCount: v.count,
          totalSpend: v.spend,
          avgSpend: v.count > 0 ? v.spend / v.count : 0,
        }))
        .sort((a, b) => b.clientCount - a.clientCount);

      const totalClients = entries.reduce((s, e) => s + e.clientCount, 0);
      return { entries, totalClients };
    },
    staleTime: 5 * 60_000,
  });
}

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function ClientSourceReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useClientSourceReport({ locationId });
  const entries = data?.entries ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Client Source Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Source', 'Clients', 'Total Spend', 'Avg Spend']], body: entries.map(e => [e.source, e.clientCount.toString(), formatCurrencyWhole(e.totalSpend), formatCurrencyWhole(Math.round(e.avgSpend))]) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'client-source', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Source', 'Clients', 'Total Spend', 'Avg Spend'], ...entries.map(e => [e.source, e.clientCount.toString(), e.totalSpend.toFixed(2), e.avgSpend.toFixed(2)])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'client-source.csv'; a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Client Source</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">{data.totalClients} total clients across {entries.length} sources</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No client source data available.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Source</TableHead>
              <TableHead className={tokens.table.columnHeader}>Clients</TableHead>
              <TableHead className={tokens.table.columnHeader}>Total Spend</TableHead>
              <TableHead className={tokens.table.columnHeader}>Avg Spend</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.source}</TableCell>
                  <TableCell>{e.clientCount}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalSpend)}</BlurredAmount></TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(Math.round(e.avgSpend))}</BlurredAmount></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
