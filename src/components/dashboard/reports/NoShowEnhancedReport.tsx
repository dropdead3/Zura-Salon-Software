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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface NoShowEntry {
  clientName: string;
  clientId: string;
  noShowCount: number;
  cancelCount: number;
  totalLostRevenue: number;
  lastIncident: string;
  isRepeatOffender: boolean;
}

function useNoShowEnhancedReport(filters: { dateFrom: string; dateTo: string; locationId?: string }) {
  return useQuery({
    queryKey: ['no-show-enhanced-report', filters],
    queryFn: async () => {
      const rows = await fetchAllBatched<{
        phorest_client_id: string | null;
        client_name: string | null;
        status: string | null;
        total_price: number | null;
        appointment_date: string;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('phorest_client_id, client_name, status, total_price, appointment_date')
          .gte('appointment_date', filters.dateFrom)
          .lte('appointment_date', filters.dateTo)
          .in('status', ['no_show', 'cancelled'])
          .range(from, to);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        return q;
      });

      const clientMap = new Map<string, { name: string; noShows: number; cancels: number; lostRevenue: number; lastDate: string }>();

      for (const row of rows) {
        const id = row.phorest_client_id || 'unknown';
        const entry = clientMap.get(id) || { name: row.client_name || 'Unknown', noShows: 0, cancels: 0, lostRevenue: 0, lastDate: '' };
        if (row.status === 'no_show') entry.noShows += 1;
        else entry.cancels += 1;
        entry.lostRevenue += Number(row.total_price) || 0;
        if (!entry.lastDate || row.appointment_date > entry.lastDate) entry.lastDate = row.appointment_date;
        clientMap.set(id, entry);
      }

      let totalLostRevenue = 0;
      let totalNoShows = 0;
      let totalCancellations = 0;

      const entries: NoShowEntry[] = Array.from(clientMap.entries())
        .map(([id, v]) => {
          totalNoShows += v.noShows;
          totalCancellations += v.cancels;
          totalLostRevenue += v.lostRevenue;
          return {
            clientName: v.name,
            clientId: id,
            noShowCount: v.noShows,
            cancelCount: v.cancels,
            totalLostRevenue: v.lostRevenue,
            lastIncident: v.lastDate,
            isRepeatOffender: (v.noShows + v.cancels) >= 3,
          };
        })
        .sort((a, b) => (b.noShowCount + b.cancelCount) - (a.noShowCount + a.cancelCount));

      return { entries, totalLostRevenue, totalNoShows, totalCancellations, repeatOffenders: entries.filter(e => e.isRepeatOffender).length };
    },
    staleTime: 2 * 60_000,
  });
}

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; dateRangeKey?: string; }

export function NoShowEnhancedReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useNoShowEnhancedReport({ dateFrom, dateTo, locationId });
  const entries = data?.entries ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'No-Shows & Cancellations (Enhanced)', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Client', 'No-Shows', 'Cancellations', 'Lost Revenue', 'Last Incident', 'Repeat?']], body: entries.map(e => [e.clientName, e.noShowCount.toString(), e.cancelCount.toString(), formatCurrencyWhole(e.totalLostRevenue), e.lastIncident, e.isRepeatOffender ? 'YES' : '']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'no-show-enhanced', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const csvRows = [['Client', 'No-Shows', 'Cancellations', 'Lost Revenue', 'Last Incident', 'Repeat Offender'], ...entries.map(e => [e.clientName, e.noShowCount.toString(), e.cancelCount.toString(), e.totalLostRevenue.toFixed(2), e.lastIncident, e.isRepeatOffender ? 'Yes' : 'No'])];
    const blob = new Blob([buildCsvString(csvRows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'no-show-enhanced', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>No-Shows & Cancellations</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">{data.totalNoShows} no-shows · {data.totalCancellations} cancellations · Lost: <BlurredAmount>{formatCurrencyWhole(data.totalLostRevenue)}</BlurredAmount> · {data.repeatOffenders} repeat offenders</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No no-shows or cancellations in this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={tokens.table.columnHeader}>No-Shows</TableHead>
              <TableHead className={tokens.table.columnHeader}>Cancellations</TableHead>
              <TableHead className={tokens.table.columnHeader}>Lost Revenue</TableHead>
              <TableHead className={tokens.table.columnHeader}>Last Incident</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.clientName}</TableCell>
                  <TableCell>{e.noShowCount}</TableCell>
                  <TableCell>{e.cancelCount}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalLostRevenue)}</BlurredAmount></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.lastIncident}</TableCell>
                  <TableCell>
                    {e.isRepeatOffender && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> Repeat
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
