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
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';

interface DeletedRow {
  date: string;
  clientName: string;
  serviceName: string;
  staffId: string;
  totalPrice: number;
  deletedAt: string;
  deletedBy: string | null;
}

function useDeletedAppointmentsReport(filters: { dateFrom: string; dateTo: string; locationId?: string }) {
  return useQuery({
    queryKey: ['deleted-appointments-report', filters],
    queryFn: async () => {
      const rows = await fetchAllBatched<{
        appointment_date: string;
        client_name: string | null;
        service_name: string | null;
        phorest_staff_id: string | null;
        total_price: number | null;
        deleted_at: string | null;
        deleted_by: string | null;
      }>((from, to) => {
        let q = supabase
          .from('v_all_appointments')
          .select('appointment_date, client_name, service_name, phorest_staff_id, total_price, deleted_at, deleted_by')
          .not('deleted_at', 'is', null)
          .gte('appointment_date', filters.dateFrom)
          .lte('appointment_date', filters.dateTo)
          .range(from, to);
        if (filters.locationId) q = q.eq('location_id', filters.locationId);
        return q;
      });

      let totalLostRevenue = 0;
      const entries: DeletedRow[] = rows.map(r => {
        const price = Number(r.total_price) || 0;
        totalLostRevenue += price;
        return {
          date: r.appointment_date,
          clientName: r.client_name || 'Unknown',
          serviceName: r.service_name || 'Unknown',
          staffId: r.phorest_staff_id || 'Unknown',
          totalPrice: price,
          deletedAt: r.deleted_at || '',
          deletedBy: r.deleted_by,
        };
      }).sort((a, b) => b.date.localeCompare(a.date));

      return { entries, totalLostRevenue, totalDeleted: entries.length };
    },
    staleTime: 2 * 60_000,
  });
}

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function DeletedAppointmentsReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useDeletedAppointmentsReport({ dateFrom, dateTo, locationId });
  const entries = data?.entries ?? [];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Deleted Appointments Report', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Date', 'Client', 'Service', 'Price', 'Deleted At']], body: entries.map(e => [e.date, e.clientName, e.serviceName, formatCurrencyWhole(e.totalPrice), e.deletedAt ? formatDate(new Date(e.deletedAt), 'MMM d, h:mm a') : '']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'deleted-appointments', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const csvRows = [['Date', 'Client', 'Service', 'Price', 'Deleted At', 'Deleted By'], ...entries.map(e => [e.date, e.clientName, e.serviceName, e.totalPrice.toFixed(2), e.deletedAt, e.deletedBy || ''])];
    const blob = new Blob([buildCsvString(csvRows)], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'deleted-appointments', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Deleted Appointments</CardTitle>
            {data && <p className="text-sm text-muted-foreground mt-1">{data.totalDeleted} deleted · Lost revenue: <BlurredAmount>{formatCurrencyWhole(data.totalLostRevenue)}</BlurredAmount></p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No deleted appointments in this period.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Client</TableHead>
              <TableHead className={tokens.table.columnHeader}>Service</TableHead>
              <TableHead className={tokens.table.columnHeader}>Price</TableHead>
              <TableHead className={tokens.table.columnHeader}>Deleted At</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{formatDate(new Date(e.date), 'MMM d')}</TableCell>
                  <TableCell className="font-medium">{e.clientName}</TableCell>
                  <TableCell>{e.serviceName}</TableCell>
                  <TableCell><BlurredAmount>{formatCurrencyWhole(e.totalPrice)}</BlurredAmount></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.deletedAt ? formatDate(new Date(e.deletedAt), 'MMM d, h:mm a') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
