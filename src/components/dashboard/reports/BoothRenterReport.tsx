import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useBoothRenterReport } from '@/hooks/reports/useBoothRenterReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function BoothRenterReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: entries = [], isLoading } = useBoothRenterReport();

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('l');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const today = format(new Date(), 'yyyy-MM-dd');
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Booth Renter Summary', dateFrom: 'Current Snapshot', dateTo: today, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Business Name', 'Status', 'Start Date', 'Insurance', 'Insurance Expiry', 'Provider']], body: entries.map(e => [e.staffName, e.businessName || '—', e.status, e.startDate || '—', e.insuranceVerified ? 'Verified' : 'Unverified', e.insuranceExpiry || '—', e.insuranceProvider || '—']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'booth-renter', dateFrom: today, dateTo: today }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Business Name', 'Status', 'Start Date', 'Insurance', 'Insurance Expiry', 'Provider'], ...entries.map(e => [e.staffName, e.businessName || '', e.status, e.startDate || '', e.insuranceVerified ? 'Verified' : 'Unverified', e.insuranceExpiry || '', e.insuranceProvider || ''])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const today = format(new Date(), 'yyyy-MM-dd');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'booth-renter', dateFrom: today, dateTo: today }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Booth Renter Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} booth renters</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No booth renters found.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Business Name</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
              <TableHead className={tokens.table.columnHeader}>Start Date</TableHead>
              <TableHead className={tokens.table.columnHeader}>Insurance</TableHead>
              <TableHead className={tokens.table.columnHeader}>Insurance Expiry</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>{e.businessName || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${e.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.startDate || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${e.insuranceVerified ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                      {e.insuranceVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.insuranceExpiry || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
